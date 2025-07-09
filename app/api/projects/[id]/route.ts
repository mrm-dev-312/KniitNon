import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for updating projects
const UpdateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  data: z.object({
    nodes: z.array(z.any()).optional(),
    conflicts: z.array(z.any()).optional(),
    summary: z.any().optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

// GET /api/projects/[id] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const project = await prisma.savedPath.findFirst({
      where: {
        id: params.id,
        user: {
          email: session.user.email,
        },
      },
      select: {
        id: true,
        title: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project, { status: 200 });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateProjectSchema.parse(body);

    // Check if the project exists and belongs to the user
    const existingProject = await prisma.savedPath.findFirst({
      where: {
        id: params.id,
        user: {
          email: session.user.email,
        },
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const updatedProject = await prisma.savedPath.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.data && { data: validatedData.data }),
      },
      select: {
        id: true,
        title: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedProject, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the project exists and belongs to the user
    const existingProject = await prisma.savedPath.findFirst({
      where: {
        id: params.id,
        user: {
          email: session.user.email,
        },
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    await prisma.savedPath.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { success: true, message: 'Project deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
