interface AutonomousConfig {
    workspaceRoot: string;
    targetProject: string;
    autoApprove: boolean;
    maxConcurrentTasks: number;
    analysisInterval: number;
    safetyChecks: boolean;
    allowedFilePatterns: string[];
    forbiddenFilePatterns: string[];
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export declare class AutonomousAgent {
    private config;
    private isRunning;
    private currentTasks;
    private aiWorker;
    private analysisTimer;
    private logFile;
    private startTime;
    private stats;
    constructor(config: AutonomousConfig);
    /**
     * Start the autonomous development agent
     */
    start(): Promise<void>;
    /**
     * Stop the autonomous agent
     */
    stop(): void;
    /**
     * Validate project exists and is properly configured
     */
    private validateProject;
    /**
     * Start continuous monitoring and analysis
     */
    private startContinuousMonitoring;
    /**
     * Perform codebase analysis and generate new tasks
     */
    private performAnalysisAndGeneration;
    /**
     * Start the task execution loop
     */
    private startTaskExecutionLoop;
    /**
     * Analyze current project state
     */
    private analyzeProjectState;
    /**
     * Analyze React Native Expo project structure
     */
    private analyzeProjectStructure;
    /**
     * Generate tasks from analysis with focus on React Native Expo
     */
    private generateTasksFromAnalysis;
    /**
     * Parse PROJECT_STATUS.md for debt-settler specific tasks
     */
    private parseProjectStatusTasks;
    /**
     * Generate implementation plan for a task
     */
    private generateImplementationPlan;
    /**
     * Generate React Navigation setup implementation
     */
    private generateNavigationImplementation;
    /**
     * Generate authentication implementation for React Native
     */
    private generateAuthenticationImplementation;
    /**
     * Request approval from user
     */
    private requestApproval;
    /**
     * Execute a task implementation
     */
    private executeTask;
    /**
     * Apply a code change with comprehensive logging
     */
    private applyCodeChange;
    /**
     * Create backup of file before modification
     */
    private createBackup;
    /**
     * Rollback changes if something goes wrong
     */
    private rollbackChanges;
    /**
     * Check if file is allowed to be modified
     */
    private isFileAllowed;
    /**
     * Generate App Navigator code for React Navigation
     */
    private generateAppNavigatorCode;
    /**
     * Generate updated App.tsx with navigation
     */
    private generateUpdatedAppTsxWithNavigation;
    /**
     * Generate authentication service code
     */
    private generateAuthServiceCode;
    /**
     * Generate authentication context code
     */
    private generateAuthContextCode;
    /**
     * Generate login screen code
     */
    private generateLoginScreenCode;
    /**
     * Generate register screen code
     */
    private generateRegisterScreenCode;
    private log;
    private ensureLogDirectory;
    private logStats;
    private keepAlive;
    private detectCodebaseChanges;
    private analyzeDependencies;
    private analyzeTestCoverage;
    private analyzeCodeQuality;
    private generateFeatureImplementation;
    private generateImprovementImplementation;
    private generateDeploymentImplementation;
    private generateProjectStructureImplementation;
    private generateFirebaseSetupImplementation;
    private generateFirebaseConfigCode;
    private prioritizeTasks;
    private createTaskIfNotExists;
    private assessRiskLevel;
    private estimateImplementationTime;
    private estimateActualHours;
    private sleep;
    private getNextTask;
    private getPendingTasks;
    private getCompletedTasks;
    private runCommand;
    private runTests;
}
export {};
//# sourceMappingURL=autonomous-agent.d.ts.map