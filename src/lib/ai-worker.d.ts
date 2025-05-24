export declare class AIWorker {
    private workspaceRoot;
    constructor(workspaceRoot: string);
    /**
     * Analyze a project directory
     */
    analyzeProject(projectPath: string): Promise<any>;
    /**
     * Generate code suggestions
     */
    generateCodeSuggestions(context: any): Promise<string[]>;
}
//# sourceMappingURL=ai-worker.d.ts.map