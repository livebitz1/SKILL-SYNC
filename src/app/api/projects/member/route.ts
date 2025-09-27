import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { currentUser } from '@clerk/nextjs/server'

// Global singleton for Prisma
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const params = url.searchParams
    let projectId = params.get('projectId') || undefined
    let memberId = params.get('userId') || params.get('memberId') || undefined

    // allow JSON body as fallback
    if (!projectId || !memberId) {
      try {
        const body = await req.json()
        projectId = projectId || body?.projectId
        memberId = memberId || body?.userId || body?.memberId
      } catch (e) {
        // ignore
      }
    }

    if (!projectId || !memberId) {
      return NextResponse.json({ error: 'projectId and userId (member) required' }, { status: 400 })
    }

    const user = await currentUser()
    if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hasProjectMember = Boolean((client as any).projectMember && typeof (client as any).projectMember.delete === 'function')
    if (!hasProjectMember) {
      return NextResponse.json({ error: 'Server not configured for member removal. Run prisma migrate and regenerate client.' }, { status: 501 })
    }

    // load project to check permissions
    const project = await (client as any).project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // allow removal if caller is the project creator or the member themselves
    if (project.creatorId !== user.id && memberId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // attempt delete
    await (client as any).projectMember.deleteMany({ where: { projectId, userId: memberId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to remove project member (API):', (err as any)?.message || err)
    return NextResponse.json({ error: 'Failed to remove project member' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const url = new URL(req.url)
    const params = url.searchParams
    const projectId = params.get('projectId') || body?.projectId
    const memberId = params.get('userId') || params.get('memberId') || body?.userId || body?.memberId
    const action = (params.get('action') || body?.action || '').toString().toLowerCase() // 'accept' or 'reject'

    if (!projectId || !memberId || !action) {
      return NextResponse.json({ error: 'projectId, userId and action required' }, { status: 400 })
    }

    const user = await currentUser()
    if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // load project to check permissions
    const project = await (client as any).project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    if (project.creatorId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const hasUpdate = Boolean((client as any).projectMember && typeof (client as any).projectMember.update === 'function')
    if (!hasUpdate) {
      return NextResponse.json({ error: 'Server not configured for member approval. Run prisma migrate and regenerate client.' }, { status: 501 })
    }

    const data: any = {}
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
      const updated = await (client as any).projectMember.update({ where: { userId_projectId: { userId: memberId, projectId } }, data })
      return NextResponse.json({ success: true, member: updated })
    } catch (err: any) {
      console.error('Failed to update project member status:', (err?.message || err))
      return NextResponse.json({ error: 'Failed to update member status' }, { status: 500 })
    }
  } catch (err) {
    console.error('Member PATCH error', (err as any).message || err)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}
