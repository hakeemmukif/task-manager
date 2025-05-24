"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_COLORS = exports.STATUS_COLORS = exports.PRIORITY_WEIGHTS = exports.UpdateProjectSchema = exports.CreateProjectSchema = exports.UpdateTaskSchema = exports.CreateTaskSchema = exports.TaskSchema = exports.ProjectSchema = exports.TaskTypeSchema = exports.TaskStatusSchema = exports.TaskPrioritySchema = exports.TaskType = exports.TaskStatus = exports.TaskPriority = void 0;
const zod_1 = require("zod");
// Enums
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["CRITICAL"] = "critical";
    TaskPriority["HIGH"] = "high";
    TaskPriority["MEDIUM"] = "medium";
    TaskPriority["LOW"] = "low";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["TODO"] = "todo";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["IN_REVIEW"] = "in_review";
    TaskStatus["DONE"] = "done";
    TaskStatus["BLOCKED"] = "blocked";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskType;
(function (TaskType) {
    TaskType["FEATURE"] = "feature";
    TaskType["BUG"] = "bug";
    TaskType["IMPROVEMENT"] = "improvement";
    TaskType["DOCUMENTATION"] = "documentation";
    TaskType["REFACTOR"] = "refactor";
    TaskType["TESTING"] = "testing";
    TaskType["DEPLOYMENT"] = "deployment";
})(TaskType || (exports.TaskType = TaskType = {}));
// Zod Schemas for validation
exports.TaskPrioritySchema = zod_1.z.nativeEnum(TaskPriority);
exports.TaskStatusSchema = zod_1.z.nativeEnum(TaskStatus);
exports.TaskTypeSchema = zod_1.z.nativeEnum(TaskType);
exports.ProjectSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1, 'Project name is required'),
    description: zod_1.z.string().optional(),
    repository: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    isActive: zod_1.z.boolean().default(true),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    owner: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'completed', 'on_hold']).default('active')
});
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string().min(1, 'Task title is required'),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    projectId: zod_1.z.string(),
    priority: exports.TaskPrioritySchema,
    status: exports.TaskStatusSchema,
    type: exports.TaskTypeSchema,
    assignee: zod_1.z.string().optional(),
    reporter: zod_1.z.string().optional(),
    estimatedHours: zod_1.z.number().positive().optional(),
    actualHours: zod_1.z.number().positive().optional(),
    dueDate: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]), // Task IDs
    blockedBy: zod_1.z.array(zod_1.z.string()).default([]), // Task IDs
    attachments: zod_1.z.array(zod_1.z.string()).default([]), // URLs or file paths
    comments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        content: zod_1.z.string(),
        author: zod_1.z.string(),
        createdAt: zod_1.z.date()
    })).default([]),
    // AI-specific fields
    aiContext: zod_1.z.object({
        codeFiles: zod_1.z.array(zod_1.z.string()).default([]), // File paths relevant to this task
        commands: zod_1.z.array(zod_1.z.string()).default([]), // CLI commands to execute
        testCriteria: zod_1.z.array(zod_1.z.string()).default([]), // What to test/verify
        references: zod_1.z.array(zod_1.z.string()).default([]) // URLs, docs, or other references
    }).optional()
});
exports.CreateTaskSchema = exports.TaskSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.UpdateTaskSchema = exports.TaskSchema.partial().omit({
    id: true,
    createdAt: true
});
exports.CreateProjectSchema = exports.ProjectSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.UpdateProjectSchema = exports.ProjectSchema.partial().omit({
    id: true,
    createdAt: true
});
// Priority weights for sorting
exports.PRIORITY_WEIGHTS = {
    [TaskPriority.CRITICAL]: 4,
    [TaskPriority.HIGH]: 3,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.LOW]: 1
};
// Status colors for UI
exports.STATUS_COLORS = {
    [TaskStatus.TODO]: 'bg-gray-100 text-gray-800',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [TaskStatus.IN_REVIEW]: 'bg-yellow-100 text-yellow-800',
    [TaskStatus.DONE]: 'bg-green-100 text-green-800',
    [TaskStatus.BLOCKED]: 'bg-red-100 text-red-800',
    [TaskStatus.CANCELLED]: 'bg-gray-100 text-gray-500'
};
// Priority colors for UI
exports.PRIORITY_COLORS = {
    [TaskPriority.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
    [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
    [TaskPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [TaskPriority.LOW]: 'bg-green-100 text-green-800 border-green-200'
};
//# sourceMappingURL=task.js.map