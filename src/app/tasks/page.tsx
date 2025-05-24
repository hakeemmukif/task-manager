'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Task, Project, TaskStatus, TaskPriority, TaskType } from '@/types/task';
import { fetchWithAuth } from '@/lib/api';

interface TaskFilters {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  projectId: string | 'all';
  search: string;
}

export default function TasksPage() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    projectId: searchParams.get('projectId') || 'all',
    search: '',
  });
  const [sortBy, setSortBy] = useState<'priority' | 'status' | 'created' | 'updated'>('priority');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    projectId: '',
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    type: TaskType.FEATURE,
    aiContext: {
      codeFiles: [] as string[],
      commands: [] as string[],
      dependencies: [] as string[],
      notes: '',
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [tasksRes, projectsRes] = await Promise.all([
        fetchWithAuth('/api/tasks'),
        fetchWithAuth('/api/projects'),
      ]);

      if (tasksRes.success) {
        console.log('Fetched tasks:', tasksRes.data);
        setTasks(tasksRes.data);
      }
      
      if (projectsRes.success) {
        setProjects(projectsRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];
    console.log('Applying filters to tasks:', filtered);
    console.log('Tasks with IN_PROGRESS status:', filtered.filter(t => t.status === TaskStatus.IN_PROGRESS));

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    
    if (filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }
    
    if (filters.projectId !== 'all') {
      filtered = filtered.filter(task => task.projectId === filters.projectId);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const priorityWeights = {
      [TaskPriority.CRITICAL]: 4,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.LOW]: 1,
    };

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return priorityWeights[b.priority] - priorityWeights[a.priority];
        case 'status':
          return a.status.localeCompare(b.status);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });
      
      if (data.success) {
        setShowCreateForm(false);
        setNewTask({
          title: '',
          description: '',
          projectId: '',
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.TODO,
          type: TaskType.FEATURE,
          aiContext: {
            codeFiles: [],
            commands: [],
            dependencies: [],
            notes: '',
          },
        });
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTask) return;
    
    try {
      const data = await fetchWithAuth(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          priority: editingTask.priority,
          status: editingTask.status,
          type: editingTask.type,
          projectId: editingTask.projectId,
          aiContext: editingTask.aiContext,
        }),
      });
      
      if (data.success) {
        setShowEditForm(false);
        setEditingTask(null);
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const data = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (data.success) {
        // Update the task in the local state immediately for better UX
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId 
              ? { ...task, status: newStatus, updatedAt: new Date() }
              : task
          )
        );
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask({ ...task });
    setShowEditForm(true);
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 'text-red-600 bg-red-100 border-red-200';
      case TaskPriority.HIGH:
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case TaskPriority.MEDIUM:
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case TaskPriority.LOW:
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'text-gray-600 bg-gray-100';
      case TaskStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-100';
      case TaskStatus.IN_REVIEW:
        return 'text-yellow-600 bg-yellow-100';
      case TaskStatus.DONE:
        return 'text-green-600 bg-green-100';
      case TaskStatus.BLOCKED:
        return 'text-red-600 bg-red-100';
      case TaskStatus.CANCELLED:
        return 'text-gray-500 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-2 text-gray-600">
            Manage and track your development tasks
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          New Task
        </button>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Search tasks..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as TaskStatus | 'all' })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.IN_REVIEW}>In Review</option>
              <option value={TaskStatus.DONE}>Done</option>
              <option value={TaskStatus.BLOCKED}>Blocked</option>
              <option value={TaskStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value as TaskPriority | 'all' })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value={TaskPriority.CRITICAL}>Critical</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.LOW}>Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'status' | 'created' | 'updated')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="created">Created Date</option>
              <option value="updated">Updated Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    required
                    minLength={10}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Task description (minimum 10 characters)"
                  />
                  {newTask.description.length > 0 && newTask.description.length < 10 && (
                    <p className="mt-1 text-sm text-red-600">
                      Description must be at least 10 characters long
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project</label>
                    <select
                      required
                      value={newTask.projectId}
                      onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select Project</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value={TaskPriority.LOW}>Low</option>
                      <option value={TaskPriority.MEDIUM}>Medium</option>
                      <option value={TaskPriority.HIGH}>High</option>
                      <option value={TaskPriority.CRITICAL}>Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value={TaskType.FEATURE}>Feature</option>
                      <option value={TaskType.BUG}>Bug</option>
                      <option value={TaskType.IMPROVEMENT}>Improvement</option>
                      <option value={TaskType.DOCUMENTATION}>Documentation</option>
                      <option value={TaskType.REFACTOR}>Refactor</option>
                      <option value={TaskType.TESTING}>Testing</option>
                      <option value={TaskType.DEPLOYMENT}>Deployment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value={TaskStatus.TODO}>To Do</option>
                      <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                      <option value={TaskStatus.IN_REVIEW}>In Review</option>
                      <option value={TaskStatus.BLOCKED}>Blocked</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">AI Context - Code Files</label>
                  <input
                    type="text"
                    value={newTask.aiContext.codeFiles.join(', ')}
                    onChange={(e) => setNewTask({ 
                      ...newTask, 
                      aiContext: { 
                        ...newTask.aiContext, 
                        codeFiles: e.target.value.split(',').map(f => f.trim()).filter(f => f) 
                      } 
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="src/components/Button.tsx, src/utils/helpers.ts"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">AI Context - Commands</label>
                  <input
                    type="text"
                    value={newTask.aiContext.commands.join(', ')}
                    onChange={(e) => setNewTask({ 
                      ...newTask, 
                      aiContext: { 
                        ...newTask.aiContext, 
                        commands: e.target.value.split(',').map(c => c.trim()).filter(c => c) 
                      } 
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="npm test, npm run build"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditForm && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Task</h2>
            <form onSubmit={handleEditTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project</label>
                  <select
                    required
                    value={editingTask.projectId}
                    onChange={(e) => setEditingTask({ ...editingTask, projectId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                    <option value={TaskPriority.CRITICAL}>Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={TaskStatus.TODO}>To Do</option>
                    <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                    <option value={TaskStatus.IN_REVIEW}>In Review</option>
                    <option value={TaskStatus.DONE}>Done</option>
                    <option value={TaskStatus.BLOCKED}>Blocked</option>
                    <option value={TaskStatus.CANCELLED}>Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={editingTask.type}
                    onChange={(e) => setEditingTask({ ...editingTask, type: e.target.value as TaskType })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value={TaskType.FEATURE}>Feature</option>
                    <option value={TaskType.BUG}>Bug</option>
                    <option value={TaskType.IMPROVEMENT}>Improvement</option>
                    <option value={TaskType.DOCUMENTATION}>Documentation</option>
                    <option value={TaskType.REFACTOR}>Refactor</option>
                    <option value={TaskType.TESTING}>Testing</option>
                    <option value={TaskType.DEPLOYMENT}>Deployment</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">AI Context - Code Files</label>
                <input
                  type="text"
                  value={editingTask.aiContext?.codeFiles?.join(', ') || ''}
                  onChange={(e) => setEditingTask({ 
                    ...editingTask, 
                    aiContext: { 
                      codeFiles: e.target.value.split(',').map(f => f.trim()).filter(f => f),
                      commands: editingTask.aiContext?.commands || [],
                      testCriteria: editingTask.aiContext?.testCriteria || [],
                      references: editingTask.aiContext?.references || []
                    } 
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="src/components/Button.tsx, src/utils/helpers.ts"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">AI Context - Commands</label>
                <input
                  type="text"
                  value={editingTask.aiContext?.commands?.join(', ') || ''}
                  onChange={(e) => setEditingTask({ 
                    ...editingTask, 
                    aiContext: { 
                      codeFiles: editingTask.aiContext?.codeFiles || [],
                      commands: e.target.value.split(',').map(c => c.trim()).filter(c => c),
                      testCriteria: editingTask.aiContext?.testCriteria || [],
                      references: editingTask.aiContext?.references || []
                    } 
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="npm test, npm run build"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div key={task.id} className={`bg-white rounded-lg shadow border-l-4 ${getPriorityColor(task.priority)}`}>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 mb-3">{task.description}</p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span>📁 {getProjectName(task.projectId)}</span>
                      <span>📅 Created {new Date(task.createdAt).toLocaleDateString()}</span>
                      <span>🔄 Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                    </div>

                    {task.aiContext && (task.aiContext.codeFiles.length > 0 || task.aiContext.commands.length > 0) && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">AI Context</h4>
                        {task.aiContext.codeFiles.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-blue-700 font-medium">Files: </span>
                            <span className="text-xs text-blue-600">{task.aiContext.codeFiles.join(', ')}</span>
                          </div>
                        )}
                        {task.aiContext.commands.length > 0 && (
                          <div>
                            <span className="text-xs text-blue-700 font-medium">Commands: </span>
                            <span className="text-xs text-blue-600">{task.aiContext.commands.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6 flex flex-col space-y-2">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
                    >
                      <option value={TaskStatus.TODO}>To Do</option>
                      <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                      <option value={TaskStatus.IN_REVIEW}>In Review</option>
                      <option value={TaskStatus.DONE}>Done</option>
                      <option value={TaskStatus.BLOCKED}>Blocked</option>
                      <option value={TaskStatus.CANCELLED}>Cancelled</option>
                    </select>
                    <button 
                      onClick={() => openEditModal(task)}
                      className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-300 rounded-md hover:bg-blue-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4 font-semibold">No Tasks</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-6">
              {tasks.length === 0 
                ? "Create your first task to get started" 
                : "Try adjusting your filters to see more tasks"
              }
            </p>
            {tasks.length === 0 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Create Your First Task
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task Summary */}
      {filteredTasks.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Task Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{filteredTasks.length}</div>
              <div className="text-sm text-gray-600">Showing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {filteredTasks.filter(t => t.status === TaskStatus.TODO).length}
              </div>
              <div className="text-sm text-gray-600">To Do</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {filteredTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredTasks.filter(t => t.status === TaskStatus.DONE).length}
              </div>
              <div className="text-sm text-gray-600">Done</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredTasks.filter(t => t.status === TaskStatus.BLOCKED).length}
              </div>
              <div className="text-sm text-gray-600">Blocked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredTasks.filter(t => t.priority === TaskPriority.CRITICAL).length}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 