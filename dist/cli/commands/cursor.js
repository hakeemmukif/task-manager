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
exports.CursorCommands = void 0;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const date_fns_1 = require("date-fns");
const firebase_1 = require("../services/firebase");
const readme_parser_1 = require("../services/readme-parser");
const task_1 = require("../../src/types/task");
class CursorCommands {
    static register(program) {
        const cursorCmd = program
            .command('cursor')
            .alias('c')
            .description('Cursor AI specific commands for autonomous development');
        // Get the most actionable task with complete context
        cursorCmd
            .command('next-task')
            .description('Get the next task optimized for Cursor AI with complete autonomous context')
            .option('-p, --project <projectId>', 'Filter by project ID')
            .option('--format <format>', 'Output format (json|markdown|text)', 'text')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Finding optimal task for Cursor AI...').start();
            try {
                const task = await firebase_1.FirebaseService.getNextTask(options.project);
                spinner.stop();
                if (!task) {
                    console.log(chalk_1.default.yellow('No actionable tasks found.'));
                    if (options.format === 'json') {
                        console.log(JSON.stringify({ task: null, message: 'No actionable tasks found' }));
                    }
                    return;
                }
                if (options.format === 'json') {
                    console.log(JSON.stringify(this.formatTaskForCursor(task), null, 2));
                    return;
                }
                if (options.format === 'markdown') {
                    console.log(this.formatTaskAsMarkdown(task));
                    return;
                }
                // Default text format
                console.log(this.formatTaskForTerminal(task));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error finding task:'), error);
            }
        });
        // Create a task optimized for AI development
        cursorCmd
            .command('create-ai-task')
            .description('Create a task with AI-optimized structure and context')
            .option('-p, --project <projectId>', 'Project ID')
            .option('-t, --title <title>', 'Task title')
            .option('-d, --description <description>', 'Detailed task description')
            .option('--files <files>', 'Comma-separated list of files to work on')
            .option('--commands <commands>', 'Comma-separated list of commands to run')
            .option('--tests <tests>', 'Comma-separated list of test criteria')
            .option('--priority <priority>', 'Task priority (critical|high|medium|low)', 'medium')
            .option('--type <type>', 'Task type (feature|bug|improvement|etc)', 'feature')
            .action(async (options) => {
            try {
                if (!options.title || !options.description) {
                    console.error(chalk_1.default.red('Title and description are required for AI tasks'));
                    return;
                }
                let projectId = options.project;
                if (!projectId) {
                    const projects = await firebase_1.FirebaseService.getProjects();
                    if (projects.length === 0) {
                        console.error(chalk_1.default.red('No projects found. Create a project first.'));
                        return;
                    }
                    projectId = projects[0].id; // Use first project as default
                }
                const taskData = {
                    title: options.title,
                    description: this.enhanceDescriptionForAI(options.description),
                    projectId,
                    priority: options.priority,
                    type: options.type,
                    status: task_1.TaskStatus.TODO,
                    tags: ['ai-optimized', options.type],
                    dependencies: [],
                    blockedBy: [],
                    attachments: [],
                    comments: [],
                    aiContext: {
                        codeFiles: options.files ? options.files.split(',').map((f) => f.trim()) : [],
                        commands: options.commands ? options.commands.split(',').map((c) => c.trim()) : [],
                        testCriteria: options.tests ? options.tests.split(',').map((t) => t.trim()) : [],
                        references: [],
                    },
                };
                const spinner = (0, ora_1.default)('Creating AI-optimized task...').start();
                const task = await firebase_1.FirebaseService.createTask(taskData);
                spinner.stop();
                console.log(chalk_1.default.green('✓ AI-optimized task created successfully!'));
                console.log(chalk_1.default.gray(`ID: ${task.id}`));
                console.log(chalk_1.default.gray(`Title: ${task.title}`));
                console.log(chalk_1.default.cyan('\n💡 Use "ai-tasks cursor next-task" to get this task with full context'));
            }
            catch (error) {
                console.error(chalk_1.default.red('Error creating AI task:'), error);
            }
        });
        // Import tasks from current directory's README
        cursorCmd
            .command('import-readme')
            .description('Import pending features from README.md in current directory')
            .option('-f, --file <file>', 'README file path', './README.md')
            .option('-p, --project <projectId>', 'Target project ID')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Parsing README.md for pending features...').start();
            try {
                const features = readme_parser_1.ReadmeParser.parseReadme(options.file);
                spinner.stop();
                if (features.length === 0) {
                    console.log(chalk_1.default.yellow('No pending features found in README.md'));
                    console.log(chalk_1.default.gray('💡 Add a "## Pending Features" section to your README.md'));
                    return;
                }
                let projectId = options.project;
                if (!projectId) {
                    const projects = await firebase_1.FirebaseService.getProjects();
                    if (projects.length === 0) {
                        console.error(chalk_1.default.red('No projects found. Create a project first.'));
                        return;
                    }
                    projectId = projects[0].id;
                }
                const importSpinner = (0, ora_1.default)('Importing features as AI-optimized tasks...').start();
                let imported = 0;
                for (const feature of features) {
                    try {
                        const task = readme_parser_1.ReadmeParser.featureToTask(feature, projectId);
                        // Enhance for AI
                        task.description = this.enhanceDescriptionForAI(task.description);
                        task.tags = [...task.tags, 'ai-optimized', 'readme-import'];
                        await firebase_1.FirebaseService.createTask(task);
                        imported++;
                    }
                    catch (error) {
                        console.error(chalk_1.default.red(`Failed to import: ${feature.title}`), error);
                    }
                }
                importSpinner.stop();
                console.log(chalk_1.default.green(`✓ Successfully imported ${imported}/${features.length} features as AI-optimized tasks`));
                console.log(chalk_1.default.cyan('\n💡 Use "ai-tasks cursor next-task" to start working on these tasks'));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error importing from README:'), error);
            }
        });
        // Mark task as completed and get next
        cursorCmd
            .command('complete <taskId>')
            .description('Mark a task as completed and get the next task')
            .option('--comment <comment>', 'Completion comment')
            .action(async (taskId, options) => {
            const spinner = (0, ora_1.default)('Completing task...').start();
            try {
                await firebase_1.FirebaseService.updateTaskStatus(taskId, task_1.TaskStatus.DONE);
                if (options.comment) {
                    await firebase_1.FirebaseService.addTaskComment(taskId, options.comment, 'Cursor AI');
                }
                const nextTask = await firebase_1.FirebaseService.getNextTask();
                spinner.stop();
                console.log(chalk_1.default.green('✓ Task completed successfully!'));
                if (nextTask) {
                    console.log(chalk_1.default.bold.blue('\n🎯 Next Task:'));
                    console.log(this.formatTaskForTerminal(nextTask));
                }
                else {
                    console.log(chalk_1.default.yellow('\n🎉 No more tasks! All caught up.'));
                }
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error completing task:'), error);
            }
        });
        // Get task context for current working directory
        cursorCmd
            .command('context')
            .description('Get tasks related to files in current working directory')
            .option('--files <files>', 'Specific files to check (comma-separated)')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Analyzing current context...').start();
            try {
                let filesToCheck = [];
                if (options.files) {
                    filesToCheck = options.files.split(',').map((f) => f.trim());
                }
                else {
                    // Auto-detect common files in current directory
                    const fs = await Promise.resolve().then(() => __importStar(require('node:fs')));
                    const path = await Promise.resolve().then(() => __importStar(require('node:path')));
                    const cwd = process.cwd();
                    const commonFiles = [
                        'package.json', 'README.md', 'index.js', 'index.ts', 'App.js', 'App.tsx',
                        'src/App.js', 'src/App.tsx', 'src/index.js', 'src/index.ts'
                    ];
                    filesToCheck = commonFiles
                        .map(file => path.join(cwd, file))
                        .filter(file => fs.existsSync(file))
                        .map(file => path.relative(cwd, file));
                }
                const tasks = await firebase_1.FirebaseService.getTasksByFiles(filesToCheck);
                spinner.stop();
                if (tasks.length === 0) {
                    console.log(chalk_1.default.yellow('No tasks found related to current context.'));
                    return;
                }
                console.log(chalk_1.default.bold.blue(`\n📁 Tasks Related to Current Context:`));
                console.log(chalk_1.default.gray(`Files: ${filesToCheck.join(', ')}`));
                console.log(chalk_1.default.gray('─'.repeat(60)));
                tasks.forEach((task, index) => {
                    console.log(`\n${index + 1}. ${chalk_1.default.bold(task.title)} [${this.formatPriority(task.priority)}]`);
                    console.log(`   ${chalk_1.default.gray('Status:')} ${this.formatStatus(task.status)}`);
                    console.log(`   ${chalk_1.default.gray('ID:')} ${task.id}`);
                    if (task.aiContext?.codeFiles?.length) {
                        const relatedFiles = task.aiContext.codeFiles.filter(file => filesToCheck.some(f => f.includes(file) || file.includes(f)));
                        if (relatedFiles.length > 0) {
                            console.log(`   ${chalk_1.default.gray('Related files:')} ${relatedFiles.join(', ')}`);
                        }
                    }
                });
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error analyzing context:'), error);
            }
        });
    }
    static formatTaskForCursor(task) {
        return {
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            type: task.type,
            status: task.status,
            estimatedHours: task.estimatedHours,
            dueDate: task.dueDate,
            aiContext: task.aiContext,
            dependencies: task.dependencies,
            instructions: this.generateCursorInstructions(task),
            acceptanceCriteria: task.aiContext?.testCriteria || [],
            filesToModify: task.aiContext?.codeFiles || [],
            commandsToRun: task.aiContext?.commands || [],
            references: task.aiContext?.references || [],
        };
    }
    static formatTaskAsMarkdown(task) {
        const instructions = this.generateCursorInstructions(task);
        return `# Task: ${task.title}

## Description
${task.description}

## Priority: ${task.priority.toUpperCase()}
## Type: ${task.type.toUpperCase()}
## Status: ${task.status.toUpperCase()}

## Instructions for Cursor AI
${instructions}

## Files to Modify
${task.aiContext?.codeFiles?.map((file) => `- ${file}`).join('\n') || 'No specific files specified'}

## Commands to Run
${task.aiContext?.commands?.map((cmd) => `\`\`\`bash\n${cmd}\n\`\`\``).join('\n\n') || 'No specific commands specified'}

## Acceptance Criteria
${task.aiContext?.testCriteria?.map((criteria) => `- [ ] ${criteria}`).join('\n') || 'No specific criteria specified'}

## References
${task.aiContext?.references?.map((ref) => `- ${ref}`).join('\n') || 'No references provided'}

---
Task ID: ${task.id}
`;
    }
    static formatTaskForTerminal(task) {
        const output = [];
        output.push(chalk_1.default.bold.green(`\n🎯 Task: ${task.title}`));
        output.push(chalk_1.default.gray('─'.repeat(60)));
        output.push(`${chalk_1.default.bold('ID:')} ${task.id}`);
        output.push(`${chalk_1.default.bold('Priority:')} ${this.formatPriority(task.priority)}`);
        output.push(`${chalk_1.default.bold('Type:')} ${task.type}`);
        output.push(`${chalk_1.default.bold('Status:')} ${this.formatStatus(task.status)}`);
        if (task.dueDate) {
            const isOverdue = task.dueDate < new Date();
            const dueDateStr = (0, date_fns_1.format)(task.dueDate, 'PPP');
            output.push(`${chalk_1.default.bold('Due Date:')} ${isOverdue ? chalk_1.default.red(dueDateStr + ' (OVERDUE)') : dueDateStr}`);
        }
        output.push(`\n${chalk_1.default.bold('Description:')}`);
        output.push(task.description);
        const instructions = this.generateCursorInstructions(task);
        output.push(`\n${chalk_1.default.bold.cyan('🤖 Instructions for Cursor AI:')}`);
        output.push(instructions);
        if (task.aiContext?.codeFiles?.length) {
            output.push(`\n${chalk_1.default.bold('📁 Files to Work On:')}`);
            task.aiContext.codeFiles.forEach((file) => {
                output.push(`  • ${file}`);
            });
        }
        if (task.aiContext?.commands?.length) {
            output.push(`\n${chalk_1.default.bold('⚡ Commands to Run:')}`);
            task.aiContext.commands.forEach((cmd) => {
                output.push(`  ${chalk_1.default.cyan('$')} ${cmd}`);
            });
        }
        if (task.aiContext?.testCriteria?.length) {
            output.push(`\n${chalk_1.default.bold('✅ Acceptance Criteria:')}`);
            task.aiContext.testCriteria.forEach((criteria) => {
                output.push(`  • ${criteria}`);
            });
        }
        if (task.aiContext?.references?.length) {
            output.push(`\n${chalk_1.default.bold('🔗 References:')}`);
            task.aiContext.references.forEach((ref) => {
                output.push(`  • ${ref}`);
            });
        }
        output.push(chalk_1.default.gray(`\n💡 Complete with: ai-tasks cursor complete ${task.id}`));
        return output.join('\n');
    }
    static generateCursorInstructions(task) {
        const instructions = [];
        instructions.push(`You are working on: "${task.title}"`);
        instructions.push(`Task Type: ${task.type}`);
        instructions.push(`Priority: ${task.priority}`);
        if (task.description) {
            instructions.push(`\nDetailed Requirements:\n${task.description}`);
        }
        if (task.aiContext?.codeFiles?.length) {
            instructions.push(`\nFocus on these files: ${task.aiContext.codeFiles.join(', ')}`);
        }
        if (task.aiContext?.commands?.length) {
            instructions.push(`\nRun these commands after implementation: ${task.aiContext.commands.join(', ')}`);
        }
        if (task.aiContext?.testCriteria?.length) {
            instructions.push(`\nEnsure these criteria are met:\n${task.aiContext.testCriteria.map((c) => `- ${c}`).join('\n')}`);
        }
        instructions.push('\nImplement this feature completely and autonomously. Do not ask for clarification unless absolutely necessary.');
        return instructions.join('\n');
    }
    static enhanceDescriptionForAI(description) {
        if (description.length < 50) {
            return `${description}\n\nThis task should be implemented autonomously by Cursor AI. Include proper error handling, testing, and documentation as needed.`;
        }
        if (!description.includes('autonomous') && !description.includes('AI')) {
            return `${description}\n\nImplement this autonomously with proper error handling and testing.`;
        }
        return description;
    }
    static formatPriority(priority) {
        const colors = {
            critical: chalk_1.default.red.bold,
            high: chalk_1.default.yellow.bold,
            medium: chalk_1.default.blue.bold,
            low: chalk_1.default.green.bold,
        };
        return colors[priority]?.(priority.toUpperCase()) || priority;
    }
    static formatStatus(status) {
        const colors = {
            todo: chalk_1.default.gray,
            in_progress: chalk_1.default.blue,
            in_review: chalk_1.default.yellow,
            done: chalk_1.default.green,
            blocked: chalk_1.default.red,
            cancelled: chalk_1.default.gray,
        };
        return colors[status]?.(status.replace('_', ' ').toUpperCase()) || status;
    }
}
exports.CursorCommands = CursorCommands;
