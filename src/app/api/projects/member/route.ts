import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { currentUser } from '@clerk/nextjs/server'

// Global singleton for Prisma
declare global {
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

// Safe helper type for optional Prisma methods
type PrismaMethod = (...args: unknown[]) => Promise<unknown> | unknown
function isFn(v: unknown): v is PrismaMethod {
  return typeof v === 'function'
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const params = url.searchParams
    let projectId = params.get('projectId') || undefined
    let memberId = params.get('userId') || params.get('memberId') || undefined

    // allow JSON body as fallback
    if (!projectId || !memberId) {
      try {
        const body = (await req.json()) as Record<string, unknown>
        projectId = projectId || (body?.projectId as string | undefined)
        memberId = memberId || (body?.userId as string | undefined) || (body?.memberId as string | undefined)
      } catch {
        // ignore
      }
    }

    if (!projectId || !memberId) {
      return NextResponse.json({ error: 'projectId and userId (member) required' }, { status: 400 })
    }

    const user = await currentUser()
    if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hasProjectMember = Boolean((client as unknown as { projectMember?: { delete?: PrismaMethod } }).projectMember && isFn((client as unknown as { projectMember?: { delete?: PrismaMethod } }).projectMember!.delete))
    if (!hasProjectMember) {
      return NextResponse.json({ error: 'Server not configured for member removal. Run prisma migrate and regenerate client.' }, { status: 501 })
    }

    // load project to check permissions
    const projectClient = (client as unknown as { project?: { findUnique?: PrismaMethod } }).project
    if (!projectClient || !isFn(projectClient.findUnique)) {
      return NextResponse.json({ error: 'Server not configured for projects' }, { status: 501 })
    }

    const project = await (projectClient.findUnique as PrismaMethod)({ where: { id: projectId } }) as Record<string, unknown> | null
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // allow removal if caller is the project creator or the member themselves
    if (project.creatorId !== user.id && memberId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // attempt delete
    const pmClient = (client as unknown as { projectMember?: { deleteMany?: PrismaMethod } }).projectMember
    if (!pmClient || !isFn(pmClient.deleteMany)) {
      return NextResponse.json({ error: 'Server not configured for member removal. Run prisma migrate and regenerate client.' }, { status: 501 })
    }

    await (pmClient.deleteMany as PrismaMethod)({ where: { projectId, userId: memberId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to remove project member (API):', (err as unknown instanceof Error ? (err as Error).message : String(err)))
    return NextResponse.json({ error: 'Failed to remove project member' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const url = new URL(req.url)
    const params = url.searchParams
    const projectId = (params.get('projectId') || (body?.projectId as string | undefined))
    const memberId = (params.get('userId') || params.get('memberId') || (body?.userId as string | undefined) || (body?.memberId as string | undefined))
    const action = ((params.get('action') || (body?.action as string) || '').toString()).toLowerCase() // 'accept' or 'reject'

    if (!projectId || !memberId || !action) {
      return NextResponse.json({ error: 'projectId, userId and action required' }, { status: 400 })
    }

    const user = await currentUser()
    if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // load project to check permissions
    const projectClient = (client as unknown as { project?: { findUnique?: PrismaMethod } }).project
    if (!projectClient || !isFn(projectClient.findUnique)) {
      return NextResponse.json({ error: 'Server not configured for projects' }, { status: 501 })
    }

    const project = await (projectClient.findUnique as PrismaMethod)({ where: { id: projectId } }) as Record<string, unknown> | null
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    if (project.creatorId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const pmClient = (client as unknown as { projectMember?: { update?: PrismaMethod } }).projectMember
    if (!pmClient || !isFn(pmClient.update)) {
      return NextResponse.json({ error: 'Server not configured for member approval. Run prisma migrate and regenerate client.' }, { status: 501 })
    }

    const data: Record<string, unknown> = {}
    if (action === 'accept') {
      data.status = 'ACCEPTED'
      data.acceptedAt = new Date()
    } else if (action === 'reject') {
      data.status = 'REJECTED'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    try {
      // use composite unique for where
      const updated = await (pmClient.update as PrismaMethod)({ where: { userId_projectId: { userId: memberId, projectId } }, data })
      return NextResponse.json({ success: true, member: updated })
    } catch (err) {
      console.error('Failed to update project member status:', (err as unknown instanceof Error ? (err as Error).message : String(err)))
      return NextResponse.json({ error: 'Failed to update member status' }, { status: 500 })
    }
  } catch (err) {
    console.error('Member PATCH error', (err as unknown instanceof Error ? (err as Error).message : String(err)))
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}
