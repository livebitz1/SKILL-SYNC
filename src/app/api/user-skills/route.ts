import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { currentUser } from '@clerk/nextjs/server';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  global.prisma = prisma;
}

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, level, category, type } = await request.json();

    if (!name || !level || !category || !type) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newSkill = await prisma.skill.create({
      data: {
        name,
        level,
        category,
        type,
        userId: user.id,
      },
    });

    // Notify standalone Socket.IO server of skill added
    try {
      await fetch("http://localhost:3001/notify-skill-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "skillAdded", data: newSkill }),
      });
    } catch (notificationError) {
      console.error("Error notifying Socket.IO server of skill added:", notificationError);
    }

    return NextResponse.json(newSkill, { status: 201 });
  } catch (error) {
    console.error("Error adding skill:", error);
    return NextResponse.json({ message: 'Failed to add skill.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json(); // Assuming id is sent in the request body for DELETE

    if (!id) {
      return NextResponse.json({ message: 'Missing skill ID' }, { status: 400 });
    }

    await prisma.skill.delete({
      where: { id: id, userId: user.id }, // Ensure user can only delete their own skills
    });

    // Notify standalone Socket.IO server of skill deleted
    try {
      await fetch("http://localhost:3001/notify-skill-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "skillRemoved", data: id }),
      });
    } catch (notificationError) {
      console.error("Error notifying Socket.IO server of skill removed:", notificationError);
    }

    return NextResponse.json({ message: 'Skill deleted successfully.' });
  } catch (error) {
    console.error("Error deleting skill:", error);
    return NextResponse.json({ message: 'Failed to delete skill.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
