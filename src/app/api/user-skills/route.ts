import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { currentUser } from '@clerk/nextjs/server';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = new PrismaClient();

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const skills = await prisma.skill.findMany({
      where: { userId: user.id },
    });

    return NextResponse.json(skills);
  } catch (error) {
    console.error("Error fetching skills:", error);
    return NextResponse.json({ message: 'Failed to fetch skills.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();

    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      return NextResponse.json({ message: 'User not authenticated or email not available.' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const email = user.emailAddresses[0].emailAddress;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const firstName = user.firstName;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lastName = user.lastName;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const imageUrl = user.imageUrl;
    const clerkId = user.id;

    const { name, level, category, type } = await request.json();

    if (!name || !level || !category || !type) {
      return NextResponse.json({ message: 'Missing required skill data.' }, { status: 400 });
    }

    try {
      const newSkill = await prisma.skill.create({
        data: {
          name,
          level,
          category,
          type,
          userId: clerkId,
        },
      });
      // Notify clients via WebSocket (if a socket.server.js is running)
      // This part assumes a WebSocket server is set up to emit 'skillAdded' event
      // import { io } from 'socket.io-client';
      // const socket = io('http://localhost:3001');
      // socket.emit('skillAdded', newSkill);

      return NextResponse.json({ message: 'Skill added successfully.', skill: newSkill });
    } catch (dbError) {
      console.error("Error adding skill to database:", dbError);
      return NextResponse.json({ message: 'Failed to add skill.', error: dbError instanceof Error ? dbError.message : 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in POST /api/user-skills:", error);
    return NextResponse.json({ message: 'Internal Server Error.', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await currentUser();

    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      return NextResponse.json({ message: 'User not authenticated or email not available.' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ message: 'Missing skill ID.' }, { status: 400 });
    }

    // Verify that the skill belongs to the current user before deleting
    const skillToDelete = await prisma.skill.findUnique({
      where: { id: id },
    });

    if (!skillToDelete || skillToDelete.userId !== user.id) {
      return NextResponse.json({ message: 'Skill not found or not authorized to delete.' }, { status: 403 });
    }

    await prisma.skill.delete({
      where: { id: id },
    });

    // Notify clients via WebSocket (if a socket.server.js is running)
    // This part assumes a WebSocket server is set up to emit 'skillRemoved' event
    // import { io } from 'socket.io-client';
    // const socket = io('http://localhost:3001');
    // socket.emit('skillRemoved', id);

    return NextResponse.json({ message: 'Skill deleted successfully.' });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json({ message: 'Failed to delete skill.', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
