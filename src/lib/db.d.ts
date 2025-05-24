import { Task, Project, CreateTask, UpdateTask, CreateProject, UpdateProject, TaskQueryOptions } from '@/types/task';
import './firebase-admin';
export declare class ProjectService {
    private static collection;
    static create(projectData: CreateProject): Promise<Project>;
    static getAll(): Promise<Project[]>;
    static get(id: string): Promise<Project | null>;
    static update(id: string, updateData: UpdateProject): Promise<Project>;
    static delete(id: string): Promise<void>;
}
export declare class TaskService {
    private static collection;
    static create(taskData: CreateTask): Promise<Task>;
    static getAll(options?: TaskQueryOptions): Promise<Task[]>;
    static get(id: string): Promise<Task | null>;
    static update(id: string, updateData: UpdateTask): Promise<Task>;
    static delete(id: string): Promise<void>;
}
export declare class AITaskService {
    static getTasksForAI(projectId?: string): Promise<Task[]>;
    static getNextTask(projectId?: string): Promise<Task | null>;
    static getTasksByFiles(filePaths: string[]): Promise<Task[]>;
}
//# sourceMappingURL=db.d.ts.map