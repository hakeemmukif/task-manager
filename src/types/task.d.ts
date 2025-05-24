import { z } from 'zod';
export declare enum TaskPriority {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low"
}
export declare enum TaskStatus {
    TODO = "todo",
    IN_PROGRESS = "in_progress",
    IN_REVIEW = "in_review",
    DONE = "done",
    BLOCKED = "blocked",
    CANCELLED = "cancelled"
}
export declare enum TaskType {
    FEATURE = "feature",
    BUG = "bug",
    IMPROVEMENT = "improvement",
    DOCUMENTATION = "documentation",
    REFACTOR = "refactor",
    TESTING = "testing",
    DEPLOYMENT = "deployment"
}
export declare const TaskPrioritySchema: z.ZodNativeEnum<typeof TaskPriority>;
export declare const TaskStatusSchema: z.ZodNativeEnum<typeof TaskStatus>;
export declare const TaskTypeSchema: z.ZodNativeEnum<typeof TaskType>;
export declare const ProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    repository: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    isActive: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    owner: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "on_hold"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    status: "active" | "completed" | "on_hold";
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    tags: string[];
    description?: string | undefined;
    repository?: string | undefined;
    owner?: string | undefined;
}, {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    description?: string | undefined;
    repository?: string | undefined;
    status?: "active" | "completed" | "on_hold" | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    owner?: string | undefined;
}>;
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    projectId: z.ZodString;
    priority: z.ZodNativeEnum<typeof TaskPriority>;
    status: z.ZodNativeEnum<typeof TaskStatus>;
    type: z.ZodNativeEnum<typeof TaskType>;
    assignee: z.ZodOptional<z.ZodString>;
    reporter: z.ZodOptional<z.ZodString>;
    estimatedHours: z.ZodOptional<z.ZodNumber>;
    actualHours: z.ZodOptional<z.ZodNumber>;
    dueDate: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    blockedBy: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        author: z.ZodString;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }, {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }>, "many">>;
    aiContext: z.ZodOptional<z.ZodObject<{
        codeFiles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        commands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        testCriteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        references: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        codeFiles: string[];
        commands: string[];
        testCriteria: string[];
        references: string[];
    }, {
        codeFiles?: string[] | undefined;
        commands?: string[] | undefined;
        testCriteria?: string[] | undefined;
        references?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    status: TaskStatus;
    type: TaskType;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    title: string;
    projectId: string;
    priority: TaskPriority;
    dependencies: string[];
    blockedBy: string[];
    attachments: string[];
    comments: {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }[];
    assignee?: string | undefined;
    reporter?: string | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
    dueDate?: Date | undefined;
    aiContext?: {
        codeFiles: string[];
        commands: string[];
        testCriteria: string[];
        references: string[];
    } | undefined;
}, {
    id: string;
    description: string;
    status: TaskStatus;
    type: TaskType;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    projectId: string;
    priority: TaskPriority;
    tags?: string[] | undefined;
    assignee?: string | undefined;
    reporter?: string | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
    dueDate?: Date | undefined;
    dependencies?: string[] | undefined;
    blockedBy?: string[] | undefined;
    attachments?: string[] | undefined;
    comments?: {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }[] | undefined;
    aiContext?: {
        codeFiles?: string[] | undefined;
        commands?: string[] | undefined;
        testCriteria?: string[] | undefined;
        references?: string[] | undefined;
    } | undefined;
}>;
export declare const CreateTaskSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    projectId: z.ZodString;
    priority: z.ZodNativeEnum<typeof TaskPriority>;
    status: z.ZodNativeEnum<typeof TaskStatus>;
    type: z.ZodNativeEnum<typeof TaskType>;
    assignee: z.ZodOptional<z.ZodString>;
    reporter: z.ZodOptional<z.ZodString>;
    estimatedHours: z.ZodOptional<z.ZodNumber>;
    actualHours: z.ZodOptional<z.ZodNumber>;
    dueDate: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    blockedBy: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    comments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        author: z.ZodString;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }, {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }>, "many">>;
    aiContext: z.ZodOptional<z.ZodObject<{
        codeFiles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        commands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        testCriteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        references: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        codeFiles: string[];
        commands: string[];
        testCriteria: string[];
        references: string[];
    }, {
        codeFiles?: string[] | undefined;
        commands?: string[] | undefined;
        testCriteria?: string[] | undefined;
        references?: string[] | undefined;
    }>>;
}, "id" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
    description: string;
    status: TaskStatus;
    type: TaskType;
    tags: string[];
    title: string;
    projectId: string;
    priority: TaskPriority;
    dependencies: string[];
    blockedBy: string[];
    attachments: string[];
    comments: {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }[];
    assignee?: string | undefined;
    reporter?: string | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
    dueDate?: Date | undefined;
    aiContext?: {
        codeFiles: string[];
        commands: string[];
        testCriteria: string[];
        references: string[];
    } | undefined;
}, {
    description: string;
    status: TaskStatus;
    type: TaskType;
    title: string;
    projectId: string;
    priority: TaskPriority;
    tags?: string[] | undefined;
    assignee?: string | undefined;
    reporter?: string | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
    dueDate?: Date | undefined;
    dependencies?: string[] | undefined;
    blockedBy?: string[] | undefined;
    attachments?: string[] | undefined;
    comments?: {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }[] | undefined;
    aiContext?: {
        codeFiles?: string[] | undefined;
        commands?: string[] | undefined;
        testCriteria?: string[] | undefined;
        references?: string[] | undefined;
    } | undefined;
}>;
export declare const UpdateTaskSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNativeEnum<typeof TaskPriority>>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof TaskStatus>>;
    type: z.ZodOptional<z.ZodNativeEnum<typeof TaskType>>;
    assignee: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    reporter: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    estimatedHours: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    actualHours: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    dueDate: z.ZodOptional<z.ZodOptional<z.ZodDate>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    dependencies: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    blockedBy: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    attachments: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    comments: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        content: z.ZodString;
        author: z.ZodString;
        createdAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }, {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }>, "many">>>;
    aiContext: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        codeFiles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        commands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        testCriteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        references: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        codeFiles: string[];
        commands: string[];
        testCriteria: string[];
        references: string[];
    }, {
        codeFiles?: string[] | undefined;
        commands?: string[] | undefined;
        testCriteria?: string[] | undefined;
        references?: string[] | undefined;
    }>>>;
}, "id" | "createdAt">, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    status?: TaskStatus | undefined;
    type?: TaskType | undefined;
    updatedAt?: Date | undefined;
    tags?: string[] | undefined;
    title?: string | undefined;
    projectId?: string | undefined;
    priority?: TaskPriority | undefined;
    assignee?: string | undefined;
    reporter?: string | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
    dueDate?: Date | undefined;
    dependencies?: string[] | undefined;
    blockedBy?: string[] | undefined;
    attachments?: string[] | undefined;
    comments?: {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }[] | undefined;
    aiContext?: {
        codeFiles: string[];
        commands: string[];
        testCriteria: string[];
        references: string[];
    } | undefined;
}, {
    description?: string | undefined;
    status?: TaskStatus | undefined;
    type?: TaskType | undefined;
    updatedAt?: Date | undefined;
    tags?: string[] | undefined;
    title?: string | undefined;
    projectId?: string | undefined;
    priority?: TaskPriority | undefined;
    assignee?: string | undefined;
    reporter?: string | undefined;
    estimatedHours?: number | undefined;
    actualHours?: number | undefined;
    dueDate?: Date | undefined;
    dependencies?: string[] | undefined;
    blockedBy?: string[] | undefined;
    attachments?: string[] | undefined;
    comments?: {
        id: string;
        createdAt: Date;
        content: string;
        author: string;
    }[] | undefined;
    aiContext?: {
        codeFiles?: string[] | undefined;
        commands?: string[] | undefined;
        testCriteria?: string[] | undefined;
        references?: string[] | undefined;
    } | undefined;
}>;
export declare const CreateProjectSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    repository: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    isActive: z.ZodDefault<z.ZodBoolean>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    owner: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "completed", "on_hold"]>>;
}, "id" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
    name: string;
    status: "active" | "completed" | "on_hold";
    isActive: boolean;
    tags: string[];
    description?: string | undefined;
    repository?: string | undefined;
    owner?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    repository?: string | undefined;
    status?: "active" | "completed" | "on_hold" | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    owner?: string | undefined;
}>;
export declare const UpdateProjectSchema: z.ZodObject<Omit<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    repository: z.ZodOptional<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "completed", "on_hold"]>>>;
}, "id" | "createdAt">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    repository?: string | undefined;
    status?: "active" | "completed" | "on_hold" | undefined;
    updatedAt?: Date | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    owner?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    repository?: string | undefined;
    status?: "active" | "completed" | "on_hold" | undefined;
    updatedAt?: Date | undefined;
    isActive?: boolean | undefined;
    tags?: string[] | undefined;
    owner?: string | undefined;
}>;
export type Project = z.infer<typeof ProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
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
export declare const PRIORITY_WEIGHTS: Record<TaskPriority, number>;
export declare const STATUS_COLORS: Record<TaskStatus, string>;
export declare const PRIORITY_COLORS: Record<TaskPriority, string>;
//# sourceMappingURL=task.d.ts.map