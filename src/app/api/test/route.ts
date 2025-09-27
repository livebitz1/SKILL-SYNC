import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    await prisma.$connect();
    return Response.json({ message: 'Database connection successful!' });
  } catch (error) {
    return Response.json({ message: 'Database connection failed.', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
