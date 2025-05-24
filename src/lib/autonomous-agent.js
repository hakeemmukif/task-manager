"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousAgent = void 0;
const db_1 = require("./db");
const ai_worker_1 = require("./ai-worker");
const task_1 = require("@/types/task");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class AutonomousAgent {
    constructor(config) {
        this.isRunning = false;
        this.currentTasks = new Map();
        this.analysisTimer = null;
        this.stats = {
            tasksCompleted: 0,
            tasksGenerated: 0,
            codeChangesApplied: 0,
            analysisRuns: 0,
            errors: 0
        };
        this.config = config;
        this.aiWorker = new ai_worker_1.AIWorker(config.workspaceRoot);
        this.startTime = new Date();
        this.logFile = path.join(config.workspaceRoot, 'task-manager', 'logs', `autonomous-${Date.now()}.log`);
        this.ensureLogDirectory();
    }
    /**
     * Start the autonomous development agent
     */
    async start() {
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
            console.log(chalk_1.default.green('✅ Autonomous Agent is now running...'));
            console.log(chalk_1.default.yellow('Press Ctrl+C to stop'));
            console.log(chalk_1.default.gray(`📝 Logs: ${this.logFile}`));
            // Keep the process alive
            await this.keepAlive();
        }
        catch (error) {
            this.log('error', `Failed to start autonomous agent: ${error.message}`);
            throw error;
        }
    }
    /**
     * Stop the autonomous agent
     */
    stop() {
        this.log('info', '🛑 Stopping Autonomous Agent...');
        this.isRunning = false;
        if (this.analysisTimer) {
            clearInterval(this.analysisTimer);
        }
        this.logStats();
        this.log('info', '✅ Autonomous Agent stopped');
        console.log(chalk_1.default.green('✅ Autonomous Agent stopped'));
    }
    /**
     * Validate project exists and is properly configured
     */
    async validateProject() {
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
    startContinuousMonitoring() {
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
    async performAnalysisAndGeneration() {
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
                if (created)
                    tasksCreated++;
            }
            this.stats.tasksGenerated += tasksCreated;
            const analysisTime = Date.now() - analysisStart;
            this.log('info', `✅ Analysis complete in ${analysisTime}ms. Generated ${tasksCreated} new tasks`);
            const result = {
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
        }
        catch (error) {
            this.stats.errors++;
            this.log('error', `Analysis failed: ${error.message}`);
            throw error;
        }
    }
    /**
     * Start the task execution loop
     */
    async startTaskExecutionLoop() {
        this.log('info', '🔄 Starting task execution loop...');
        while (this.isRunning) {
            try {
                // Get next task to work on
                const nextTask = await this.getNextTask();
                if (nextTask && this.currentTasks.size < this.config.maxConcurrentTasks) {
                    this.log('info', `🎯 Starting work on task: ${nextTask.title} (ID: ${nextTask.id})`);
                    // Generate implementation plan
                    const implementation = await this.generateImplementationPlan(nextTask);
                    // Request approval if needed
                    const approved = await this.requestApproval(implementation);
                    if (approved) {
                        // Execute the task
                        await this.executeTask(implementation);
                    }
                    else {
                        this.log('info', `⏭️  Task skipped by user: ${nextTask.title}`);
                    }
                }
                else if (this.currentTasks.size >= this.config.maxConcurrentTasks) {
                    this.log('debug', `⏸️  Max concurrent tasks reached (${this.config.maxConcurrentTasks})`);
                }
                else {
                    this.log('debug', '😴 No pending tasks found, waiting...');
                }
                // Wait before checking for next task
                await this.sleep(30000); // 30 seconds
            }
            catch (error) {
                this.stats.errors++;
                this.log('error', `Error in task execution loop: ${error.message}`);
                await this.sleep(60000); // Wait 1 minute on error
            }
        }
    }
    /**
     * Analyze current project state
     */
    async analyzeProjectState() {
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
    async analyzeProjectStructure(projectPath) {
        const structure = {
            hasAppTsx: fs.existsSync(path.join(projectPath, 'App.tsx')),
            hasAppJson: fs.existsSync(path.join(projectPath, 'app.json')),
            hasSrcDir: fs.existsSync(path.join(projectPath, 'src')),
            hasScreensDir: fs.existsSync(path.join(projectPath, 'src', 'screens')),
            hasComponentsDir: fs.existsSync(path.join(projectPath, 'src', 'components')),
            hasServicesDir: fs.existsSync(path.join(projectPath, 'src', 'services')),
            hasNavigationSetup: false,
            hasFirebaseSetup: false,
            missingDirectories: []
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
    async generateTasksFromAnalysis(analysis) {
        const tasks = [];
        // Find project ID
        const projects = await db_1.ProjectService.getAll();
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
                priority: task_1.TaskPriority.HIGH,
                status: task_1.TaskStatus.TODO,
                type: task_1.TaskType.IMPROVEMENT,
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
                priority: task_1.TaskPriority.HIGH,
                status: task_1.TaskStatus.TODO,
                type: task_1.TaskType.FEATURE,
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
                priority: task_1.TaskPriority.HIGH,
                status: task_1.TaskStatus.TODO,
                type: task_1.TaskType.DEPLOYMENT,
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
    parseProjectStatusTasks(content, projectId) {
        const tasks = [];
        // Only generate tasks if they don't already exist
        if (content.includes('Phase 1: MVP') && content.includes('Firebase Setup')) {
            tasks.push({
                title: 'Implement Authentication System',
                description: 'Create login/register screens with Firebase authentication, user session management, and profile setup flow',
                projectId,
                priority: task_1.TaskPriority.HIGH,
                status: task_1.TaskStatus.TODO,
                type: task_1.TaskType.FEATURE,
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
                priority: task_1.TaskPriority.HIGH,
                status: task_1.TaskStatus.TODO,
                type: task_1.TaskType.FEATURE,
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
    async generateImplementationPlan(task) {
        this.log('info', `📋 Generating implementation plan for: ${task.title}`);
        const codeChanges = [];
        const commands = [];
        const testCommands = ['npm test'];
        // Analyze task type and generate appropriate implementation
        switch (task.type) {
            case task_1.TaskType.FEATURE:
                codeChanges.push(...await this.generateFeatureImplementation(task));
                break;
            case task_1.TaskType.IMPROVEMENT:
                codeChanges.push(...await this.generateImprovementImplementation(task));
                break;
            case task_1.TaskType.DEPLOYMENT:
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
    async generateNavigationImplementation() {
        const changes = [];
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
    async generateAuthenticationImplementation() {
        const changes = [];
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
    async requestApproval(implementation) {
        if (this.config.autoApprove && implementation.estimatedRisk === 'low') {
            this.log('info', '✅ Auto-approved (low risk)');
            return true;
        }
        console.log(chalk_1.default.yellow('\n🤔 Requesting approval for task implementation:'));
        console.log(chalk_1.default.bold(`Task: ${implementation.task.title}`));
        console.log(chalk_1.default.gray(`Risk Level: ${implementation.estimatedRisk}`));
        console.log(chalk_1.default.gray(`Estimated Time: ${implementation.estimatedTime} minutes`));
        console.log(chalk_1.default.gray(`Files to modify: ${implementation.codeChanges.length}`));
        // Show file changes
        for (const change of implementation.codeChanges) {
            const icon = change.changeType === 'create' ? '📄' : change.changeType === 'modify' ? '✏️' : '🗑️';
            console.log(chalk_1.default.cyan(`  ${icon} ${change.changeType}: ${change.filePath}`));
            console.log(chalk_1.default.gray(`    ${change.reason}`));
        }
        const { approved } = await inquirer_1.default.prompt([
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
    async executeTask(implementation) {
        const { task, codeChanges, commands, testCommands } = implementation;
        const taskId = task.id;
        try {
            this.log('info', `🚀 Executing task: ${task.title} (ID: ${taskId})`);
            this.currentTasks.set(taskId, implementation);
            // Mark task as in progress
            await db_1.TaskService.update(taskId, { status: task_1.TaskStatus.IN_PROGRESS });
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
                await db_1.TaskService.update(taskId, {
                    status: task_1.TaskStatus.DONE,
                    actualHours: this.estimateActualHours(implementation)
                });
                this.stats.tasksCompleted++;
                this.log('info', `✅ Task completed successfully: ${task.title}`);
            }
            else {
                // Rollback changes and mark as blocked
                await this.rollbackChanges(codeChanges);
                await db_1.TaskService.update(taskId, { status: task_1.TaskStatus.BLOCKED });
                this.log('error', `❌ Task blocked due to test failures: ${task.title}`);
            }
        }
        catch (error) {
            this.stats.errors++;
            this.log('error', `❌ Error executing task: ${task.title} - ${error.message}`);
            // Attempt rollback
            try {
                await this.rollbackChanges(codeChanges);
                await db_1.TaskService.update(taskId, { status: task_1.TaskStatus.BLOCKED });
            }
            catch (rollbackError) {
                this.log('error', `Failed to rollback changes: ${rollbackError.message}`);
            }
        }
        finally {
            this.currentTasks.delete(taskId);
        }
    }
    /**
     * Apply a code change with comprehensive logging
     */
    async applyCodeChange(change) {
        const fullPath = path.join(this.config.workspaceRoot, this.config.targetProject, change.filePath);
        // Safety check
        if (!this.isFileAllowed(change.filePath)) {
            this.log('warn', `⚠️  Skipping forbidden file: ${change.filePath}`);
            return;
        }
        this.log('info', `${change.changeType}: ${change.filePath} (${change.reason})`);
        try {
            switch (change.changeType) {
                case 'create':
                    // Ensure directory exists
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                        this.log('debug', `Created directory: ${dir}`);
                    }
                    fs.writeFileSync(fullPath, change.content);
                    this.log('debug', `Created file: ${fullPath} (${change.content.length} bytes)`);
                    break;
                case 'modify':
                    if (fs.existsSync(fullPath)) {
                        fs.writeFileSync(fullPath, change.content);
                        this.log('debug', `Modified file: ${fullPath} (${change.content.length} bytes)`);
                    }
                    else {
                        this.log('warn', `File not found for modification: ${fullPath}`);
                    }
                    break;
                case 'delete':
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        this.log('debug', `Deleted file: ${fullPath}`);
                    }
                    else {
                        this.log('warn', `File not found for deletion: ${fullPath}`);
                    }
                    break;
            }
        }
        catch (error) {
            this.log('error', `Failed to apply change to ${change.filePath}: ${error.message}`);
            throw error;
        }
    }
    /**
     * Create backup of file before modification
     */
    async createBackup(change) {
        const fullPath = path.join(this.config.workspaceRoot, this.config.targetProject, change.filePath);
        if (fs.existsSync(fullPath)) {
            const backupPath = `${fullPath}.backup.${Date.now()}`;
            fs.copyFileSync(fullPath, backupPath);
            change.backup = backupPath;
            this.log('debug', `Created backup: ${backupPath}`);
        }
    }
    /**
     * Rollback changes if something goes wrong
     */
    async rollbackChanges(changes) {
        this.log('warn', '🔄 Rolling back changes...');
        for (const change of changes.reverse()) {
            try {
                const fullPath = path.join(this.config.workspaceRoot, this.config.targetProject, change.filePath);
                if (change.changeType === 'create') {
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        this.log('debug', `Rolled back creation: ${change.filePath}`);
                    }
                }
                else if (change.changeType === 'modify' && change.backup) {
                    fs.copyFileSync(change.backup, fullPath);
                    fs.unlinkSync(change.backup);
                    this.log('debug', `Rolled back modification: ${change.filePath}`);
                }
            }
            catch (error) {
                this.log('error', `Failed to rollback ${change.filePath}: ${error.message}`);
            }
        }
    }
    /**
     * Check if file is allowed to be modified
     */
    isFileAllowed(filePath) {
        // Check forbidden patterns
        for (const pattern of this.config.forbiddenFilePatterns) {
            if (filePath.includes(pattern)) {
                return false;
            }
        }
        // Check allowed patterns
        if (this.config.allowedFilePatterns.length > 0) {
            return this.config.allowedFilePatterns.some(pattern => filePath.includes(pattern));
        }
        return true;
    }
    /**
     * Generate App Navigator code for React Navigation
     */
    generateAppNavigatorCode() {
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
    generateUpdatedAppTsxWithNavigation() {
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
    generateAuthServiceCode() {
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
    generateAuthContextCode() {
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
    generateLoginScreenCode() {
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
    generateRegisterScreenCode() {
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
    log(level, message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        // Console output with colors
        switch (level) {
            case 'debug':
                if (this.config.logLevel === 'debug') {
                    console.log(chalk_1.default.gray(logMessage));
                }
                break;
            case 'info':
                console.log(chalk_1.default.blue(logMessage));
                break;
            case 'warn':
                console.log(chalk_1.default.yellow(logMessage));
                break;
            case 'error':
                console.log(chalk_1.default.red(logMessage));
                break;
        }
        // File logging
        try {
            fs.appendFileSync(this.logFile, logMessage + '\n');
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    logStats() {
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
    async keepAlive() {
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
    async detectCodebaseChanges(projectPath) {
        return { lastModified: new Date(), changedFiles: [] };
    }
    async analyzeDependencies(projectPath) {
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
    async analyzeTestCoverage(projectPath) {
        return { coverage: 0, uncoveredFiles: [] };
    }
    async analyzeCodeQuality(projectPath) {
        return { issues: [], score: 100 };
    }
    async generateFeatureImplementation(task) {
        if (task.title.toLowerCase().includes('navigation')) {
            return this.generateNavigationImplementation();
        }
        else if (task.title.toLowerCase().includes('authentication')) {
            return this.generateAuthenticationImplementation();
        }
        return [];
    }
    async generateImprovementImplementation(task) {
        if (task.title.toLowerCase().includes('project structure')) {
            return this.generateProjectStructureImplementation();
        }
        return [];
    }
    async generateDeploymentImplementation(task) {
        if (task.title.toLowerCase().includes('firebase')) {
            return this.generateFirebaseSetupImplementation();
        }
        return [];
    }
    async generateProjectStructureImplementation() {
        const changes = [];
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
    async generateFirebaseSetupImplementation() {
        const changes = [];
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
    generateFirebaseConfigCode() {
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
    prioritizeTasks(tasks) {
        return tasks.sort((a, b) => {
            const priorityOrder = {
                [task_1.TaskPriority.CRITICAL]: 4,
                [task_1.TaskPriority.HIGH]: 3,
                [task_1.TaskPriority.MEDIUM]: 2,
                [task_1.TaskPriority.LOW]: 1
            };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    async createTaskIfNotExists(task) {
        try {
            // Check if similar task already exists
            const existingTasks = await db_1.TaskService.getAll({
                filters: { projectId: task.projectId }
            });
            const exists = existingTasks.some(existing => existing.title.toLowerCase() === task.title.toLowerCase());
            if (!exists) {
                await db_1.TaskService.create(task);
                this.log('info', `Created new task: ${task.title}`);
                return true;
            }
            else {
                this.log('debug', `Task already exists: ${task.title}`);
                return false;
            }
        }
        catch (error) {
            this.log('error', `Failed to create task: ${task.title} - ${error.message}`);
            return false;
        }
    }
    assessRiskLevel(changes) {
        if (changes.length === 0)
            return 'low';
        const hasHighRisk = changes.some(c => c.riskLevel === 'high');
        const hasMediumRisk = changes.some(c => c.riskLevel === 'medium');
        const hasModifications = changes.some(c => c.changeType === 'modify');
        if (hasHighRisk || (hasMediumRisk && hasModifications))
            return 'high';
        if (hasMediumRisk || hasModifications)
            return 'medium';
        return 'low';
    }
    estimateImplementationTime(task, changes) {
        let baseTime = task.estimatedHours ? task.estimatedHours * 60 : 60; // Convert to minutes
        // Adjust based on number of changes
        const changeTime = changes.length * 10; // 10 minutes per change
        return Math.min(baseTime + changeTime, 240); // Cap at 4 hours
    }
    estimateActualHours(implementation) {
        return Math.max(implementation.estimatedTime / 60, 0.5); // Minimum 0.5 hours
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async getNextTask() {
        try {
            const tasks = await db_1.TaskService.getAll({
                filters: { status: [task_1.TaskStatus.TODO] },
                sortBy: 'priority',
                sortOrder: 'desc',
                limit: 1
            });
            return tasks.length > 0 ? tasks[0] : null;
        }
        catch (error) {
            this.log('error', `Failed to get next task: ${error.message}`);
            return null;
        }
    }
    async getPendingTasks() {
        return db_1.TaskService.getAll({
            filters: { status: [task_1.TaskStatus.TODO, task_1.TaskStatus.IN_PROGRESS] }
        });
    }
    async getCompletedTasks() {
        return db_1.TaskService.getAll({
            filters: { status: [task_1.TaskStatus.DONE] }
        });
    }
    async runCommand(command) {
        const projectPath = path.join(this.config.workspaceRoot, this.config.targetProject);
        this.log('debug', `Executing command in ${projectPath}: ${command}`);
        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: projectPath,
                timeout: 300000 // 5 minute timeout
            });
            if (stdout)
                this.log('debug', `Command output: ${stdout}`);
            if (stderr)
                this.log('warn', `Command stderr: ${stderr}`);
        }
        catch (error) {
            this.log('error', `Command failed: ${command} - ${error.message}`);
            throw error;
        }
    }
    async runTests(testCommands) {
        try {
            for (const command of testCommands) {
                this.log('info', `Running test: ${command}`);
                await this.runCommand(command);
            }
            this.log('info', '✅ All tests passed');
            return true;
        }
        catch (error) {
            this.log('error', `❌ Tests failed: ${error.message}`);
            return false;
        }
    }
}
exports.AutonomousAgent = AutonomousAgent;
//# sourceMappingURL=autonomous-agent.js.map