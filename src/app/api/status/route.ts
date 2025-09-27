import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Keep a global singleton in dev to avoid creating many clients during hot reloads
declare global {
  var __prismaClient: PrismaClient | undefined
}

const client = global.__prismaClient ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.__prismaClient = client

type PrismaMethod = (...args: unknown[]) => Promise<unknown> | unknown
function isFn(v: unknown): v is PrismaMethod {
  return typeof v === 'function'
}

export async function GET() {
  try {
    // Quick checks to report readiness without throwing if models are missing
    const hasPrismaProject = Boolean((client as unknown as { project?: { findMany?: PrismaMethod } }).project && isFn((client as unknown as { project?: { findMany?: PrismaMethod } }).project!.findMany))

    // Try to connect to the DB
    await client.$connect()

    // If the Project model exists, attempt a light count to verify it works
    let projectCount: number | null = null
    if (hasPrismaProject) {
      try {
        const proj = (client as unknown as { project?: { count?: PrismaMethod } }).project
        if (proj && isFn(proj.count)) {
          projectCount = (await (proj.count as PrismaMethod) as unknown) as number
        } else {
          projectCount = null
        }
      } catch {
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
    console.error('Status endpoint error:', (error as unknown instanceof Error ? (error as Error).message : String(error)))
    return NextResponse.json({
      ok: false,
      error: (error as unknown instanceof Error ? (error as Error).message : String(error)),
      advice: 'Ensure DATABASE_URL is set, run `pnpm exec prisma generate`, and apply migrations with `pnpm exec prisma migrate dev`.',
    }, { status: 500 })
  }
}
