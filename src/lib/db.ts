// Re-export Firebase service methods for backward compatibility
import { FirebaseService } from '../../cli/services/firebase';

export const ProjectService = {
  create: (data: any) => FirebaseService.createProject(data),
  getAll: () => FirebaseService.getProjects(),
  get: (id: string) => FirebaseService.getProject(id),
  update: (id: string, data: any) => FirebaseService.updateProject(id, data),
  delete: (id: string) => FirebaseService.deleteProject(id)
};

export const TaskService = {
  create: (data: any) => FirebaseService.createTask(data),
  getAll: (options?: any) => FirebaseService.getTasks(options),
  get: (id: string) => FirebaseService.getTask(id),
  update: (id: string, data: any) => FirebaseService.updateTask(id, data),
  delete: (id: string) => FirebaseService.deleteTask(id)
};

export const AITaskService = {
  getTasksForAI: (options?: any) => FirebaseService.getTasks(options),
  getNextTask: (projectId?: string) => FirebaseService.getNextTask(projectId),
  getTasksByFiles: (filePaths: string[]) => FirebaseService.getTasksByFiles(filePaths)
}; 