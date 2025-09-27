import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { currentUser } from '@clerk/nextjs/server'

// Use a global singleton to avoid creating many clients in development/hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'projects.json')

async function readFallbackProjects(): Promise<any[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    // ensure requiredSkills is an array for all items
    return (parsed || []).map((p: any) => ({
      ...p,
      requiredSkills: Array.isArray(p.requiredSkills)
        ? p.requiredSkills
        : typeof p.requiredSkills === 'string'
        ? p.requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    }))
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(DATA_FILE, '[]', 'utf-8')
      return []
    }
    throw err
  }
}

async function writeFallbackProjects(items: any[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8')
}

function applyFiltersToArray(items: any[], params: URLSearchParams) {
  const q = params.get('q') || undefined
  const category = params.get('category') || undefined
  const difficulty = params.get('difficulty') || undefined
  const status = params.get('status') || undefined
  const maxDuration = params.get('maxDuration') ? Number(params.get('maxDuration')) : null

  return items.filter((p) => {
    if (q) {
      const qLower = q.toLowerCase()
      const skillMatches = Array.isArray(p.requiredSkills) && p.requiredSkills.some((s: string) => s.toLowerCase().includes(qLower))
      const titleMatch = String(p.title || '').toLowerCase().includes(qLower)
      const shortMatch = String(p.shortDescription || '').toLowerCase().includes(qLower)
      if (!(skillMatches || titleMatch || shortMatch)) return false
    }
    if (category && category !== 'All' && p.category !== category) return false
    if (difficulty && difficulty !== 'All' && p.difficulty !== difficulty) return false
    if (status && status !== 'All' && p.status !== status) return false
    if (maxDuration !== null && typeof p.durationWeeks === 'number' && p.durationWeeks > maxDuration) return false
    return true
  })
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const params = url.searchParams

    // Use Prisma when available and has the Project model
    const hasProjectModel = Boolean((client as any).project && typeof (client as any).project.findMany === 'function')
    if (hasProjectModel) {
      const search = params.get('q') || undefined
      const category = params.get('category') || undefined
      const difficulty = params.get('difficulty') || undefined
      const status = params.get('status') || undefined
      const maxDuration = params.get('maxDuration') ? Number(params.get('maxDuration')) : null

      const where: any = {}
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
          { requiredSkills: { hasSome: search.split(',').map((s) => s.trim()) } },
        ]
      }
      if (category && category !== 'All') where.category = category
      if (difficulty && difficulty !== 'All') where.difficulty = difficulty
      if (status && status !== 'All') where.status = status
      if (maxDuration !== null) where.durationWeeks = { lte: maxDuration }

      // include relations so frontend can render creator and collaborators
      const projects = await (client as any).project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: true,
          members: { include: { user: true } },
        },
      })

      // map to a stable shape consumed by the UI
      const mapped = projects.map((p: any) => ({
        id: p.id,
        title: p.title,
        shortDescription: p.shortDescription,
        description: p.description,
        category: p.category,
        difficulty: p.difficulty,
        durationWeeks: p.durationWeeks,
        status: p.status,
        requiredSkills: Array.isArray(p.requiredSkills)
          ? p.requiredSkills
          : typeof p.requiredSkills === 'string'
          ? p.requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        attachments: p.attachments || [],
        bannerUrl: p.bannerUrl || null,
        featured: Boolean(p.featured),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        creator: p.creator
          ? {
              id: p.creator.id,
              name: [p.creator.firstName, p.creator.lastName].filter(Boolean).join(' ') || p.creator.email || 'User',
              avatar: p.creator.imageUrl || undefined,
            }
          : { id: null, name: 'Unknown', avatar: undefined },
        collaborators: Array.isArray(p.members)
          ? p.members.map((m: any) => ({
              id: m.user?.id || m.userId,
              name: m.user ? ([m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email) : 'Member',
              avatar: m.user?.imageUrl || undefined,
              role: m.role || undefined,
            }))
          : [],
      }))

      return NextResponse.json(mapped)
    }

    // Fallback to file-backed storage in `data/projects.json` when Prisma isn't ready
    const items = await readFallbackProjects()
    const filtered = applyFiltersToArray(items, params)
    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Failed to fetch projects (API):', (error as any)?.message || error)
    // Safe fallback: return empty list so frontend remains stable
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      title,
      shortDescription,
      description,
      category,
      requiredSkills,
      difficulty,
      teamSize,
      status,
      durationWeeks,
      creatorId,
      attachments,
      bannerUrl,
    } = body

    if (!title || !shortDescription || !description || !category || !difficulty || !creatorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // normalize requiredSkills to array
    const normalizedSkills = Array.isArray(requiredSkills)
      ? requiredSkills.map((s: any) => String(s).trim()).filter(Boolean)
      : typeof requiredSkills === 'string'
      ? requiredSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : []

    const hasProjectCreate = Boolean((client as any).project && typeof (client as any).project.create === 'function')
    if (hasProjectCreate) {
      // Ensure the creator User exists in DB. The User model requires an email, so create a minimal record if missing.
      try {
        if ((client as any).user && typeof (client as any).user.upsert === 'function') {
          const minimalEmail = `${creatorId}@local.invalid`
          await (client as any).user.upsert({
            where: { id: creatorId },
            update: {},
            create: { id: creatorId, email: minimalEmail },
          })
        }
      } catch (err) {
        // ignore user upsert errors; proceed to project creation which may fail and be handled below
      }
      const project = await (client as any).project.create({
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
          attachments,
          bannerUrl,
        },
      })

      // try to add the creator as a ProjectMember (owner) if possible; ignore errors
      try {
        if ((client as any).projectMember && typeof (client as any).projectMember.create === 'function') {
          await (client as any).projectMember.create({ data: { userId: creatorId, projectId: project.id, role: 'Owner' } })
        }
      } catch (err) {
        // ignore membership creation failures (user may not exist in DB yet)
      }

      // re-fetch project with relations to return a consistent shape
      const p = await (client as any).project.findUnique({ where: { id: project.id }, include: { creator: true, members: { include: { user: true } } } })
      const mapped = p
        ? {
            id: p.id,
            title: p.title,
            shortDescription: p.shortDescription,
            description: p.description,
            category: p.category,
            difficulty: p.difficulty,
            durationWeeks: p.durationWeeks,
            status: p.status,
            requiredSkills: p.requiredSkills || [],
            attachments: p.attachments || [],
            bannerUrl: p.bannerUrl || null,
            featured: Boolean(p.featured),
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            creator: p.creator
              ? { id: p.creator.id, name: [p.creator.firstName, p.creator.lastName].filter(Boolean).join(' ') || p.creator.email, avatar: p.creator.imageUrl || undefined }
              : { id: null, name: 'Unknown', avatar: undefined },
            collaborators: Array.isArray(p.members)
              ? p.members.map((m: any) => ({ id: m.user?.id || m.userId, name: m.user ? ([m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email) : 'Member', avatar: m.user?.imageUrl || undefined, role: m.role || undefined }))
              : [],
          }
        : project

      return NextResponse.json(mapped, { status: 201 })
    }

    // Fallback: persist to local JSON file
    const items = await readFallbackProjects()
    const newItem = {
      id: typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `local-${Date.now()}`,
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
      attachments: attachments || [],
      bannerUrl: bannerUrl || null,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.unshift(newItem)
    await writeFallbackProjects(items)
    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Failed to create project (API):', (error as any)?.message || error)
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
        const body = await req.json()
        projectId = body?.id
      } catch (e) {
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

    const hasProjectModel = Boolean((client as any).project && typeof (client as any).project.findUnique === 'function')
    if (hasProjectModel) {
      const existing = await (client as any).project.findUnique({ where: { id: projectId } })
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (existing.creatorId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      // remove members first (best-effort) then project
      try {
        if ((client as any).projectMember && typeof (client as any).projectMember.deleteMany === 'function') {
          await (client as any).projectMember.deleteMany({ where: { projectId } })
        }
      } catch (err) {
        // ignore member deletion errors
      }

      await (client as any).project.delete({ where: { id: projectId } })
      return NextResponse.json({ success: true })
    }

    // fallback file storage
    const items = await readFallbackProjects()
    const found = items.find((i) => i.id === projectId)
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // ensure only creator can delete
    if (found.creator && String(found.creator.id) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const filtered = items.filter((i) => i.id !== projectId)
    await writeFallbackProjects(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete project (API):', (error as any)?.message || error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
