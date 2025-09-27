import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Keep a global singleton in dev to avoid creating many clients during hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

export async function GET() {
  try {
    // Quick checks to report readiness without throwing if models are missing
    const hasPrismaProject = Boolean((client as any).project && typeof (client as any).project.findMany === 'function')

    // Try to connect to the DB
    await client.$connect()

    // If the Project model exists, attempt a light count to verify it works
    let projectCount: number | null = null
    if (hasPrismaProject) {
      try {
        projectCount = await (client as any).project.count()
      } catch (err) {
        // ignore model-level errors, we'll still report model presence
        projectCount = null
      }
    }

    return NextResponse.json({
      ok: true,
      db: {
        connected: true,
        hasProjectModel: hasPrismaProject,
        projectCount,
      },
      message: hasPrismaProject ? 'Prisma + DB ready' : 'Prisma client available but Project model not found. Run `prisma generate` after updating the schema and apply migrations.',
    })
  } catch (error) {
    console.error('Status endpoint error:', (error as any)?.message || error)
    return NextResponse.json({
      ok: false,
      error: (error as any)?.message || String(error),
      advice: 'Ensure DATABASE_URL is set, run `pnpm exec prisma generate`, and apply migrations with `pnpm exec prisma migrate dev`.',
    }, { status: 500 })
  }
}
