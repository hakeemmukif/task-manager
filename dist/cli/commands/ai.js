"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICommands = void 0;
const chalk_1 = __importDefault(require("chalk"));
const table_1 = require("table");
const ora_1 = __importDefault(require("ora"));
const date_fns_1 = require("date-fns");
const firebase_1 = require("../services/firebase");
const task_1 = require("../../src/types/task");
class AICommands {
    static register(program) {
        const aiCmd = program
            .command('ai')
            .description('AI-specific commands for Cursor integration');
        // Get next task to work on
        aiCmd
            .command('next')
            .description('Get the next highest priority task to work on')
            .option('-p, --project <projectId>', 'Filter by project ID')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Finding next task...').start();
            try {
                const task = await firebase_1.FirebaseService.getNextTask(options.project);
                spinner.stop();
                if (!task) {
                    console.log(chalk_1.default.yellow('No pending tasks found.'));
                    return;
                }
                console.log(chalk_1.default.bold.green('\n🎯 Next Task to Work On:'));
                console.log(chalk_1.default.gray('─'.repeat(50)));
                console.log(`${chalk_1.default.bold('Title:')} ${task.title}`);
                console.log(`${chalk_1.default.bold('ID:')} ${task.id}`);
                console.log(`${chalk_1.default.bold('Priority:')} ${this.formatPriority(task.priority)}`);
                console.log(`${chalk_1.default.bold('Status:')} ${this.formatStatus(task.status)}`);
                console.log(`${chalk_1.default.bold('Type:')} ${task.type}`);
                if (task.dueDate) {
                    const isOverdue = task.dueDate < new Date();
                    const dueDateStr = (0, date_fns_1.format)(task.dueDate, 'PPP');
                    console.log(`${chalk_1.default.bold('Due Date:')} ${isOverdue ? chalk_1.default.red(dueDateStr + ' (OVERDUE)') : dueDateStr}`);
                }
                console.log(`\n${chalk_1.default.bold('Description:')}`);
                console.log(task.description);
                if (task.aiContext) {
                    console.log(`\n${chalk_1.default.bold.cyan('🤖 AI Context:')}`);
                    if (task.aiContext.codeFiles?.length) {
                        console.log(`${chalk_1.default.bold('📁 Code Files:')}`);
                        task.aiContext.codeFiles.forEach(file => {
                            console.log(`  • ${file}`);
                        });
                    }
                    if (task.aiContext.commands?.length) {
                        console.log(`\n${chalk_1.default.bold('⚡ Commands to Run:')}`);
                        task.aiContext.commands.forEach(cmd => {
                            console.log(`  ${chalk_1.default.cyan('$')} ${cmd}`);
                        });
                    }
                    if (task.aiContext.testCriteria?.length) {
                        console.log(`\n${chalk_1.default.bold('✅ Test Criteria:')}`);
                        task.aiContext.testCriteria.forEach(criteria => {
                            console.log(`  • ${criteria}`);
                        });
                    }
                    if (task.aiContext.references?.length) {
                        console.log(`\n${chalk_1.default.bold('🔗 References:')}`);
                        task.aiContext.references.forEach(ref => {
                            console.log(`  • ${ref}`);
                        });
                    }
                }
                // Show dependencies if any
                if (task.dependencies.length > 0) {
                    console.log(`\n${chalk_1.default.bold.yellow('⚠️  Dependencies:')}`);
                    for (const depId of task.dependencies) {
                        try {
                            const depTask = await firebase_1.FirebaseService.getTask(depId);
                            if (depTask) {
                                const statusColor = depTask.status === task_1.TaskStatus.DONE ? chalk_1.default.green : chalk_1.default.red;
                                console.log(`  • ${depTask.title} ${statusColor(`(${depTask.status})`)}`);
                            }
                        }
                        catch (error) {
                            console.log(`  • ${depId} ${chalk_1.default.gray('(not found)')}`);
                        }
                    }
                }
                console.log(chalk_1.default.gray(`\n💡 Tip: Use 'ai-tasks task status ${task.id} in_progress' to start working on this task`));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error finding next task:'), error);
            }
        });
        // Get tasks related to specific files
        aiCmd
            .command('files <files...>')
            .description('Find tasks related to specific files')
            .action(async (files) => {
            const spinner = (0, ora_1.default)('Finding related tasks...').start();
            try {
                const tasks = await firebase_1.FirebaseService.getTasksByFiles(files);
                spinner.stop();
                if (tasks.length === 0) {
                    console.log(chalk_1.default.yellow('No tasks found related to these files.'));
                    return;
                }
                console.log(chalk_1.default.bold.blue(`\n📁 Tasks Related to Files:`));
                console.log(chalk_1.default.gray(`Files: ${files.join(', ')}`));
                console.log(chalk_1.default.gray('─'.repeat(50)));
                // Create table
                const tableData = [
                    ['ID', 'Title', 'Priority', 'Status', 'Related Files']
                ];
                tasks.forEach(task => {
                    const relatedFiles = task.aiContext?.codeFiles?.filter(file => files.some((f) => f.includes(file) || file.includes(f))) || [];
                    tableData.push([
                        task.id.substring(0, 8),
                        task.title.length > 30 ? task.title.substring(0, 27) + '...' : task.title,
                        this.formatPriority(task.priority),
                        this.formatStatus(task.status),
                        relatedFiles.join(', ')
                    ]);
                });
                console.log((0, table_1.table)(tableData));
                console.log(chalk_1.default.gray(`\nFound ${tasks.length} related tasks`));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error finding related tasks:'), error);
            }
        });
        // Get current sprint/active tasks
        aiCmd
            .command('active')
            .description('Show all active tasks (in progress or blocked)')
            .option('-p, --project <projectId>', 'Filter by project ID')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Fetching active tasks...').start();
            try {
                const tasks = await firebase_1.FirebaseService.getTasks({
                    filters: {
                        status: [task_1.TaskStatus.IN_PROGRESS, task_1.TaskStatus.BLOCKED],
                        ...(options.project && { projectId: options.project }),
                    },
                    sortBy: 'priority',
                    sortOrder: 'desc',
                });
                spinner.stop();
                if (tasks.length === 0) {
                    console.log(chalk_1.default.yellow('No active tasks found.'));
                    return;
                }
                console.log(chalk_1.default.bold.blue('\n🚀 Active Tasks:'));
                console.log(chalk_1.default.gray('─'.repeat(50)));
                // Create table
                const tableData = [
                    ['ID', 'Title', 'Priority', 'Status', 'Assignee', 'Due Date']
                ];
                tasks.forEach(task => {
                    tableData.push([
                        task.id.substring(0, 8),
                        task.title.length > 30 ? task.title.substring(0, 27) + '...' : task.title,
                        this.formatPriority(task.priority),
                        this.formatStatus(task.status),
                        task.assignee || '-',
                        task.dueDate ? (0, date_fns_1.format)(task.dueDate, 'MMM dd') : '-'
                    ]);
                });
                console.log((0, table_1.table)(tableData));
                console.log(chalk_1.default.gray(`\nShowing ${tasks.length} active tasks`));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error fetching active tasks:'), error);
            }
        });
        // Quick status update for AI workflow
        aiCmd
            .command('start <taskId>')
            .description('Mark task as in progress and show context')
            .action(async (taskId) => {
            const spinner = (0, ora_1.default)('Starting task...').start();
            try {
                await firebase_1.FirebaseService.updateTaskStatus(taskId, task_1.TaskStatus.IN_PROGRESS);
                const task = await firebase_1.FirebaseService.getTask(taskId);
                spinner.stop();
                if (!task) {
                    console.log(chalk_1.default.red('Task not found.'));
                    return;
                }
                console.log(chalk_1.default.green('✓ Task marked as in progress'));
                console.log(chalk_1.default.bold.blue(`\n🎯 Working on: ${task.title}`));
                if (task.aiContext) {
                    if (task.aiContext.codeFiles?.length) {
                        console.log(`\n${chalk_1.default.bold('📁 Files to work on:')}`);
                        task.aiContext.codeFiles.forEach(file => {
                            console.log(`  • ${file}`);
                        });
                    }
                    if (task.aiContext.commands?.length) {
                        console.log(`\n${chalk_1.default.bold('⚡ Commands to run:')}`);
                        task.aiContext.commands.forEach(cmd => {
                            console.log(`  ${chalk_1.default.cyan('$')} ${cmd}`);
                        });
                    }
                }
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error starting task:'), error);
            }
        });
        // Complete task
        aiCmd
            .command('done <taskId>')
            .description('Mark task as done')
            .option('-c, --comment <comment>', 'Add completion comment')
            .action(async (taskId, options) => {
            const spinner = (0, ora_1.default)('Completing task...').start();
            try {
                await firebase_1.FirebaseService.updateTaskStatus(taskId, task_1.TaskStatus.DONE);
                if (options.comment) {
                    await firebase_1.FirebaseService.addTaskComment(taskId, options.comment, 'AI Assistant');
                }
                spinner.stop();
                console.log(chalk_1.default.green('✓ Task marked as done!'));
                // Get next task suggestion
                const nextTask = await firebase_1.FirebaseService.getNextTask();
                if (nextTask) {
                    console.log(chalk_1.default.gray(`\n💡 Next suggested task: ${nextTask.title} (${nextTask.id.substring(0, 8)})`));
                }
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error completing task:'), error);
            }
        });
        // Show project overview for AI context
        aiCmd
            .command('overview')
            .description('Show project overview with task statistics')
            .option('-p, --project <projectId>', 'Filter by project ID')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Generating overview...').start();
            try {
                const projects = options.project
                    ? [await firebase_1.FirebaseService.getProject(options.project)].filter(Boolean)
                    : await firebase_1.FirebaseService.getProjects();
                spinner.stop();
                for (const project of projects) {
                    if (!project)
                        continue;
                    console.log(chalk_1.default.bold.blue(`\n📊 ${project.name}`));
                    console.log(chalk_1.default.gray('─'.repeat(50)));
                    const tasks = await firebase_1.FirebaseService.getTasks({
                        filters: { projectId: project.id },
                    });
                    const stats = {
                        total: tasks.length,
                        todo: tasks.filter(t => t.status === task_1.TaskStatus.TODO).length,
                        inProgress: tasks.filter(t => t.status === task_1.TaskStatus.IN_PROGRESS).length,
                        done: tasks.filter(t => t.status === task_1.TaskStatus.DONE).length,
                        blocked: tasks.filter(t => t.status === task_1.TaskStatus.BLOCKED).length,
                        critical: tasks.filter(t => t.priority === task_1.TaskPriority.CRITICAL).length,
                        high: tasks.filter(t => t.priority === task_1.TaskPriority.HIGH).length,
                    };
                    console.log(`${chalk_1.default.bold('Total Tasks:')} ${stats.total}`);
                    console.log(`${chalk_1.default.bold('Todo:')} ${stats.todo} | ${chalk_1.default.bold('In Progress:')} ${stats.inProgress} | ${chalk_1.default.bold('Done:')} ${stats.done} | ${chalk_1.default.bold('Blocked:')} ${stats.blocked}`);
                    console.log(`${chalk_1.default.bold('Critical:')} ${chalk_1.default.red(stats.critical)} | ${chalk_1.default.bold('High Priority:')} ${chalk_1.default.yellow(stats.high)}`);
                    if (stats.total > 0) {
                        const completion = Math.round((stats.done / stats.total) * 100);
                        console.log(`${chalk_1.default.bold('Completion:')} ${completion}%`);
                    }
                }
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error generating overview:'), error);
            }
        });
    }
    static formatPriority(priority) {
        const colors = {
            [task_1.TaskPriority.CRITICAL]: chalk_1.default.red.bold,
            [task_1.TaskPriority.HIGH]: chalk_1.default.red,
            [task_1.TaskPriority.MEDIUM]: chalk_1.default.yellow,
            [task_1.TaskPriority.LOW]: chalk_1.default.green,
        };
        return colors[priority](priority.toUpperCase());
    }
    static formatStatus(status) {
        const colors = {
            [task_1.TaskStatus.TODO]: chalk_1.default.gray,
            [task_1.TaskStatus.IN_PROGRESS]: chalk_1.default.blue,
            [task_1.TaskStatus.IN_REVIEW]: chalk_1.default.yellow,
            [task_1.TaskStatus.DONE]: chalk_1.default.green,
            [task_1.TaskStatus.BLOCKED]: chalk_1.default.red,
            [task_1.TaskStatus.CANCELLED]: chalk_1.default.gray.strikethrough,
        };
        return colors[status](status.replace('_', ' ').toUpperCase());
    }
}
exports.AICommands = AICommands;
