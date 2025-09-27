import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch all users from the database, including their skills
    const usersWithSkills = await prisma.user.findMany({
      where: {
        showProfileInLearn: true, // Only show profiles that are set to be visible
      },
      include: {
        skills: true, // Include the skills relation
      },
    });

    return NextResponse.json(usersWithSkills);
  } catch (error) {
    console.error("Error fetching users with skills:", error);
    return NextResponse.json({ message: 'Failed to fetch users with skills.', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
