"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const app_1 = require("firebase-admin/app");
const task_1 = require("../../src/types/task");
// Lazy initialization flag
let isInitialized = false;
let initializationError = null;
// Initialize Firebase Admin only when needed
function initializeFirebase() {
    if (isInitialized)
        return;
    try {
        if ((0, app_1.getApps)().length === 0) {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
            if (!projectId || !clientEmail || !privateKey) {
                throw new Error('Missing Firebase credentials in environment variables');
            }
            firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
            });
        }
        isInitialized = true;
    }
    catch (error) {
        initializationError = error;
        throw error;
    }
}
// Helper to ensure Firebase is initialized
function ensureInitialized() {
    if (initializationError) {
        throw initializationError;
    }
    if (!isInitialized) {
        initializeFirebase();
    }
}
class FirebaseService {
    static async getProjects() {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        const snapshot = await db.collection('projects').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        }));
    }
    static async getProject(id) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        const doc = await db.collection('projects').doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    }
    static async createProject(projectData) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        const docRef = await db.collection('projects').add({
            ...projectData,
            createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        });
        const doc = await docRef.get();
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    }
    static async getTasks(options = {}) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        let query = db.collection('tasks');
        // Apply filters
        if (options.filters) {
            if (options.filters.projectId) {
                query = query.where('projectId', '==', options.filters.projectId);
            }
            if (options.filters.status && options.filters.status.length > 0) {
                query = query.where('status', 'in', options.filters.status);
            }
        }
        // Apply limit
        if (options.limit) {
            query = query.limit(options.limit);
        }
        // Apply sorting
        if (options.sortBy) {
            const direction = options.sortOrder === 'desc' ? 'desc' : 'asc';
            if (options.sortBy === 'priority') {
                // Custom priority sorting
                const priorityOrder = {
                    [task_1.TaskPriority.CRITICAL]: 4,
                    [task_1.TaskPriority.HIGH]: 3,
                    [task_1.TaskPriority.MEDIUM]: 2,
                    [task_1.TaskPriority.LOW]: 1
                };
                const snapshot = await query.get();
                const tasks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate() || new Date(),
                    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
                    dueDate: doc.data().dueDate?.toDate(),
                    comments: doc.data().comments || [],
                }));
                return tasks.sort((a, b) => {
                    const aOrder = priorityOrder[a.priority] || 0;
                    const bOrder = priorityOrder[b.priority] || 0;
                    return direction === 'desc' ? bOrder - aOrder : aOrder - bOrder;
                });
            }
            else {
                query = query.orderBy(options.sortBy, direction);
            }
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            dueDate: doc.data().dueDate?.toDate(),
            comments: doc.data().comments || [],
        }));
    }
    static async getTask(id) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        const doc = await db.collection('tasks').doc(id).get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate(),
            comments: data.comments || [],
        };
    }
    static async createTask(taskData) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        const docRef = await db.collection('tasks').add({
            ...taskData,
            createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        });
        const doc = await docRef.get();
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate(),
            comments: data.comments || [],
        };
    }
    static async updateTaskStatus(taskId, status) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        await db.collection('tasks').doc(taskId).update({
            status,
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        });
        const task = await this.getTask(taskId);
        if (!task) {
            throw new Error('Task not found after update');
        }
        return task;
    }
    static async updateTask(taskId, updateData) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        // Prepare update data with timestamp
        const updatePayload = {
            ...updateData,
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        };
        // Handle date fields
        if (updateData.dueDate) {
            updatePayload.dueDate = firebase_admin_1.default.firestore.Timestamp.fromDate(updateData.dueDate);
        }
        await db.collection('tasks').doc(taskId).update(updatePayload);
        const task = await this.getTask(taskId);
        if (!task) {
            throw new Error('Task not found after update');
        }
        return task;
    }
    static async updateProject(projectId, updateData) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        await db.collection('projects').doc(projectId).update({
            ...updateData,
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        });
        const project = await this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found after update');
        }
        return project;
    }
    static async deleteTask(taskId) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        await db.collection('tasks').doc(taskId).delete();
    }
    static async deleteProject(projectId) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        await db.collection('projects').doc(projectId).delete();
    }
    static async addTaskComment(taskId, content, author) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        const comment = {
            id: db.collection('tasks').doc().id,
            content,
            author,
            createdAt: new Date(),
        };
        await db.collection('tasks').doc(taskId).update({
            comments: firebase_admin_1.default.firestore.FieldValue.arrayUnion(comment),
            updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
        });
        const task = await this.getTask(taskId);
        if (!task) {
            throw new Error('Task not found after comment addition');
        }
        return task;
    }
    static async getNextTask(projectId) {
        ensureInitialized();
        const tasks = await this.getTasks({
            filters: {
                status: [task_1.TaskStatus.TODO],
                ...(projectId && { projectId }),
            },
            sortBy: 'priority',
            sortOrder: 'desc',
            limit: 1,
        });
        return tasks.length > 0 ? tasks[0] : null;
    }
    static async getTasksByFiles(filePaths) {
        ensureInitialized();
        const db = firebase_admin_1.default.firestore();
        const tasks = [];
        // Query tasks that have aiContext.codeFiles containing any of the file paths
        const snapshot = await db.collection('tasks').get();
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const codeFiles = data.aiContext?.codeFiles || [];
            const hasMatchingFile = filePaths.some(filePath => codeFiles.some((codeFile) => codeFile.includes(filePath) || filePath.includes(codeFile)));
            if (hasMatchingFile) {
                tasks.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    dueDate: data.dueDate?.toDate(),
                    comments: data.comments || [],
                });
            }
        }
        return tasks;
    }
    // Test connection method
    static async testConnection() {
        try {
            ensureInitialized();
            const db = firebase_admin_1.default.firestore();
            await db.collection('_test').limit(1).get();
            return true;
        }
        catch (error) {
            return false;
        }
    }
}
exports.FirebaseService = FirebaseService;
