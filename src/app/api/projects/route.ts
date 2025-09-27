import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { currentUser } from '@clerk/nextjs/server'

// Use a global singleton to avoid creating many clients in development/hot-reload
declare global {
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'projects.json')

type PrismaMethod = (...args: unknown[]) => Promise<unknown> | unknown
function isFn(v: unknown): v is PrismaMethod {
  return typeof v === 'function'
}

async function readFallbackProjects(): Promise<unknown[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    // ensure requiredSkills is an array for all items
    return (parsed || []).map((p: unknown) => {
      const item = p as Record<string, unknown>
      const requiredSkills = Array.isArray(item.requiredSkills)
        ? item.requiredSkills
        : typeof item.requiredSkills === 'string'
        ? (item.requiredSkills as string).split(',').map((s) => s.trim()).filter(Boolean)
        : []
      return { ...(item || {}), requiredSkills }
    })
  } catch (err: unknown) {
    // Avoid using `any` cast for err
    if ((err as { code?: unknown })?.code === 'ENOENT') {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(DATA_FILE, '[]', 'utf-8')
      return []
    }
    throw err
  }
}

async function writeFallbackProjects(items: unknown[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8')
}

function applyFiltersToArray(items: unknown[], params: URLSearchParams) {
  const q = params.get('q') || undefined
  const category = params.get('category') || undefined
  const difficulty = params.get('difficulty') || undefined
  const status = params.get('status') || undefined
  const maxDuration = params.get('maxDuration') ? Number(params.get('maxDuration')) : null

  return (items as Record<string, unknown>[]).filter((p) => {
    if (q) {
      const qLower = q.toLowerCase()
      const skillMatches = Array.isArray(p.requiredSkills) && (p.requiredSkills as string[]).some((s) => String(s).toLowerCase().includes(qLower))
      const titleMatch = String(p.title || '').toLowerCase().includes(qLower)
      const shortMatch = String(p.shortDescription || '').toLowerCase().includes(qLower)
      if (!(skillMatches || titleMatch || shortMatch)) return false
    }
    if (category && category !== 'All' && p.category !== category) return false
    if (difficulty && difficulty !== 'All' && p.difficulty !== difficulty) return false
    if (status && status !== 'All' && p.status !== status) return false
    if (maxDuration !== null && typeof p.durationWeeks === 'number' && (p.durationWeeks as number) > maxDuration) return false
    return true
  })
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const params = url.searchParams

    // Use Prisma when available and has the Project model
    const projectClient = (client as unknown as { project?: { findMany?: PrismaMethod } }).project
    // If Prisma Project model/methods are not available, fall back to file storage
    if (!projectClient || !isFn(projectClient.findMany)) {
      const items = await readFallbackProjects()
      const filtered = applyFiltersToArray(items, params)
      return NextResponse.json(filtered)
    }

    // Safe to use projectClient.findMany
    const search = params.get('q') || undefined
    const category = params.get('category') || undefined
    const difficulty = params.get('difficulty') || undefined
    const status = params.get('status') || undefined
    const maxDuration = params.get('maxDuration') ? Number(params.get('maxDuration')) : null

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { requiredSkills: { hasSome: (search as string).split(',').map((s) => s.trim()) } },
      ]
    }
    if (category && category !== 'All') where.category = category
    if (difficulty && difficulty !== 'All') where.difficulty = difficulty
    if (status && status !== 'All') where.status = status
    if (maxDuration !== null) where.durationWeeks = { lte: maxDuration }

    // include relations so frontend can render creator and collaborators
    const projects = await (projectClient.findMany as PrismaMethod)({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: true,
        members: { include: { user: true } },
      },
    })

    // map to a stable shape consumed by the UI
    const mapped = (projects as unknown[]).map((p: unknown) => {
      const item = p as Record<string, unknown>
      return {
        id: item.id,
        title: item.title,
        shortDescription: item.shortDescription,
        description: item.description,
        category: item.category,
        difficulty: item.difficulty,
        durationWeeks: item.durationWeeks,
        status: item.status,
        requiredSkills: Array.isArray(item.requiredSkills)
          ? item.requiredSkills
          : typeof item.requiredSkills === 'string'
          ? (item.requiredSkills as string).split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        attachments: item.attachments || [],
        bannerUrl: item.bannerUrl || null,
        featured: Boolean(item.featured),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        creator: item.creator
          ? {
              id: (item.creator as Record<string, unknown>).id,
              name: [ (item.creator as Record<string, unknown>).firstName, (item.creator as Record<string, unknown>).lastName ].filter(Boolean).join(' ') || (item.creator as Record<string, unknown>).email || 'User',
              avatar: (item.creator as Record<string, unknown>).imageUrl || undefined,
            }
          : { id: null, name: 'Unknown', avatar: undefined },
        collaborators: Array.isArray(item.members)
          ? (item.members as unknown[]).map((m) => {
              const member = m as Record<string, unknown>
              const user = member.user as Record<string, unknown> | undefined
              return {
                id: user?.id || member.userId,
                name: member.fullName || (user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.email) : 'Member'),
                avatar: user?.imageUrl || undefined,
                role: member.role || member.preferredRole || undefined,
                // application/profile fields (if created via ProjectMember)
                application: {
                  fullName: member.fullName || null,
                  contactInfo: member.contactInfo || null,
                  portfolioUrl: member.portfolioUrl || user?.portfolioUrl || null,
                  skills: Array.isArray(member.skills) ? member.skills : typeof member.skills === 'string' ? (member.skills as string).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                  preferredRole: member.preferredRole || null,
                  availability: member.availability || null,
                  motivation: member.motivation || null,
                  agreedToGuidelines: Boolean(member.agreedToGuidelines),
                  // approval workflow
                  status: member.status || null,
                  acceptedAt: member.acceptedAt || null,
                }
              }
            })
          : [],
      }
    })

    return NextResponse.json(mapped)
  } catch (error: unknown) {
    const msg = (error as { message?: unknown })?.message ?? String(error)
    console.error('Failed to fetch projects (API):', msg)
    // Safe fallback: return empty list so frontend remains stable
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const title = body.title as string | undefined
    const shortDescription = body.shortDescription as string | undefined
    const description = body.description as string | undefined
    const category = body.category as string | undefined
    const requiredSkills = body.requiredSkills as unknown
    const difficulty = body.difficulty as string | undefined
    const teamSize = body.teamSize as number | undefined
    const status = body.status as string | undefined
    const durationWeeks = body.durationWeeks as number | undefined
    const creatorId = body.creatorId as string | undefined
    const attachments = body.attachments as unknown
    const bannerUrl = body.bannerUrl as string | undefined

    if (!title || !shortDescription || !description || !category || !difficulty || !creatorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // normalize requiredSkills to array
    const normalizedSkills = Array.isArray(requiredSkills)
      ? (requiredSkills as unknown[]).map((s) => String(s).trim()).filter(Boolean)
      : typeof requiredSkills === 'string'
      ? (requiredSkills as string).split(',').map((s) => s.trim()).filter(Boolean)
      : []

    const projectClient = (client as unknown as { project?: { create?: PrismaMethod } }).project
    const hasProjectCreate = Boolean(projectClient && isFn(projectClient.create))
    if (hasProjectCreate) {
      // Narrow to a safer shape for subsequent calls
      const projectClientSafe = projectClient as { create: PrismaMethod; findUnique?: PrismaMethod }
      // Ensure the creator User exists in DB. The User model requires an email, so create a minimal record if missing.
      try {
        const userClient = (client as unknown as { user?: { upsert?: PrismaMethod } }).user
        if (userClient && isFn(userClient.upsert)) {
          const minimalEmail = `${creatorId}@local.invalid`
          await (userClient.upsert as PrismaMethod)({
            where: { id: creatorId },
            update: {},
            create: { id: creatorId, email: minimalEmail },
          })
        }
      } catch {
        // ignore user upsert errors; proceed to project creation which may fail and be handled below
      }
      const project = await (projectClientSafe.create as PrismaMethod)({
        data: {
          title,
          shortDescription,
          description,
          category,
          requiredSkills: normalizedSkills,
          difficulty,
          teamSize,
          status,
          durationWeeks,
          creatorId,
          attachments: (Array.isArray(attachments) ? attachments : []),
          bannerUrl,
        },
      })

      // try to add the creator as a ProjectMember (owner) if possible; ignore errors
      try {
        const pmClient = (client as unknown as { projectMember?: { create?: PrismaMethod } }).projectMember
        if (pmClient && isFn(pmClient.create)) {
          const pid = (project as Record<string, unknown>).id as string | undefined
          if (pid) {
            await (pmClient.create as PrismaMethod)({ data: { userId: creatorId, projectId: pid, role: 'Owner' } })
          }
        }
      } catch {
        // ignore membership creation failures (user may not exist in DB yet)
      }

      // re-fetch project with relations to return a consistent shape
      let p: unknown = project
      if (isFn(projectClientSafe.findUnique)) {
        const projectId = (project as Record<string, unknown>).id as string | undefined
        if (projectId) {
          p = await (projectClientSafe.findUnique as PrismaMethod)({ where: { id: projectId }, include: { creator: true, members: { include: { user: true } } } })
        }
      }
      const mapped = p
        ? (() => {
            const item = p as Record<string, unknown>
            return {
              id: item.id,
              title: item.title,
              shortDescription: item.shortDescription,
              description: item.description,
              category: item.category,
              difficulty: item.difficulty,
              durationWeeks: item.durationWeeks,
              status: item.status,
              requiredSkills: item.requiredSkills || [],
              attachments: item.attachments || [],
              bannerUrl: item.bannerUrl || null,
              featured: Boolean(item.featured),
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              creator: item.creator
                ? { id: (item.creator as Record<string, unknown>).id, name: [ (item.creator as Record<string, unknown>).firstName, (item.creator as Record<string, unknown>).lastName ].filter(Boolean).join(' ') || (item.creator as Record<string, unknown>).email, avatar: (item.creator as Record<string, unknown>).imageUrl || undefined }
                : { id: null, name: 'Unknown', avatar: undefined },
              collaborators: Array.isArray(item.members)
                ? (item.members as unknown[]).map((m) => {
                    const member = m as Record<string, unknown>
                    const user = member.user as Record<string, unknown> | undefined
                    return { id: user?.id || member.userId, name: user ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.email) : 'Member', avatar: user?.imageUrl || undefined, role: member.role || undefined }
                  })
                : [],
            }
          })()
        : project

      return NextResponse.json(mapped, { status: 201 })
    }

    // Fallback: persist to local JSON file
    const items = await readFallbackProjects()

    // generate a stable id without using `any`
    const hasRandomUUID = typeof globalThis !== 'undefined' && typeof (globalThis.crypto as { randomUUID?: unknown })?.randomUUID === 'function'
    const newId = hasRandomUUID ? (globalThis.crypto as { randomUUID: () => string }).randomUUID() : `local-${Date.now()}`

    const newItem = {
      id: newId,
      title,
      shortDescription,
      description,
      category,
      requiredSkills: normalizedSkills,
      difficulty,
      teamSize: teamSize ?? null,
      status,
      durationWeeks: durationWeeks ?? null,
      creator: { id: creatorId, name: 'Local User' },
      collaborators: [],
      attachments: (Array.isArray(attachments) ? attachments : []),
      bannerUrl: bannerUrl || null,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.unshift(newItem)
    await writeFallbackProjects(items)
    return NextResponse.json(newItem, { status: 201 })
  } catch (error: unknown) {
    const msg = (error as { message?: unknown })?.message ?? String(error)
    console.error('Failed to create project (API):', msg)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const params = url.searchParams
    let projectId = params.get('id') || undefined

    // allow id in JSON body as fallback
    if (!projectId) {
      try {
        const body = (await req.json()) as Record<string, unknown>
        projectId = body?.id as string | undefined
      } catch {
        // ignore
      }
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project id required' }, { status: 400 })
    }

    // authenticate caller
    const user = await currentUser()
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectClient = (client as unknown as { project?: { findUnique?: PrismaMethod; delete?: PrismaMethod } }).project
    const hasProjectModel = Boolean(projectClient && isFn(projectClient.findUnique))
    if (hasProjectModel) {
      const projectClientSafe = projectClient as { findUnique: PrismaMethod; delete?: PrismaMethod }
      const existing = await (projectClientSafe.findUnique as PrismaMethod)({ where: { id: projectId } }) as Record<string, unknown> | null
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if ((existing.creatorId as unknown) !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      // remove members first (best-effort) then project
      try {
        const pmClient = (client as unknown as { projectMember?: { deleteMany?: PrismaMethod } }).projectMember
        if (pmClient && isFn(pmClient.deleteMany)) {
          await (pmClient.deleteMany as PrismaMethod)({ where: { projectId } })
        }
      } catch {
        // ignore member deletion errors
      }

      if (isFn(projectClientSafe.delete)) {
        await (projectClientSafe.delete as PrismaMethod)({ where: { id: projectId } })
      }
      return NextResponse.json({ success: true })
    }

    // fallback file storage
    const items = await readFallbackProjects()
    const found = (items as Record<string, unknown>[]).find((i) => i.id === projectId)
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // ensure only creator can delete
    if (found.creator && String((found.creator as Record<string, unknown>).id) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const filtered = (items as Record<string, unknown>[]).filter((i) => i.id !== projectId)
    await writeFallbackProjects(filtered)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = (error as { message?: unknown })?.message ?? String(error)
    console.error('Failed to delete project (API):', msg)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
