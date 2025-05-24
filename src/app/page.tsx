'use client';

import { useEffect, useState } from 'react';
import { Task, Project, TaskStatus, TaskPriority } from '@/types/task';
import { fetchWithAuth } from '@/lib/api';

interface DashboardStats {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  doneTasks: number;
  blockedTasks: number;
  criticalTasks: number;
  highPriorityTasks: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    doneTasks: 0,
    blockedTasks: 0,
    criticalTasks: 0,
    highPriorityTasks: 0,
  });
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [tasksData, projectsData] = await Promise.all([
        fetchWithAuth('/api/tasks'),
        fetchWithAuth('/api/projects'),
      ]);

      if (tasksData.success) {
        const tasks: Task[] = tasksData.data;
        
        // Calculate stats
        const newStats: DashboardStats = {
          totalTasks: tasks.length,
          todoTasks: tasks.filter(t => t.status === TaskStatus.TODO).length,
          inProgressTasks: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
          doneTasks: tasks.filter(t => t.status === TaskStatus.DONE).length,
          blockedTasks: tasks.filter(t => t.status === TaskStatus.BLOCKED).length,
          criticalTasks: tasks.filter(t => t.priority === TaskPriority.CRITICAL).length,
          highPriorityTasks: tasks.filter(t => t.priority === TaskPriority.HIGH).length,
        };
        
        setStats(newStats);
        
        // Get next task (highest priority, not done)
        const pendingTasks = tasks.filter(t => 
          t.status === TaskStatus.TODO || 
          t.status === TaskStatus.IN_PROGRESS || 
          t.status === TaskStatus.BLOCKED
        );
        
        if (pendingTasks.length > 0) {
          // Sort by priority weight
          const priorityWeights = {
            [TaskPriority.CRITICAL]: 4,
            [TaskPriority.HIGH]: 3,
            [TaskPriority.MEDIUM]: 2,
            [TaskPriority.LOW]: 1,
          };
          
          pendingTasks.sort((a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]);
          setNextTask(pendingTasks[0]);
        }
        
        // Get recent tasks (last 5 updated)
        const sortedTasks = [...tasks].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setRecentTasks(sortedTasks.slice(0, 5));
      }

      if (projectsData.success) {
        setProjects(projectsData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 'text-red-600 bg-red-100';
      case TaskPriority.HIGH:
        return 'text-orange-600 bg-orange-100';
      case TaskPriority.MEDIUM:
        return 'text-yellow-600 bg-yellow-100';
      case TaskPriority.LOW:
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AI Task Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage your development tasks efficiently with AI-powered insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Tasks</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">⏳</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.inProgressTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">✅</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.doneTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">🚨</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Critical</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.criticalTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Next Task for AI */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Next Task for AI</h2>
            <p className="text-sm text-gray-500">Highest priority task to work on</p>
          </div>
          <div className="p-6">
            {nextTask ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{nextTask.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{nextTask.description}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(nextTask.priority)}`}>
                    {nextTask.priority.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(nextTask.status)}`}>
                    {nextTask.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                {nextTask.aiContext && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900">AI Context</h4>
                    {nextTask.aiContext.codeFiles && nextTask.aiContext.codeFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-700">Files: {nextTask.aiContext.codeFiles.join(', ')}</p>
                      </div>
                    )}
                    {nextTask.aiContext.commands && nextTask.aiContext.commands.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-blue-700">Commands: {nextTask.aiContext.commands.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                    Start Working
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No pending tasks found. Great job!</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-500">Recently updated tasks</p>
          </div>
          <div className="p-6">
            {recentTasks.length > 0 ? (
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        Updated {new Date(task.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* CLI Instructions */}
      <div className="mt-8 bg-gray-900 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">🖥️ CLI Quick Commands</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-300 mb-2">Get next task:</p>
            <code className="bg-gray-800 text-green-400 px-3 py-1 rounded">ai-tasks ai next</code>
          </div>
          <div>
            <p className="text-gray-300 mb-2">List all tasks:</p>
            <code className="bg-gray-800 text-green-400 px-3 py-1 rounded">ai-tasks task list</code>
          </div>
          <div>
            <p className="text-gray-300 mb-2">Create new task:</p>
            <code className="bg-gray-800 text-green-400 px-3 py-1 rounded">ai-tasks task create</code>
          </div>
          <div>
            <p className="text-gray-300 mb-2">Show overview:</p>
            <code className="bg-gray-800 text-green-400 px-3 py-1 rounded">ai-tasks ai overview</code>
          </div>
        </div>
      </div>
    </div>
  );
} 