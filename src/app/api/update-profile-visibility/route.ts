import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = user.id;
    const { showProfile } = await request.json();

    if (typeof showProfile !== 'boolean') {
      return NextResponse.json({ message: 'Invalid input for showProfile.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: clerkId },
      data: {
        showProfileInLearn: showProfile,
      },
    });

    return NextResponse.json({ message: 'Profile visibility updated successfully.', user: updatedUser });
  } catch (error) {
    console.error("Error updating profile visibility:", error);
    return NextResponse.json({ message: 'Failed to update profile visibility.', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const clerkId = user.id;
    const userProfile = await prisma.user.findUnique({
      where: { id: clerkId },
      select: {
        showProfileInLearn: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json({ message: 'User profile not found.' }, { status: 404 });
    }

    return NextResponse.json({ showProfileInLearn: userProfile.showProfileInLearn });
  } catch (error) {
    console.error("Error fetching profile visibility:", error);
    return NextResponse.json({ message: 'Failed to fetch profile visibility.', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
