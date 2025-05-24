import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { Query } from 'firebase-admin/firestore';
import {
  Task,
  Project,
  CreateTask,
  UpdateTask,
  CreateProject,
  TaskQueryOptions,
  TaskStatus,
  TaskPriority,
  PRIORITY_WEIGHTS,
} from '../../src/types/task';

// Lazy initialization flag
let isInitialized = false;
let initializationError: Error | null = null;

// Initialize Firebase Admin only when needed
function initializeFirebase(): void {
  if (isInitialized) return;
  
  try {
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase credentials in environment variables');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    }
    isInitialized = true;
  } catch (error) {
    initializationError = error as Error;
    throw error;
  }
}

// Helper to ensure Firebase is initialized
function ensureInitialized(): void {
  if (initializationError) {
    throw initializationError;
  }
  if (!isInitialized) {
    initializeFirebase();
  }
}

export class FirebaseService {
  static async getProjects(): Promise<Project[]> {
    ensureInitialized();
    const db = admin.firestore();
    const snapshot = await db.collection('projects').get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Project[];
  }

  static async getProject(id: string): Promise<Project | null> {
    ensureInitialized();
    const db = admin.firestore();
    const doc = await db.collection('projects').doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Project;
  }

  static async createProject(projectData: CreateProject): Promise<Project> {
    ensureInitialized();
    const db = admin.firestore();
    const docRef = await db.collection('projects').add({
      ...projectData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const doc = await docRef.get();
    const data = doc.data()!;
    
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Project;
  }

  static async getTasks(options: TaskQueryOptions = {}): Promise<Task[]> {
    ensureInitialized();
    const db = admin.firestore();
    let query: Query = db.collection('tasks');

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
          [TaskPriority.CRITICAL]: 4,
          [TaskPriority.HIGH]: 3,
          [TaskPriority.MEDIUM]: 2,
          [TaskPriority.LOW]: 1
        };
        
        const snapshot = await query.get();
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          dueDate: doc.data().dueDate?.toDate(),
          comments: doc.data().comments || [],
        })) as Task[];
        
        return tasks.sort((a, b) => {
          const aOrder = priorityOrder[a.priority] || 0;
          const bOrder = priorityOrder[b.priority] || 0;
          return direction === 'desc' ? bOrder - aOrder : aOrder - bOrder;
        });
      } else {
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
    })) as Task[];
  }

  static async getTask(id: string): Promise<Task | null> {
    ensureInitialized();
    const db = admin.firestore();
    const doc = await db.collection('tasks').doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      dueDate: data.dueDate?.toDate(),
      comments: data.comments || [],
    } as Task;
  }

  static async createTask(taskData: CreateTask): Promise<Task> {
    ensureInitialized();
    const db = admin.firestore();
    const docRef = await db.collection('tasks').add({
      ...taskData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const doc = await docRef.get();
    const data = doc.data()!;
    
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      dueDate: data.dueDate?.toDate(),
      comments: data.comments || [],
    } as Task;
  }

  static async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    ensureInitialized();
    const db = admin.firestore();
    await db.collection('tasks').doc(taskId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found after update');
    }
    
    return task;
  }

  static async updateTask(taskId: string, updateData: UpdateTask): Promise<Task> {
    ensureInitialized();
    const db = admin.firestore();
    
    // Prepare update data with timestamp
    const updatePayload: any = {
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Handle date fields
    if (updateData.dueDate) {
      updatePayload.dueDate = admin.firestore.Timestamp.fromDate(updateData.dueDate);
    }
    
    await db.collection('tasks').doc(taskId).update(updatePayload);
    
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found after update');
    }
    
    return task;
  }

  static async updateProject(projectId: string, updateData: Partial<CreateProject>): Promise<Project> {
    ensureInitialized();
    const db = admin.firestore();
    
    await db.collection('projects').doc(projectId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found after update');
    }
    
    return project;
  }

  static async deleteTask(taskId: string): Promise<void> {
    ensureInitialized();
    const db = admin.firestore();
    await db.collection('tasks').doc(taskId).delete();
  }

  static async deleteProject(projectId: string): Promise<void> {
    ensureInitialized();
    const db = admin.firestore();
    await db.collection('projects').doc(projectId).delete();
  }

  static async addTaskComment(taskId: string, content: string, author: string): Promise<Task> {
    ensureInitialized();
    const db = admin.firestore();
    const comment = {
      id: db.collection('tasks').doc().id,
      content,
      author,
      createdAt: new Date(),
    };
    
    await db.collection('tasks').doc(taskId).update({
      comments: admin.firestore.FieldValue.arrayUnion(comment),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found after comment addition');
    }
    
    return task;
  }

  static async getNextTask(projectId?: string): Promise<Task | null> {
    ensureInitialized();
    const tasks = await this.getTasks({
      filters: {
        status: [TaskStatus.TODO],
        ...(projectId && { projectId }),
      },
      sortBy: 'priority',
      sortOrder: 'desc',
      limit: 1,
    });
    
    return tasks.length > 0 ? tasks[0] : null;
  }

  static async getTasksByFiles(filePaths: string[]): Promise<Task[]> {
    ensureInitialized();
    const db = admin.firestore();
    const tasks: Task[] = [];
    
    // Query tasks that have aiContext.codeFiles containing any of the file paths
    const snapshot = await db.collection('tasks').get();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const codeFiles = data.aiContext?.codeFiles || [];
      
      const hasMatchingFile = filePaths.some(filePath =>
        codeFiles.some((codeFile: string) =>
          codeFile.includes(filePath) || filePath.includes(codeFile)
        )
      );
      
      if (hasMatchingFile) {
        tasks.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate(),
          comments: data.comments || [],
        } as Task);
      }
    }
    
    return tasks;
  }

  // Test connection method
  static async testConnection(): Promise<boolean> {
    try {
      ensureInitialized();
      const db = admin.firestore();
      await db.collection('_test').limit(1).get();
      return true;
    } catch (error) {
      return false;
    }
  }
} 