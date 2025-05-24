import { z } from 'zod';

// Enums
export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export enum TaskType {
  FEATURE = 'feature',
  BUG = 'bug',
  IMPROVEMENT = 'improvement',
  DOCUMENTATION = 'documentation',
  REFACTOR = 'refactor',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment'
}

// Zod Schemas for validation
export const TaskPrioritySchema = z.nativeEnum(TaskPriority);
export const TaskStatusSchema = z.nativeEnum(TaskStatus);
export const TaskTypeSchema = z.nativeEnum(TaskType);

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  repository: z.string().url().optional().or(z.literal('')),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  owner: z.string().optional(),
  status: z.enum(['active', 'completed', 'on_hold']).default('active')
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  projectId: z.string(),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  type: TaskTypeSchema,
  assignee: z.string().optional(),
  reporter: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  actualHours: z.number().positive().optional(),
  dueDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]), // Task IDs
  blockedBy: z.array(z.string()).default([]), // Task IDs
  attachments: z.array(z.string()).default([]), // URLs or file paths
  comments: z.array(z.object({
    id: z.string(),
    content: z.string(),
    author: z.string(),
    createdAt: z.date()
  })).default([]),
  // AI-specific fields
  aiContext: z.object({
    codeFiles: z.array(z.string()).default([]), // File paths relevant to this task
    commands: z.array(z.string()).default([]), // CLI commands to execute
    testCriteria: z.array(z.string()).default([]), // What to test/verify
    references: z.array(z.string()).default([]) // URLs, docs, or other references
  }).optional()
});

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateTaskSchema = TaskSchema.partial().omit({
  id: true,
  createdAt: true
});

export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const UpdateProjectSchema = ProjectSchema.partial().omit({
  id: true,
  createdAt: true
});

// TypeScript types derived from schemas
export type Project = z.infer<typeof ProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
}

// Filter and query types
export interface TaskFilters {
  projectId?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  type?: TaskType[];
  assignee?: string;
  tags?: string[];
  search?: string;
  dueDate?: {
    from?: Date;
    to?: Date;
  };
}

export interface TaskQueryOptions {
  filters?: TaskFilters;
  sortBy?: 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Priority weights for sorting
export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  [TaskPriority.CRITICAL]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1
};

// Status colors for UI
export const STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'bg-gray-100 text-gray-800',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TaskStatus.IN_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [TaskStatus.DONE]: 'bg-green-100 text-green-800',
  [TaskStatus.BLOCKED]: 'bg-red-100 text-red-800',
  [TaskStatus.CANCELLED]: 'bg-gray-100 text-gray-500'
};

// Priority colors for UI
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
  [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [TaskPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TaskPriority.LOW]: 'bg-green-100 text-green-800 border-green-200'
}; 