"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITaskService = exports.TaskService = exports.ProjectService = void 0;
const firestore_1 = require("firebase-admin/firestore");
const task_1 = require("@/types/task");
require("./firebase-admin"); // This will ensure Firebase Admin is initialized
const db = (0, firestore_1.getFirestore)();
// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp) => {
    if (timestamp?.toDate) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
};
// Project operations
class ProjectService {
    static async create(projectData) {
        const now = new Date();
        const project = {
            ...projectData,
            createdAt: now,
            updatedAt: now,
            isActive: true,
            tags: projectData.tags || [],
            status: projectData.status || 'active',
        };
        const docRef = await this.collection.add({
            ...project,
            createdAt: firestore_1.Timestamp.fromDate(project.createdAt),
            updatedAt: firestore_1.Timestamp.fromDate(project.updatedAt),
        });
        return {
            ...project,
            id: docRef.id,
        };
    }
    static async getAll() {
        try {
            // Try with the composite index first
            const snapshot = await this.collection
                .where('isActive', '==', true)
                .orderBy('updatedAt', 'desc')
                .get();
            return snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: timestampToDate(data.createdAt),
                    updatedAt: timestampToDate(data.updatedAt),
                };
            });
        }
        catch (error) {
            // If the index is not ready, fall back to a simple query
            if (error.code === 9) { // FAILED_PRECONDITION
                console.warn('Index not ready, falling back to simple query');
                const snapshot = await this.collection
                    .where('isActive', '==', true)
                    .get();
                return snapshot.docs
                    .map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: timestampToDate(data.createdAt),
                        updatedAt: timestampToDate(data.updatedAt),
                    };
                })
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            }
            throw error;
        }
    }
    static async get(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: timestampToDate(data.createdAt),
            updatedAt: timestampToDate(data.updatedAt),
        };
    }
    static async update(id, updateData) {
        const now = new Date();
        await this.collection.doc(id).update({
            ...updateData,
            updatedAt: firestore_1.Timestamp.fromDate(now),
        });
        const updated = await this.get(id);
        if (!updated) {
            throw new Error('Project not found after update');
        }
        return updated;
    }
    static async delete(id) {
        await this.collection.doc(id).update({
            isActive: false,
            updatedAt: firestore_1.Timestamp.fromDate(new Date()),
        });
    }
}
exports.ProjectService = ProjectService;
ProjectService.collection = db.collection('projects');
// Task operations
class TaskService {
    static async create(taskData) {
        const now = new Date();
        const task = {
            ...taskData,
            createdAt: firestore_1.Timestamp.fromDate(now),
            updatedAt: firestore_1.Timestamp.fromDate(now),
            dueDate: taskData.dueDate ? firestore_1.Timestamp.fromDate(taskData.dueDate) : null,
            comments: [],
            tags: taskData.tags || [],
            dependencies: taskData.dependencies || [],
            blockedBy: taskData.blockedBy || [],
            attachments: taskData.attachments || [],
        };
        const docRef = await this.collection.add(task);
        return {
            ...taskData,
            id: docRef.id,
            createdAt: now,
            updatedAt: now,
            comments: [],
            tags: task.tags,
            dependencies: task.dependencies,
            blockedBy: task.blockedBy,
            attachments: task.attachments,
        };
    }
    static async getAll(options = {}) {
        let query = this.collection;
        if (options.filters) {
            const { projectId, status, priority, type, assignee, tags } = options.filters;
            if (projectId) {
                query = query.where('projectId', '==', projectId);
            }
            if (status && status.length > 0) {
                query = query.where('status', 'in', status);
            }
            if (priority && priority.length > 0) {
                query = query.where('priority', 'in', priority);
            }
            if (type && type.length > 0) {
                query = query.where('type', 'in', type);
            }
            if (assignee) {
                query = query.where('assignee', '==', assignee);
            }
            if (tags && tags.length > 0) {
                query = query.where('tags', 'array-contains-any', tags);
            }
        }
        // Apply sorting
        const sortBy = options.sortBy || 'priority';
        const sortOrder = options.sortOrder || 'desc';
        if (sortBy !== 'priority') {
            query = query.orderBy(sortBy, sortOrder);
        }
        // Apply pagination
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const snapshot = await query.get();
        let tasks = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: timestampToDate(data.createdAt),
                updatedAt: timestampToDate(data.updatedAt),
                dueDate: data.dueDate ? timestampToDate(data.dueDate) : undefined,
                comments: data.comments?.map((comment) => ({
                    ...comment,
                    createdAt: timestampToDate(comment.createdAt),
                })) || [],
            };
        });
        // Sort by priority if needed
        if (sortBy === 'priority') {
            tasks = tasks.sort((a, b) => {
                const weightA = task_1.PRIORITY_WEIGHTS[a.priority];
                const weightB = task_1.PRIORITY_WEIGHTS[b.priority];
                return sortOrder === 'desc' ? weightB - weightA : weightA - weightB;
            });
        }
        return tasks;
    }
    static async get(id) {
        const doc = await this.collection.doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: timestampToDate(data.createdAt),
            updatedAt: timestampToDate(data.updatedAt),
            dueDate: data.dueDate ? timestampToDate(data.dueDate) : undefined,
            comments: data.comments?.map((comment) => ({
                ...comment,
                createdAt: timestampToDate(comment.createdAt),
            })) || [],
        };
    }
    static async update(id, updateData) {
        const now = new Date();
        await this.collection.doc(id).update({
            ...updateData,
            updatedAt: firestore_1.Timestamp.fromDate(now),
        });
        const updated = await this.get(id);
        if (!updated) {
            throw new Error('Task not found after update');
        }
        return updated;
    }
    static async delete(id) {
        await this.collection.doc(id).delete();
    }
}
exports.TaskService = TaskService;
TaskService.collection = db.collection('tasks');
// Utility functions for AI integration
class AITaskService {
    static async getTasksForAI(projectId) {
        const options = {
            filters: {
                status: [task_1.TaskStatus.TODO, task_1.TaskStatus.IN_PROGRESS, task_1.TaskStatus.BLOCKED],
                ...(projectId && { projectId }),
            },
            sortBy: 'priority',
            sortOrder: 'desc',
            limit: 50,
        };
        return TaskService.getAll(options);
    }
    static async getNextTask(projectId) {
        const tasks = await this.getTasksForAI(projectId);
        return tasks.length > 0 ? tasks[0] : null;
    }
    static async getTasksByFiles(filePaths) {
        const allTasks = await TaskService.getAll();
        return allTasks.filter(task => task.aiContext?.codeFiles?.some(file => filePaths.some(path => path.includes(file) || file.includes(path))));
    }
}
exports.AITaskService = AITaskService;
//# sourceMappingURL=db.js.map