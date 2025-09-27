import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const user = await currentUser();

    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      return NextResponse.json({ message: 'User not authenticated or email not available.' }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    const firstName = user.firstName;
    const lastName = user.lastName;
    const imageUrl = user.imageUrl;
    const clerkId = user.id;

    const body = await request.json(); // Parse the request body
    const { githubUrl, linkedinUrl, portfolioUrl } = body; // Extract social links

    // Check if user already exists in the database
    let existingUser = await prisma.user.findUnique({
      where: { id: clerkId },
    });

    if (existingUser) {
      // Update existing user
      existingUser = await prisma.user.update({
        where: { id: clerkId },
        data: {
          email,
          firstName,
          lastName,
          imageUrl,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ message: 'User data updated successfully.', user: existingUser });
    } else {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          id: clerkId,
          email,
          firstName,
          lastName,
          imageUrl,
          githubUrl,
          linkedinUrl,
          portfolioUrl,
        },
      });
      return NextResponse.json({ message: 'User data saved successfully.', user: newUser });
    }
  } catch (error) {
    console.error("Error saving user data:", error);
    return NextResponse.json({ message: 'Failed to save user data.', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
