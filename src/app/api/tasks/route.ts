import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/lib/db';
import { CreateTaskSchema, TaskQueryOptions } from '@/types/task';
import { verifyAuth } from '@/lib/auth-admin';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  logger.logRequest(req, { context: 'GET /api/tasks' });
  
  const user = await verifyAuth(req);
  if (!user) {
    logger.log({
      context: 'GET /api/tasks',
      status: 'unauthorized'
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const queryOptions: TaskQueryOptions = {
      filters: {
        projectId: url.searchParams.get('projectId') || undefined,
        status: url.searchParams.get('status')?.split(',') as any[] || undefined,
        priority: url.searchParams.get('priority')?.split(',') as any[] || undefined,
        type: url.searchParams.get('type')?.split(',') as any[] || undefined,
        assignee: url.searchParams.get('assignee') || undefined,
        tags: url.searchParams.get('tags')?.split(',') || undefined,
      },
      sortBy: (url.searchParams.get('sortBy') as any) || 'priority',
      sortOrder: (url.searchParams.get('sortOrder') as any) || 'desc',
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
    };

    logger.log({
      context: 'GET /api/tasks',
      queryOptions
    });

    const tasks = await TaskService.getAll(queryOptions);
    
    logger.log({
      context: 'GET /api/tasks',
      status: 'success',
      taskCount: tasks.length
    });

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    logger.logError(error, 'GET /api/tasks');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tasks',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  logger.logRequest(req, { context: 'POST /api/tasks' });
  
  const user = await verifyAuth(req);
  if (!user) {
    logger.log({
      context: 'POST /api/tasks',
      status: 'unauthorized'
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    logger.log({
      context: 'POST /api/tasks',
      requestBody: body
    });

    const validatedData = CreateTaskSchema.parse(body);
    const task = await TaskService.create(validatedData);
    
    logger.log({
      context: 'POST /api/tasks',
      status: 'success',
      taskId: task.id
    });

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    logger.logError(error, 'POST /api/tasks');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create task',
      },
      { status: 500 }
    );
  }
} 