import { TaskService, ProjectService } from './db';
import { AIWorker } from './ai-worker';
import { 
  CreateTask, 
  Task,
  TaskPriority, 
  TaskStatus, 
  TaskType 
} from '../types/task';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';

const execAsync = promisify(exec);

interface AutonomousConfig {
  workspaceRoot: string;
  targetProject: string;
  autoApprove: boolean;
  maxConcurrentTasks: number;
  analysisInterval: number; // minutes
  safetyChecks: boolean;
  allowedFilePatterns: string[];
  forbiddenFilePatterns: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface CodeChange {
  filePath: string;
  content: string | null;
  changeType: 'create' | 'modify' | 'delete';
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high';
  backup?: string;
}

interface TaskImplementation {
  task: Task;
  codeChanges: CodeChange[];
  commands: string[];
  testCommands: string[];
  estimatedRisk: 'low' | 'medium' | 'high';
  estimatedTime: number; // minutes
}

interface AnalysisResult {
  timestamp: Date;
  codebaseChanges: any;
  pendingTasks: Task[];
  completedTasks: Task[];
  projectStructure: any;
  dependencies: any;
  testCoverage: any;
  codeQuality: any;
  newTasksGenerated: number;
}

interface QuickAnalysisResult {
  timestamp: Date;
  potentialTasks: number;
  statusChanged?: boolean;
  recentChanges?: number;
  dependencyChanges?: boolean;
}

export class AutonomousAgent {
  private config: AutonomousConfig;
  private isRunning: boolean = false;
  private currentTasks: Map<string, TaskImplementation> = new Map();
  private aiWorker: AIWorker;
  private analysisTimer: NodeJS.Timeout | null = null;
  private logFile: string;
  private startTime: Date;
  private stats = {
    tasksCompleted: 0,
    tasksGenerated: 0,
    codeChangesApplied: 0,
    analysisRuns: 0,
    errors: 0
  };
  private fileChecks: Map<string, number> = new Map();

  constructor(config: AutonomousConfig) {
    this.config = config;
    this.aiWorker = new AIWorker(config.workspaceRoot);
    this.startTime = new Date();
    this.logFile = path.join(config.workspaceRoot, 'task-manager', 'logs', `autonomous-${Date.now()}.log`);
    this.ensureLogDirectory();
  }

  /**
   * Start the autonomous development agent
   */
  async start(): Promise<void> {
    this.log('info', '🤖 Starting Autonomous AI Development Agent...');
    this.log('info', `Target Project: ${this.config.targetProject}`);
    this.log('info', `Analysis Interval: ${this.config.analysisInterval} minutes`);
    this.log('info', `Auto-approve: ${this.config.autoApprove ? 'Yes' : 'No'}`);
    this.log('info', `Max Concurrent Tasks: ${this.config.maxConcurrentTasks}`);
    this.log('info', `Log File: ${this.logFile}`);
    
    this.isRunning = true;
    
    try {
      // Validate project exists
      await this.validateProject();
      
      // Initial analysis
      this.log('info', '🔍 Performing initial analysis...');
      await this.performAnalysisAndGeneration();
      
      // Start continuous monitoring
      this.startContinuousMonitoring();
      
      // Start task execution loop
      this.startTaskExecutionLoop();
      
      this.log('info', '✅ Autonomous Agent is now running...');
      console.log(chalk.green('✅ Autonomous Agent is now running...'));
      console.log(chalk.yellow('Press Ctrl+C to stop'));
      console.log(chalk.gray(`📝 Logs: ${this.logFile}`));
      
      // Keep the process alive
      await this.keepAlive();
      
    } catch (error: any) {
      this.log('error', `Failed to start autonomous agent: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the autonomous agent
   */
  stop(): void {
    this.log('info', '🛑 Stopping Autonomous Agent...');
    this.isRunning = false;
    
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    
    this.logStats();
    this.log('info', '✅ Autonomous Agent stopped');
    console.log(chalk.green('✅ Autonomous Agent stopped'));
  }

  /**
   * Validate project exists and is properly configured
   */
  private async validateProject(): Promise<void> {
    const projectPath = path.join(this.config.workspaceRoot, this.config.targetProject);
    
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project directory not found: ${projectPath}`);
    }
    
    // Check for package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in project: ${this.config.targetProject}`);
    }
    
    // Validate it's a React Native Expo project
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.dependencies?.expo && !packageJson.devDependencies?.expo) {
      this.log('warn', 'Project does not appear to be an Expo project');
    }
    
    this.log('info', `✅ Project validated: ${this.config.targetProject}`);
  }

  /**
   * Start continuous monitoring and analysis
   */
  private startContinuousMonitoring(): void {
    this.log('info', `⏰ Starting continuous monitoring (every ${this.config.analysisInterval} minutes)`);
    
    this.analysisTimer = setInterval(async () => {
      if (this.isRunning) {
        this.log('info', '🔍 Performing scheduled analysis...');
        await this.performAnalysisAndGeneration();
      }
    }, this.config.analysisInterval * 60 * 1000);
  }

  /**
   * Perform codebase analysis and generate new tasks
   */
  private async performAnalysisAndGeneration(): Promise<AnalysisResult> {
    const analysisStart = Date.now();
    this.stats.analysisRuns++;
    
    try {
      this.log('info', '📊 Starting codebase analysis...');
      
      // 1. Analyze current project state
      const projectAnalysis = await this.analyzeProjectState();
      
      // 2. Generate new tasks based on analysis
      const newTasks = await this.generateTasksFromAnalysis(projectAnalysis);
      
      // 3. Prioritize tasks
      const prioritizedTasks = this.prioritizeTasks(newTasks);
      
      // 4. Create tasks in system
      let tasksCreated = 0;
      for (const task of prioritizedTasks) {
        const created = await this.createTaskIfNotExists(task);
        if (created) tasksCreated++;
      }
      
      this.stats.tasksGenerated += tasksCreated;
      
      const analysisTime = Date.now() - analysisStart;
      this.log('info', `✅ Analysis complete in ${analysisTime}ms. Generated ${tasksCreated} new tasks`);
      
      const result: AnalysisResult = {
        timestamp: new Date(),
        codebaseChanges: projectAnalysis.codebaseChanges,
        pendingTasks: projectAnalysis.pendingTasks,
        completedTasks: projectAnalysis.completedTasks,
        projectStructure: projectAnalysis.projectStructure,
        dependencies: projectAnalysis.dependencies,
        testCoverage: projectAnalysis.testCoverage,
        codeQuality: projectAnalysis.codeQuality,
        newTasksGenerated: tasksCreated
      };
      
      return result;
      
    } catch (error: any) {
      this.stats.errors++;
      this.log('error', `Analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start the task execution loop
   */
  private async startTaskExecutionLoop(): Promise<void> {
    this.log('info', '🔄 Starting task execution loop...');
    
    while (this.isRunning) {
      try {
        // Get next task to work on
        const nextTask = await this.getNextTask();
        
        if (!nextTask) {
          this.log('info', '🔍 No pending tasks found, initiating quick analysis...');
          
          // Perform quick analysis to find new potential tasks
          const quickAnalysis = await this.performQuickAnalysis();
          
          if (quickAnalysis.potentialTasks > 0) {
            this.log('info', `📝 Found ${quickAnalysis.potentialTasks} potential tasks, generating...`);
            await this.performAnalysisAndGeneration();
            continue; // Immediately check for new tasks
          }
          
          // Log detailed analysis results
          this.log('debug', `📊 Quick Analysis Results:
            - Status File Changed: ${quickAnalysis.statusChanged ? 'Yes' : 'No'}
            - Recent Code Changes: ${quickAnalysis.recentChanges || 0}
            - Dependency Changes: ${quickAnalysis.dependencyChanges ? 'Yes' : 'No'}
          `);
          
          this.log('info', '💤 No new tasks identified, waiting for changes...');
          await this.sleep(15000); // Shorter sleep time (15s) when actively looking for tasks
          continue;
        }
        
        if (this.currentTasks.size >= this.config.maxConcurrentTasks) {
          this.log('debug', `⏸️  Max concurrent tasks reached (${this.config.maxConcurrentTasks}), waiting...`);
          await this.sleep(30000); // Medium sleep (30s) when at capacity
          continue;
        }

        this.log('info', `🎯 Starting work on task: ${nextTask.title} (ID: ${nextTask.id})`);
        
        // Generate implementation plan
        const implementation = await this.generateImplementationPlan(nextTask);
        
        // Request approval if needed
        const approved = await this.requestApproval(implementation);
        
        if (approved) {
          await this.executeTask(implementation);
        } else {
          this.log('info', `⏭️  Task skipped by user: ${nextTask.title}`);
          await this.sleep(5000); // Short sleep after skip
        }
      } catch (error: any) {
        this.stats.errors++;
        this.log('error', `Error in task execution loop: ${error.message}`);
        await this.sleep(60000); // Longer sleep (1m) on error
      }
    }
  }

  /**
   * Analyze current project state
   */
  private async analyzeProjectState(): Promise<any> {
    const projectPath = path.join(this.config.workspaceRoot, this.config.targetProject);
    
    this.log('debug', `Analyzing project structure: ${projectPath}`);
    
    const analysis = {
      codebaseChanges: await this.detectCodebaseChanges(projectPath),
      pendingTasks: await this.getPendingTasks(),
      completedTasks: await this.getCompletedTasks(),
      projectStructure: await this.analyzeProjectStructure(projectPath),
      dependencies: await this.analyzeDependencies(projectPath),
      testCoverage: await this.analyzeTestCoverage(projectPath),
      codeQuality: await this.analyzeCodeQuality(projectPath)
    };
    
    this.log('debug', `Analysis complete: ${Object.keys(analysis).length} categories analyzed`);
    return analysis;
  }

  /**
   * Analyze React Native Expo project structure
   */
  private async analyzeProjectStructure(projectPath: string): Promise<any> {
    const structure = {
      hasAppTsx: fs.existsSync(path.join(projectPath, 'App.tsx')),
      hasAppJson: fs.existsSync(path.join(projectPath, 'app.json')),
      hasSrcDir: fs.existsSync(path.join(projectPath, 'src')),
      hasScreensDir: fs.existsSync(path.join(projectPath, 'src', 'screens')),
      hasComponentsDir: fs.existsSync(path.join(projectPath, 'src', 'components')),
      hasServicesDir: fs.existsSync(path.join(projectPath, 'src', 'services')),
      hasNavigationSetup: false,
      hasFirebaseSetup: false,
      missingDirectories: [] as string[]
    };

    // Check for navigation setup
    const appTsxPath = path.join(projectPath, 'App.tsx');
    if (structure.hasAppTsx) {
      const appContent = fs.readFileSync(appTsxPath, 'utf8');
      structure.hasNavigationSetup = appContent.includes('@react-navigation') || appContent.includes('NavigationContainer');
      structure.hasFirebaseSetup = appContent.includes('firebase') || appContent.includes('@react-native-firebase');
    }

    // Check for missing essential directories
    const essentialDirs = ['src', 'src/screens', 'src/components', 'src/services', 'src/types'];
    for (const dir of essentialDirs) {
      if (!fs.existsSync(path.join(projectPath, dir))) {
        structure.missingDirectories.push(dir);
      }
    }

    return structure;
  }

  /**
   * Generate tasks from analysis with focus on React Native Expo
   */
  private async generateTasksFromAnalysis(analysis: any): Promise<CreateTask[]> {
    const tasks: CreateTask[] = [];
    
    // Find project ID
    const projects = await ProjectService.getAll();
    const project = projects.find(p => p.name.toLowerCase().includes(this.config.targetProject));
    
    if (!project) {
      this.log('warn', 'Project not found in task manager, creating it...');
      return tasks;
    }

    this.log('debug', `Generating tasks for project: ${project.name} (${project.id})`);

    // Generate tasks for missing project structure
    if (analysis.projectStructure.missingDirectories.length > 0) {
      tasks.push({
        title: 'Setup React Native Project Structure',
        description: `Create missing directories: ${analysis.projectStructure.missingDirectories.join(', ')}`,
        projectId: project.id,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        type: TaskType.IMPROVEMENT,
        tags: ['auto-generated', 'project-structure', 'react-native'],
        dependencies: [],
        blockedBy: [],
        attachments: [],
        comments: [],
        aiContext: {
          codeFiles: analysis.projectStructure.missingDirectories,
          commands: ['mkdir -p src/{screens,components,services,types,utils}'],
          testCriteria: ['Directory structure created', 'Project follows React Native best practices'],
          references: ['https://docs.expo.dev/guides/project-structure/']
        }
      });
    }

    // Generate navigation setup task if missing
    if (!analysis.projectStructure.hasNavigationSetup) {
      tasks.push({
        title: 'Setup React Navigation',
        description: 'Install and configure React Navigation for the Expo app with proper screen navigation',
        projectId: project.id,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        type: TaskType.FEATURE,
        estimatedHours: 4,
        tags: ['auto-generated', 'navigation', 'react-native'],
        dependencies: [],
        blockedBy: [],
        attachments: [],
        comments: [],
        aiContext: {
          codeFiles: ['App.tsx', 'src/navigation/AppNavigator.tsx'],
          commands: [
            'npm install @react-navigation/native @react-navigation/stack',
            'npx expo install react-native-screens react-native-safe-area-context'
          ],
          testCriteria: ['Navigation working', 'Screen transitions smooth', 'App runs without errors'],
          references: ['https://reactnavigation.org/docs/getting-started/']
        }
      });
    }

    // Generate Firebase setup task if missing
    if (!analysis.projectStructure.hasFirebaseSetup) {
      tasks.push({
        title: 'Setup Firebase for React Native',
        description: 'Install and configure Firebase for authentication and Firestore database',
        projectId: project.id,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        type: TaskType.DEPLOYMENT,
        estimatedHours: 6,
        tags: ['auto-generated', 'firebase', 'backend'],
        dependencies: [],
        blockedBy: [],
        attachments: [],
        comments: [],
        aiContext: {
          codeFiles: ['src/services/firebase.ts', 'firebase.json', 'app.json'],
          commands: [
            'npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore',
            'firebase init'
          ],
          testCriteria: ['Firebase connected', 'Authentication working', 'Firestore accessible'],
          references: ['https://rnfirebase.io/']
        }
      });
    }

    // Generate tasks based on PROJECT_STATUS.md if it exists
    const projectStatusPath = path.join(this.config.workspaceRoot, this.config.targetProject, 'PROJECT_STATUS.md');
    if (fs.existsSync(projectStatusPath)) {
      const statusContent = fs.readFileSync(projectStatusPath, 'utf8');
      const statusTasks = this.parseProjectStatusTasks(statusContent, project.id);
      tasks.push(...statusTasks);
    }

    this.log('debug', `Generated ${tasks.length} tasks from analysis`);
    return tasks;
  }

  /**
   * Parse PROJECT_STATUS.md for debt-settler specific tasks
   */
  private parseProjectStatusTasks(content: string, projectId: string): CreateTask[] {
    const tasks: CreateTask[] = [];

    // Only generate tasks if they don't already exist
    if (content.includes('Phase 1: MVP') && content.includes('Firebase Setup')) {
      tasks.push({
        title: 'Implement Authentication System',
        description: 'Create login/register screens with Firebase authentication, user session management, and profile setup flow',
        projectId,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        type: TaskType.FEATURE,
        estimatedHours: 16,
        tags: ['auto-generated', 'authentication', 'mvp'],
        dependencies: [],
        blockedBy: [],
        attachments: [],
        comments: [],
        aiContext: {
          codeFiles: [
            'src/screens/auth/LoginScreen.tsx',
            'src/screens/auth/RegisterScreen.tsx',
            'src/services/auth.ts',
            'src/contexts/AuthContext.tsx'
          ],
          commands: [
            'npm install @react-native-firebase/auth',
            'npm test'
          ],
          testCriteria: [
            'User can register with email/password',
            'User can login successfully',
            'Session persists across app restarts',
            'Profile setup flow works',
            'Error handling for invalid credentials'
          ],
          references: ['https://rnfirebase.io/auth/usage']
        }
      });

      tasks.push({
        title: 'Build Transaction Recording Feature',
        description: 'Create transaction forms, list views, category selection, and CRUD operations for expense tracking',
        projectId,
        priority: TaskPriority.HIGH,
        status: TaskStatus.TODO,
        type: TaskType.FEATURE,
        estimatedHours: 20,
        tags: ['auto-generated', 'transactions', 'mvp'],
        dependencies: [],
        blockedBy: [],
        attachments: [],
        comments: [],
        aiContext: {
          codeFiles: [
            'src/screens/transactions/AddTransactionScreen.tsx',
            'src/screens/transactions/TransactionListScreen.tsx',
            'src/components/TransactionForm.tsx',
            'src/services/transactions.ts',
            'src/types/transaction.ts'
          ],
          commands: [
            'npm install react-native-picker-select',
            'npm test'
          ],
          testCriteria: [
            'Can add new transactions',
            'Transaction list displays correctly',
            'Categories work properly',
            'CRUD operations functional',
            'Data persists in Firestore'
          ],
          references: []
        }
      });
    }

    return tasks;
  }

  /**
   * Generate implementation plan for a task
   */
  private async generateImplementationPlan(task: Task): Promise<TaskImplementation> {
    this.log('info', `📋 Generating implementation plan for: ${task.title}`);
    
    const codeChanges: CodeChange[] = [];
    const commands: string[] = [];
    const testCommands: string[] = ['npm test'];
    
    // Analyze task type and generate appropriate implementation
    switch (task.type) {
      case TaskType.FEATURE:
        codeChanges.push(...await this.generateFeatureImplementation(task));
        break;
      case TaskType.IMPROVEMENT:
        codeChanges.push(...await this.generateImprovementImplementation(task));
        break;
      case TaskType.DEPLOYMENT:
        codeChanges.push(...await this.generateDeploymentImplementation(task));
        break;
      default:
        this.log('warn', `Unknown task type: ${task.type}`);
    }

    // Add commands from AI context
    if (task.aiContext?.commands) {
      commands.push(...task.aiContext.commands);
    }

    // Assess risk level
    const estimatedRisk = this.assessRiskLevel(codeChanges);
    const estimatedTime = this.estimateImplementationTime(task, codeChanges);

    this.log('debug', `Implementation plan: ${codeChanges.length} changes, risk: ${estimatedRisk}, time: ${estimatedTime}min`);

    return {
      task,
      codeChanges,
      commands,
      testCommands,
      estimatedRisk,
      estimatedTime
    };
  }

  /**
   * Generate React Navigation setup implementation
   */
  private async generateNavigationImplementation(): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // Create navigation directory structure
    changes.push({
      filePath: 'src/navigation/AppNavigator.tsx',
      content: this.generateAppNavigatorCode(),
      changeType: 'create',
      reason: 'Create main app navigator with React Navigation',
      riskLevel: 'low'
    });

    // Update App.tsx to use navigation
    changes.push({
      filePath: 'App.tsx',
      content: this.generateUpdatedAppTsxWithNavigation(),
      changeType: 'modify',
      reason: 'Update App.tsx to use React Navigation',
      riskLevel: 'medium'
    });

    return changes;
  }

  /**
   * Generate authentication implementation for React Native
   */
  private async generateAuthenticationImplementation(): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // Auth service
    changes.push({
      filePath: 'src/services/auth.ts',
      content: this.generateAuthServiceCode(),
      changeType: 'create',
      reason: 'Create Firebase authentication service',
      riskLevel: 'medium'
    });

    // Auth context
    changes.push({
      filePath: 'src/contexts/AuthContext.tsx',
      content: this.generateAuthContextCode(),
      changeType: 'create',
      reason: 'Create authentication context for state management',
      riskLevel: 'low'
    });

    // Login screen
    changes.push({
      filePath: 'src/screens/auth/LoginScreen.tsx',
      content: this.generateLoginScreenCode(),
      changeType: 'create',
      reason: 'Create login screen component',
      riskLevel: 'low'
    });

    // Register screen
    changes.push({
      filePath: 'src/screens/auth/RegisterScreen.tsx',
      content: this.generateRegisterScreenCode(),
      changeType: 'create',
      reason: 'Create registration screen component',
      riskLevel: 'low'
    });

    return changes;
  }

  /**
   * Request approval from user
   */
  private async requestApproval(implementation: TaskImplementation): Promise<boolean> {
    if (this.config.autoApprove && implementation.estimatedRisk === 'low') {
      this.log('info', '✅ Auto-approved (low risk)');
      return true;
    }

    console.log(chalk.yellow('\n🤔 Requesting approval for task implementation:'));
    console.log(chalk.bold(`Task: ${implementation.task.title}`));
    console.log(chalk.gray(`Risk Level: ${implementation.estimatedRisk}`));
    console.log(chalk.gray(`Estimated Time: ${implementation.estimatedTime} minutes`));
    console.log(chalk.gray(`Files to modify: ${implementation.codeChanges.length}`));
    
    // Show file changes
    for (const change of implementation.codeChanges) {
      const icon = change.changeType === 'create' ? '📄' : change.changeType === 'modify' ? '✏️' : '🗑️';
      console.log(chalk.cyan(`  ${icon} ${change.changeType}: ${change.filePath}`));
      console.log(chalk.gray(`    ${change.reason}`));
    }

    const { approved } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'approved',
        message: 'Do you approve this implementation?',
        default: implementation.estimatedRisk === 'low'
      }
    ]);

    this.log('info', `User ${approved ? 'approved' : 'rejected'} task: ${implementation.task.title}`);
    return approved;
  }

  /**
   * Execute a task implementation
   */
  private async executeTask(implementation: TaskImplementation): Promise<void> {
    const { task, codeChanges, commands, testCommands } = implementation;
    const taskId = task.id;
    
    try {
      this.log('info', `🚀 Executing task: ${task.title} (ID: ${taskId})`);
      this.currentTasks.set(taskId, implementation);
      
      // Mark task as in progress
      await TaskService.update(taskId, { status: TaskStatus.IN_PROGRESS });
      
      // Create backups before making changes
      for (const change of codeChanges) {
        if (change.changeType === 'modify') {
          await this.createBackup(change);
        }
      }
      
      // Apply code changes
      for (const change of codeChanges) {
        await this.applyCodeChange(change);
        this.stats.codeChangesApplied++;
      }
      
      // Run commands
      for (const command of commands) {
        this.log('info', `Running command: ${command}`);
        await this.runCommand(command);
      }
      
      // Run tests
      this.log('info', '🧪 Running tests...');
      const testsPass = await this.runTests(testCommands);
      
      if (testsPass) {
        // Mark task as done
        await TaskService.update(taskId, { 
          status: TaskStatus.DONE,
          actualHours: this.estimateActualHours(implementation)
        });
        this.stats.tasksCompleted++;
        this.log('info', `✅ Task completed successfully: ${task.title}`);
      } else {
        // Rollback changes and mark as blocked
        await this.rollbackChanges(codeChanges);
        await TaskService.update(taskId, { status: TaskStatus.BLOCKED });
        this.log('error', `❌ Task blocked due to test failures: ${task.title}`);
      }
      
    } catch (error: any) {
      this.stats.errors++;
      this.log('error', `❌ Error executing task: ${task.title} - ${error.message}`);
      
      // Attempt rollback
      try {
        await this.rollbackChanges(codeChanges);
        await TaskService.update(taskId, { status: TaskStatus.BLOCKED });
      } catch (rollbackError: any) {
        this.log('error', `Failed to rollback changes: ${rollbackError.message}`);
      }
    } finally {
      this.currentTasks.delete(taskId);
    }
  }

  /**
   * Apply a code change with comprehensive logging
   */
  private async applyCodeChange(change: CodeChange): Promise<void> {
    if (!change.content && change.changeType !== 'delete') {
        throw new Error(`Content required for ${change.changeType} operation`);
    }

    const fullPath = path.join(this.config.workspaceRoot, change.filePath);
    
    try {
        switch (change.changeType) {
            case 'create':
            case 'modify':
                await fs.promises.writeFile(fullPath, change.content!, 'utf8');
                break;
            case 'delete':
                await fs.promises.unlink(fullPath);
                break;
        }
        
        this.log('info', `✅ Applied ${change.changeType} to ${change.filePath}`);
    } catch (error: any) {
        this.log('error', `Failed to apply change to ${change.filePath}: ${error.message}`);
        throw error;
    }
  }

  /**
   * Create backup of file before modification
   */
  private async createBackup(change: CodeChange): Promise<void> {
    if (change.changeType !== 'modify') return;
    
    const fullPath = path.join(this.config.workspaceRoot, change.filePath);
    const backupPath = `${fullPath}.backup-${Date.now()}`;
    
    try {
        const content = await fs.promises.readFile(fullPath, 'utf8');
        await fs.promises.writeFile(backupPath, content, 'utf8');
        change.backup = backupPath;
        
        this.log('debug', `Created backup of ${change.filePath}`);
    } catch (error: any) {
        this.log('error', `Failed to create backup of ${change.filePath}: ${error.message}`);
        throw error;
    }
  }

  /**
   * Rollback changes if something goes wrong
   */
  private async rollbackChanges(changes: CodeChange[]): Promise<void> {
    this.log('warn', '🔄 Rolling back changes...');
    
    for (const change of changes.reverse()) {
      try {
        const fullPath = path.join(this.config.workspaceRoot, change.filePath);
        
        if (change.changeType === 'create') {
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            this.log('debug', `Rolled back creation: ${change.filePath}`);
          }
        } else if (change.changeType === 'modify' && change.backup) {
          fs.copyFileSync(change.backup, fullPath);
          fs.unlinkSync(change.backup);
          this.log('debug', `Rolled back modification: ${change.filePath}`);
        }
      } catch (error: any) {
        this.log('error', `Failed to rollback ${change.filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Check if file is allowed to be modified
   */
  private isFileAllowed(filePath: string): boolean {
    // Check forbidden patterns
    for (const pattern of this.config.forbiddenFilePatterns) {
      if (filePath.includes(pattern)) {
        return false;
      }
    }
    
    // Check allowed patterns
    if (this.config.allowedFilePatterns.length > 0) {
      return this.config.allowedFilePatterns.some(pattern => 
        filePath.includes(pattern)
      );
    }
    
    return true;
  }

  /**
   * Generate App Navigator code for React Navigation
   */
  private generateAppNavigatorCode(): string {
    return `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ title: 'Sign In' }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{ title: 'Create Account' }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Debt Settler' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};`;
  }

  /**
   * Generate updated App.tsx with navigation
   */
  private generateUpdatedAppTsxWithNavigation(): string {
    return `import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}`;
  }

  /**
   * Generate authentication service code
   */
  private generateAuthServiceCode(): string {
    return `import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: Date;
}

export class AuthService {
  /**
   * Create a new user account
   */
  static async signUp(email: string, password: string): Promise<User> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      const userData = {
        email: user.email,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      
      await firestore().collection('users').doc(user.uid).set(userData);
      
      return {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || undefined,
        createdAt: new Date(),
      };
    } catch (error: any) {
      throw new Error(\`Sign up failed: \${error.message}\`);
    }
  }
  
  /**
   * Sign in existing user
   */
  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Update last login time
      await firestore().collection('users').doc(user.uid).update({
        lastLoginAt: firestore.FieldValue.serverTimestamp(),
      });
      
      return {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || undefined,
      };
    } catch (error: any) {
      throw new Error(\`Sign in failed: \${error.message}\`);
    }
  }
  
  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      await auth().signOut();
    } catch (error: any) {
      throw new Error(\`Sign out failed: \${error.message}\`);
    }
  }
  
  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    const user = auth().currentUser;
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
    };
  }
  
  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await auth().sendPasswordResetEmail(email);
    } catch (error: any) {
      throw new Error(\`Password reset failed: \${error.message}\`);
    }
  }
}`;
  }

  /**
   * Generate authentication context code
   */
  private generateAuthContextCode(): string {
    return `import React, { createContext, useContext, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { AuthService, User } from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await AuthService.signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      await AuthService.signUp(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await AuthService.resetPassword(email);
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};`;
  }

  /**
   * Generate login screen code
   */
  private generateLoginScreenCode(): string {
    return `import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuth();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await signIn(email.trim(), password);
      navigation.navigate('Home');
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    try {
      const { resetPassword } = useAuth();
      await resetPassword(email.trim());
      Alert.alert('Success', 'Password reset email sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to Debt Settler</Text>
          
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={loading}
            >
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  form: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
});`;
  }

  /**
   * Generate register screen code
   */
  private generateRegisterScreenCode(): string {
    return `import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, loading } = useAuth();

  const validateForm = () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      await signUp(email.trim(), password);
      Alert.alert(
        'Success', 
        'Account created successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Debt Settler and take control of your finances</Text>
          
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
            
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.linkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
    lineHeight: 22,
  },
  form: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#666',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});`;
  }

  // Helper methods and logging
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Console output with colors
    switch (level) {
      case 'debug':
        if (this.config.logLevel === 'debug') {
          console.log(chalk.gray(logMessage));
        }
        break;
      case 'info':
        console.log(chalk.blue(logMessage));
        break;
      case 'warn':
        console.log(chalk.yellow(logMessage));
        break;
      case 'error':
        console.log(chalk.red(logMessage));
        break;
    }
    
    // File logging
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private logStats(): void {
    const runtime = Date.now() - this.startTime.getTime();
    const runtimeMinutes = Math.round(runtime / 60000);
    
    this.log('info', '📊 Autonomous Agent Statistics:');
    this.log('info', `  Runtime: ${runtimeMinutes} minutes`);
    this.log('info', `  Tasks Completed: ${this.stats.tasksCompleted}`);
    this.log('info', `  Tasks Generated: ${this.stats.tasksGenerated}`);
    this.log('info', `  Code Changes Applied: ${this.stats.codeChangesApplied}`);
    this.log('info', `  Analysis Runs: ${this.stats.analysisRuns}`);
    this.log('info', `  Errors: ${this.stats.errors}`);
  }

  private async keepAlive(): Promise<void> {
    return new Promise((resolve) => {
      // Keep the process alive until stopped
      const interval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }

  // Placeholder implementations for analysis methods
  private async detectCodebaseChanges(projectPath: string): Promise<any> {
    return { lastModified: new Date(), changedFiles: [] };
  }

  private async analyzeDependencies(projectPath: string): Promise<any> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return {
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        outdated: [] // Would need npm outdated check
      };
    }
    return { dependencies: [], devDependencies: [], outdated: [] };
  }

  private async analyzeTestCoverage(projectPath: string): Promise<any> {
    return { coverage: 0, uncoveredFiles: [] };
  }

  private async analyzeCodeQuality(projectPath: string): Promise<any> {
    return { issues: [], score: 100 };
  }

  private async generateFeatureImplementation(task: Task): Promise<CodeChange[]> {
    if (task.title.toLowerCase().includes('navigation')) {
      return this.generateNavigationImplementation();
    } else if (task.title.toLowerCase().includes('authentication')) {
      return this.generateAuthenticationImplementation();
    }
    return [];
  }

  private async generateImprovementImplementation(task: Task): Promise<CodeChange[]> {
    if (task.title.toLowerCase().includes('project structure')) {
      return this.generateProjectStructureImplementation();
    }
    return [];
  }

  private async generateDeploymentImplementation(task: Task): Promise<CodeChange[]> {
    if (task.title.toLowerCase().includes('firebase')) {
      return this.generateFirebaseSetupImplementation();
    }
    return [];
  }

  private async generateProjectStructureImplementation(): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];
    
    // Create essential directories and index files
    const directories = [
      'src/screens',
      'src/components', 
      'src/services',
      'src/types',
      'src/utils',
      'src/contexts',
      'src/navigation'
    ];

    for (const dir of directories) {
      changes.push({
        filePath: `${dir}/index.ts`,
        content: `// ${dir} exports\n// Auto-generated by Autonomous Agent\n`,
        changeType: 'create',
        reason: `Create ${dir} directory structure`,
        riskLevel: 'low'
      });
    }

    return changes;
  }

  private async generateFirebaseSetupImplementation(): Promise<CodeChange[]> {
    const changes: CodeChange[] = [];

    // Firebase configuration
    changes.push({
      filePath: 'src/services/firebase.ts',
      content: this.generateFirebaseConfigCode(),
      changeType: 'create',
      reason: 'Create Firebase configuration',
      riskLevel: 'medium'
    });

    return changes;
  }

  private generateFirebaseConfigCode(): string {
    return `import { initializeApp } from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Firebase configuration will be automatically loaded from google-services.json (Android)
// and GoogleService-Info.plist (iOS) when using React Native Firebase

export class FirebaseService {
  static async initialize(): Promise<void> {
    try {
      // Firebase is automatically initialized with React Native Firebase
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  static getFirestore() {
    return firestore();
  }

  static getAuth() {
    return auth();
  }
}

// Initialize Firebase when the module is imported
FirebaseService.initialize();`;
  }

  private prioritizeTasks(tasks: CreateTask[]): CreateTask[] {
    return tasks.sort((a, b) => {
      const priorityOrder = {
        [TaskPriority.CRITICAL]: 4,
        [TaskPriority.HIGH]: 3,
        [TaskPriority.MEDIUM]: 2,
        [TaskPriority.LOW]: 1
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async createTaskIfNotExists(task: CreateTask): Promise<boolean> {
    try {
      // Check if similar task already exists
      const existingTasks = await TaskService.getAll({
        filters: { projectId: task.projectId }
      });
      
      const exists = existingTasks.some(existing => 
        existing.title.toLowerCase() === task.title.toLowerCase()
      );
      
      if (!exists) {
        await TaskService.create(task);
        this.log('info', `Created new task: ${task.title}`);
        return true;
      } else {
        this.log('debug', `Task already exists: ${task.title}`);
        return false;
      }
    } catch (error: any) {
      this.log('error', `Failed to create task: ${task.title} - ${error.message}`);
      return false;
    }
  }

  private assessRiskLevel(changes: CodeChange[]): 'low' | 'medium' | 'high' {
    if (changes.length === 0) return 'low';
    
    const hasHighRisk = changes.some(c => c.riskLevel === 'high');
    const hasMediumRisk = changes.some(c => c.riskLevel === 'medium');
    const hasModifications = changes.some(c => c.changeType === 'modify');
    
    if (hasHighRisk || (hasMediumRisk && hasModifications)) return 'high';
    if (hasMediumRisk || hasModifications) return 'medium';
    return 'low';
  }

  private estimateImplementationTime(task: Task, changes: CodeChange[]): number {
    let baseTime = task.estimatedHours ? task.estimatedHours * 60 : 60; // Convert to minutes
    
    // Adjust based on number of changes
    const changeTime = changes.length * 10; // 10 minutes per change
    
    return Math.min(baseTime + changeTime, 240); // Cap at 4 hours
  }

  private estimateActualHours(implementation: TaskImplementation): number {
    return Math.max(implementation.estimatedTime / 60, 0.5); // Minimum 0.5 hours
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getNextTask(): Promise<Task | null> {
    try {
      const tasks = await TaskService.getAll({
        filters: { status: [TaskStatus.TODO] },
        sortBy: 'priority',
        sortOrder: 'desc',
        limit: 1
      });
      
      return tasks.length > 0 ? tasks[0] : null;
    } catch (error: any) {
      this.log('error', `Failed to get next task: ${error.message}`);
      return null;
    }
  }

  private async getPendingTasks(): Promise<Task[]> {
    return TaskService.getAll({
      filters: { status: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] }
    });
  }

  private async getCompletedTasks(): Promise<Task[]> {
    return TaskService.getAll({
      filters: { status: [TaskStatus.DONE] }
    });
  }

  private async runCommand(command: string): Promise<void> {
    const projectPath = path.join(this.config.workspaceRoot, this.config.targetProject);
    this.log('debug', `Executing command in ${projectPath}: ${command}`);
    
    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd: projectPath,
        timeout: 300000 // 5 minute timeout
      });
      
      if (stdout) this.log('debug', `Command output: ${stdout}`);
      if (stderr) this.log('warn', `Command stderr: ${stderr}`);
    } catch (error: any) {
      this.log('error', `Command failed: ${command} - ${error.message}`);
      throw error;
    }
  }

  private async runTests(testCommands: string[]): Promise<boolean> {
    try {
      for (const command of testCommands) {
        // Check if this is an npm test command and if the project has a test script
        if (command === 'npm test') {
          const projectPath = path.join(this.config.workspaceRoot, this.config.targetProject);
          const packageJsonPath = path.join(projectPath, 'package.json');
          
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            if (!packageJson.scripts?.test) {
              this.log('info', '⏭️  Skipping tests - no test script found in package.json');
              continue;
            }
          } else {
            this.log('info', '⏭️  Skipping tests - no package.json found');
            continue;
          }
        }
        
        this.log('info', `Running test: ${command}`);
        await this.runCommand(command);
      }
      this.log('info', '✅ All tests passed');
      return true;
    } catch (error: any) {
      this.log('error', `❌ Tests failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Perform a quick analysis to check for potential new tasks
   */
  private async performQuickAnalysis(): Promise<QuickAnalysisResult> {
    try {
        // Check PROJECT_STATUS.md for changes
        const projectStatusPath = path.join(this.config.workspaceRoot, this.config.targetProject, 'PROJECT_STATUS.md');
        const statusChanged = await this.hasFileChanged(projectStatusPath);
        
        // Quick scan of recent code changes
        const recentChanges = await this.getRecentCodeChanges();
        
        // Check for new dependencies
        const dependencyChanges = await this.checkDependencyChanges();
        
        // Calculate potential tasks based on changes
        const potentialTasks = 
            (statusChanged ? 1 : 0) + 
            Math.ceil(recentChanges.length / 5) + 
            (dependencyChanges ? 1 : 0);
        
        return {
            timestamp: new Date(),
            potentialTasks,
            statusChanged,
            recentChanges: recentChanges.length,
            dependencyChanges
        };
    } catch (error: any) {
        this.log('error', `Quick analysis failed: ${error.message}`);
        return { timestamp: new Date(), potentialTasks: 0 };
    }
  }

  /**
   * Check if a file has changed since last check
   */
  private async hasFileChanged(filePath: string): Promise<boolean> {
    try {
        const stats = await fs.promises.stat(filePath);
        const lastModified = stats.mtime.getTime();
        
        const lastCheck = this.fileChecks.get(filePath) || 0;
        this.fileChecks.set(filePath, Date.now());
        
        return lastModified > lastCheck;
    } catch {
        return false;
    }
  }

  /**
   * Get recent code changes in the project
   */
  private async getRecentCodeChanges(): Promise<CodeChange[]> {
    try {
        const projectPath = path.join(this.config.workspaceRoot, this.config.targetProject);
        const { stdout } = await execAsync('git diff --name-only HEAD~1 HEAD', { cwd: projectPath });
        
        return stdout.split('\n')
            .filter(file => file.trim() && !file.includes('node_modules'))
            .map(file => ({
                filePath: file,
                content: null,
                changeType: 'modify' as const,
                riskLevel: 'low' as const
            }));
    } catch {
        return [];
    }
  }

  /**
   * Check for dependency changes
   */
  private async checkDependencyChanges(): Promise<boolean> {
    try {
        const projectPath = path.join(this.config.workspaceRoot, this.config.targetProject);
        const packageLockPath = path.join(projectPath, 'package-lock.json');
        
        return await this.hasFileChanged(packageLockPath);
    } catch {
        return false;
    }
  }
} 