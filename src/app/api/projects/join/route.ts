import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { currentUser } from '@clerk/nextjs/server'

// Use global singleton
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    if (!user || !user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      projectId,
      fullName,
      contactInfo,
      portfolioUrl,
      skills,
      preferredRole,
      availability,
      motivation,
      agreedToGuidelines,
    } = body

    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    if (!agreedToGuidelines) return NextResponse.json({ error: 'You must agree to guidelines' }, { status: 400 })

    // ensure project exists
    const project = await (client as any).project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // Ensure the Clerk user exists in our User table to satisfy FK when creating ProjectMember
    try {
      if ((client as any).user && typeof (client as any).user.upsert === 'function') {
        const u: any = user
        const primaryEmail = (u.primaryEmailAddress && u.primaryEmailAddress.emailAddress) || (u.emailAddresses && u.emailAddresses[0] && u.emailAddresses[0].emailAddress) || u.email || `${user.id}@local.invalid`
        await (client as any).user.upsert({
          where: { id: user.id },
          update: {},
          create: { id: user.id, email: primaryEmail, firstName: u.firstName || undefined, lastName: u.lastName || undefined, imageUrl: u.imageUrl || undefined },
        })
      }
    } catch (err) {
      // ignore upsert errors but log for debugging
      console.warn('User upsert before join failed:', (err as any)?.message || err)
    }

    // normalize skills
    const normSkills = Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []

    // attempt extended upsert (works if Prisma client matches updated schema)
    try {
      const pm = await (client as any).projectMember.upsert({
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
      })

      return NextResponse.json({ success: true, applicationSaved: true, member: pm })
    } catch (err: any) {
      // If the client was not regenerated after schema changes, Prisma may throw validation errors like 'Unknown argument fullName'
      const msg = (err?.message || '').toString()
      console.warn('Join API extended upsert failed, falling back to minimal member create:', msg)

      // fallback: create or update minimal ProjectMember record with fields supported by current client
      try {
        // try to find existing membership
        const existing = await (client as any).projectMember.findFirst({ where: { userId: user.id, projectId } })
        if (existing) {
          // return success but indicate application fields not saved
          return NextResponse.json({ success: true, applicationSaved: false, member: existing, message: 'Application stored in minimal membership. Run prisma migrate and regenerate client to enable application fields.' })
        }

        const created = await (client as any).projectMember.create({ data: { userId: user.id, projectId, role: preferredRole || 'Contributor' } })
        return NextResponse.json({ success: true, applicationSaved: false, member: created, message: 'Application stored in minimal membership. Run prisma migrate and regenerate client to enable application fields.' })
      } catch (innerErr: any) {
        console.error('Join API fallback failed', innerErr?.message || innerErr)
        return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
      }
    }
  } catch (err) {
    console.error('Join API error', (err as any).message || err)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}
