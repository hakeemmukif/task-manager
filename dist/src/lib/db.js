"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITaskService = exports.TaskService = exports.ProjectService = void 0;
// Re-export Firebase service methods for backward compatibility
const firebase_1 = require("../../cli/services/firebase");
exports.ProjectService = {
    create: (data) => firebase_1.FirebaseService.createProject(data),
    getAll: () => firebase_1.FirebaseService.getProjects(),
    get: (id) => firebase_1.FirebaseService.getProject(id),
    update: (id, data) => firebase_1.FirebaseService.updateProject(id, data),
    delete: (id) => firebase_1.FirebaseService.deleteProject(id)
};
exports.TaskService = {
    create: (data) => firebase_1.FirebaseService.createTask(data),
    getAll: (options) => firebase_1.FirebaseService.getTasks(options),
    get: (id) => firebase_1.FirebaseService.getTask(id),
    update: (id, data) => firebase_1.FirebaseService.updateTask(id, data),
    delete: (id) => firebase_1.FirebaseService.deleteTask(id)
};
exports.AITaskService = {
    getTasksForAI: (options) => firebase_1.FirebaseService.getTasks(options),
    getNextTask: (projectId) => firebase_1.FirebaseService.getNextTask(projectId),
    getTasksByFiles: (filePaths) => firebase_1.FirebaseService.getTasksByFiles(filePaths)
};
