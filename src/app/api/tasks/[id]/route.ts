import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/db';
import { UpdateTaskSchema } from '@/types/task';
import { verifyAuth } from '@/lib/auth-admin';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  logger.logRequest(req, { 
    context: 'GET /api/tasks/[id]',
    taskId: params.id
  });

  const user = await verifyAuth(req);
  if (!user) {
    logger.log({
      context: 'GET /api/tasks/[id]',
      status: 'unauthorized',
      taskId: params.id
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const task = await TaskService.get(params.id);
    
    if (!task) {
      logger.log({
        context: 'GET /api/tasks/[id]',
        status: 'not_found',
        taskId: params.id
      });
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    logger.log({
      context: 'GET /api/tasks/[id]',
      status: 'success',
      taskId: params.id
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    logger.logError(error, `GET /api/tasks/${params.id}`);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  logger.logRequest(req, { 
    context: 'PATCH /api/tasks/[id]',
    taskId: params.id
  });

  const user = await verifyAuth(req);
  if (!user) {
    logger.log({
      context: 'PATCH /api/tasks/[id]',
      status: 'unauthorized',
      taskId: params.id
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    logger.log({
      context: 'PATCH /api/tasks/[id]',
      taskId: params.id,
      requestBody: body
    });

    const validatedData = UpdateTaskSchema.parse(body);
    const updatedTask = await TaskService.update(params.id, validatedData);

    if (!updatedTask) {
      logger.log({
        context: 'PATCH /api/tasks/[id]',
        status: 'not_found',
        taskId: params.id
      });
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    logger.log({
      context: 'PATCH /api/tasks/[id]',
      status: 'success',
      taskId: params.id,
      updates: validatedData
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    logger.logError(error, `PATCH /api/tasks/${params.id}`);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  logger.logRequest(req, { 
    context: 'DELETE /api/tasks/[id]',
    taskId: params.id
  });

  const user = await verifyAuth(req);
  if (!user) {
    logger.log({
      context: 'DELETE /api/tasks/[id]',
      status: 'unauthorized',
      taskId: params.id
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await TaskService.delete(params.id);
    
    logger.log({
      context: 'DELETE /api/tasks/[id]',
      status: 'success',
      taskId: params.id
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    logger.logError(error, `DELETE /api/tasks/${params.id}`);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
} 