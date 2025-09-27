import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { currentUser } from '@clerk/nextjs/server'

// Use global singleton
declare global {
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

// Explicit small function signatures for Prisma-like methods to avoid the `Function` type
type PrismaAsyncFn = (...args: unknown[]) => Promise<unknown>

type MaybePrismaProject = { findUnique?: PrismaAsyncFn }
type MaybePrismaUser = { upsert?: PrismaAsyncFn }
type MaybePrismaProjectMember = { upsert?: PrismaAsyncFn; findFirst?: PrismaAsyncFn; create?: PrismaAsyncFn }

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as Record<string, unknown>
    const projectId = (body.projectId as string) || undefined
    const fullName = (body.fullName as string) || undefined
    const contactInfo = (body.contactInfo as string) || undefined
    const portfolioUrl = (body.portfolioUrl as string) || undefined
    const skillsRaw = body.skills
    const preferredRole = (body.preferredRole as string) || undefined
    const availability = (body.availability as string) || undefined
    const motivation = (body.motivation as string) || undefined
    const agreedToGuidelines = Boolean(body.agreedToGuidelines)

    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    if (!agreedToGuidelines) return NextResponse.json({ error: 'You must agree to guidelines' }, { status: 400 })

    // ensure project exists
    const projectClient = (client as unknown as { project?: MaybePrismaProject }).project
    if (!projectClient || typeof projectClient.findUnique !== 'function') {
      return NextResponse.json({ error: 'Server not configured for projects' }, { status: 501 })
    }

    const project = await projectClient.findUnique!({ where: { id: projectId } } as unknown as Record<string, unknown>)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Ensure the Clerk user exists in our User table to satisfy FK when creating ProjectMember
    try {
      const userClient = (client as unknown as { user?: MaybePrismaUser }).user
      if (userClient && typeof userClient.upsert === 'function') {
        const u = user as unknown as Record<string, unknown>
        const primaryEmail = (u.primaryEmailAddress && (u.primaryEmailAddress as Record<string, unknown>)['emailAddress']) || (Array.isArray(u.emailAddresses) && (u.emailAddresses[0] as Record<string, unknown>)['emailAddress']) || (u.email as string) || `${user.id}@local.invalid`
        await userClient.upsert!({
          where: { id: user.id },
          update: {},
          create: { id: user.id, email: primaryEmail, firstName: (u.firstName as string) || undefined, lastName: (u.lastName as string) || undefined, imageUrl: (u.imageUrl as string) || undefined },
        } as unknown as Record<string, unknown>)
      }
    } catch (err) {
      // ignore upsert errors but log for debugging
      console.warn('User upsert before join failed:', (err as unknown instanceof Error ? (err as Error).message : String(err)))
    }

    // normalize skills
    const normSkills = Array.isArray(skillsRaw)
      ? (skillsRaw as unknown[]).map((s) => String(s)).map((s) => s.trim()).filter(Boolean)
      : typeof skillsRaw === 'string'
      ? skillsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []

    // attempt extended upsert (works if Prisma client matches updated schema)
    const pmClient = (client as unknown as { projectMember?: MaybePrismaProjectMember }).projectMember
    try {
      if (!pmClient || typeof pmClient.upsert !== 'function') {
        throw new Error('ProjectMember upsert not available')
      }

      const pm = await pmClient.upsert!({
        where: { userId_projectId: { userId: user.id, projectId } },
        update: {
          fullName: fullName || undefined,
          contactInfo: contactInfo || undefined,
          portfolioUrl: portfolioUrl || undefined,
          skills: normSkills,
          preferredRole: preferredRole || undefined,
          availability: availability || undefined,
          motivation: motivation || undefined,
          agreedToGuidelines: Boolean(agreedToGuidelines),
        },
        create: {
          userId: user.id,
          projectId,
          role: preferredRole || 'Contributor',
          fullName: fullName || undefined,
          contactInfo: contactInfo || undefined,
          portfolioUrl: portfolioUrl || undefined,
          skills: normSkills,
          preferredRole: preferredRole || undefined,
          availability: availability || undefined,
          motivation: motivation || undefined,
          agreedToGuidelines: Boolean(agreedToGuidelines),
        },
      } as unknown as Record<string, unknown>)

      return NextResponse.json({ success: true, applicationSaved: true, member: pm })
    } catch (err) {
      const msg = (err as unknown instanceof Error ? (err as Error).message : String(err))
      console.warn('Join API extended upsert failed, falling back to minimal member create:', msg)

      // fallback: create or update minimal ProjectMember record with fields supported by current client
      try {
        if (!pmClient || typeof pmClient.findFirst !== 'function') {
          // try basic create if possible
          const simpleCreate = (client as unknown as { projectMember?: { create?: PrismaAsyncFn } }).projectMember?.create
          if (typeof simpleCreate !== 'function') {
            throw new Error('ProjectMember operations not supported')
          }
          // check for existing
          const simpleFindFirst = (client as unknown as { projectMember?: { findFirst?: PrismaAsyncFn } }).projectMember?.findFirst
          const existing = typeof simpleFindFirst === 'function' ? await simpleFindFirst({ where: { userId: user.id, projectId } } as unknown as Record<string, unknown>) : null
          if (existing) {
            return NextResponse.json({ success: true, applicationSaved: false, member: existing, message: 'Application stored in minimal membership. Run prisma migrate and regenerate client to enable application fields.' })
          }
          const created = await simpleCreate({ data: { userId: user.id, projectId, role: preferredRole || 'Contributor' } } as unknown as Record<string, unknown>)
          return NextResponse.json({ success: true, applicationSaved: false, member: created, message: 'Application stored in minimal membership. Run prisma migrate and regenerate client to enable application fields.' })
        }

        // If findFirst exists, use it
        const findFirstFn = typeof pmClient.findFirst === 'function' ? (pmClient.findFirst as PrismaAsyncFn) : undefined
        const existing = findFirstFn ? await findFirstFn({ where: { userId: user.id, projectId } } as unknown as Record<string, unknown>) : null
        if (existing) {
          return NextResponse.json({ success: true, applicationSaved: false, member: existing, message: 'Application stored in minimal membership. Run prisma migrate and regenerate client to enable application fields.' })
        }

        if (typeof pmClient.create !== 'function') throw new Error('create not supported')
        const created = await (pmClient.create as PrismaAsyncFn)({ data: { userId: user.id, projectId, role: preferredRole || 'Contributor' } } as unknown as Record<string, unknown>)
        return NextResponse.json({ success: true, applicationSaved: false, member: created, message: 'Application stored in minimal membership. Run prisma migrate and regenerate client to enable application fields.' })
      } catch (innerErr) {
        console.error('Join API fallback failed', (innerErr as unknown instanceof Error ? (innerErr as Error).message : String(innerErr)))
        return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
      }
    }
  } catch (err) {
    console.error('Join API error', (err as unknown instanceof Error ? (err as Error).message : String(err)))
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}
