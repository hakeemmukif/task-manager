"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskCommands = void 0;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const table_1 = require("table");
const ora_1 = __importDefault(require("ora"));
const date_fns_1 = require("date-fns");
const firebase_1 = require("../services/firebase");
const task_1 = require("../../src/types/task");
class TaskCommands {
    static register(program) {
        const taskCmd = program
            .command('task')
            .alias('t')
            .description('Task management commands');
        // List tasks
        taskCmd
            .command('list')
            .alias('ls')
            .description('List tasks')
            .option('-p, --project <projectId>', 'Filter by project ID')
            .option('-s, --status <status>', 'Filter by status (comma-separated)')
            .option('--priority <priority>', 'Filter by priority (comma-separated)')
            .option('--type <type>', 'Filter by type (comma-separated)')
            .option('-a, --assignee <assignee>', 'Filter by assignee')
            .option('--tags <tags>', 'Filter by tags (comma-separated)')
            .option('--limit <limit>', 'Limit number of results', '20')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Fetching tasks...').start();
            try {
                const filters = {};
                if (options.project)
                    filters.projectId = options.project;
                if (options.status)
                    filters.status = options.status.split(',');
                if (options.priority)
                    filters.priority = options.priority.split(',');
                if (options.type)
                    filters.type = options.type.split(',');
                if (options.assignee)
                    filters.assignee = options.assignee;
                if (options.tags)
                    filters.tags = options.tags.split(',');
                const tasks = await firebase_1.FirebaseService.getTasks({
                    filters,
                    limit: parseInt(options.limit),
                    sortBy: 'priority',
                    sortOrder: 'desc',
                });
                spinner.stop();
                if (tasks.length === 0) {
                    console.log(chalk_1.default.yellow('No tasks found.'));
                    return;
                }
                // Create table
                const tableData = [
                    ['ID', 'Title', 'Project', 'Priority', 'Status', 'Type', 'Due Date']
                ];
                tasks.forEach(task => {
                    tableData.push([
                        task.id.substring(0, 8),
                        task.title.length > 30 ? task.title.substring(0, 27) + '...' : task.title,
                        task.projectId.substring(0, 8),
                        this.formatPriority(task.priority),
                        this.formatStatus(task.status),
                        task.type,
                        task.dueDate ? (0, date_fns_1.format)(task.dueDate, 'MMM dd') : '-'
                    ]);
                });
                console.log((0, table_1.table)(tableData));
                console.log(chalk_1.default.gray(`\nShowing ${tasks.length} tasks`));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error fetching tasks:'), error);
            }
        });
        // Create task
        taskCmd
            .command('create')
            .alias('new')
            .description('Create a new task')
            .option('-p, --project <projectId>', 'Project ID')
            .option('-t, --title <title>', 'Task title')
            .option('-d, --description <description>', 'Task description')
            .option('--priority <priority>', 'Task priority (critical, high, medium, low)')
            .option('--type <type>', 'Task type (feature, bug, improvement, etc.)')
            .option('--assignee <assignee>', 'Assignee')
            .option('--due <date>', 'Due date (YYYY-MM-DD)')
            .option('--tags <tags>', 'Tags (comma-separated)')
            .action(async (options) => {
            try {
                let taskData = {};
                // Interactive mode if no options provided
                if (!options.project || !options.title || !options.description) {
                    const projects = await firebase_1.FirebaseService.getProjects();
                    const answers = await inquirer_1.default.prompt([
                        {
                            type: 'list',
                            name: 'projectId',
                            message: 'Select project:',
                            choices: projects.map(p => ({ name: p.name, value: p.id })),
                            when: !options.project,
                        },
                        {
                            type: 'input',
                            name: 'title',
                            message: 'Task title:',
                            when: !options.title,
                            validate: (input) => input.length > 0 || 'Title is required',
                        },
                        {
                            type: 'editor',
                            name: 'description',
                            message: 'Task description:',
                            when: !options.description,
                            validate: (input) => input.length >= 10 || 'Description must be at least 10 characters',
                        },
                        {
                            type: 'list',
                            name: 'priority',
                            message: 'Priority:',
                            choices: Object.values(task_1.TaskPriority),
                            default: task_1.TaskPriority.MEDIUM,
                            when: !options.priority,
                        },
                        {
                            type: 'list',
                            name: 'type',
                            message: 'Task type:',
                            choices: Object.values(task_1.TaskType),
                            default: task_1.TaskType.FEATURE,
                            when: !options.type,
                        },
                        {
                            type: 'input',
                            name: 'assignee',
                            message: 'Assignee (optional):',
                            when: !options.assignee,
                        },
                        {
                            type: 'input',
                            name: 'dueDate',
                            message: 'Due date (YYYY-MM-DD, optional):',
                            when: !options.due,
                            validate: (input) => {
                                if (!input)
                                    return true;
                                const date = new Date(input);
                                return !isNaN(date.getTime()) || 'Invalid date format';
                            },
                        },
                        {
                            type: 'input',
                            name: 'tags',
                            message: 'Tags (comma-separated, optional):',
                            when: !options.tags,
                        },
                    ]);
                    taskData = { ...answers };
                }
                // Use command line options
                if (options.project)
                    taskData.projectId = options.project;
                if (options.title)
                    taskData.title = options.title;
                if (options.description)
                    taskData.description = options.description;
                if (options.priority)
                    taskData.priority = options.priority;
                if (options.type)
                    taskData.type = options.type;
                if (options.assignee)
                    taskData.assignee = options.assignee;
                if (options.due)
                    taskData.dueDate = new Date(options.due);
                if (options.tags)
                    taskData.tags = options.tags.split(',').map((t) => t.trim());
                // Set defaults
                taskData.status = task_1.TaskStatus.TODO;
                taskData.priority = taskData.priority || task_1.TaskPriority.MEDIUM;
                taskData.type = taskData.type || task_1.TaskType.FEATURE;
                taskData.tags = taskData.tags || [];
                const spinner = (0, ora_1.default)('Creating task...').start();
                const task = await firebase_1.FirebaseService.createTask(taskData);
                spinner.stop();
                console.log(chalk_1.default.green('✓ Task created successfully!'));
                console.log(chalk_1.default.gray(`ID: ${task.id}`));
                console.log(chalk_1.default.gray(`Title: ${task.title}`));
            }
            catch (error) {
                console.error(chalk_1.default.red('Error creating task:'), error);
            }
        });
        // Show task details
        taskCmd
            .command('show <taskId>')
            .description('Show task details')
            .action(async (taskId) => {
            const spinner = (0, ora_1.default)('Fetching task...').start();
            try {
                const task = await firebase_1.FirebaseService.getTask(taskId);
                spinner.stop();
                if (!task) {
                    console.log(chalk_1.default.red('Task not found.'));
                    return;
                }
                console.log(chalk_1.default.bold.blue(`\n${task.title}`));
                console.log(chalk_1.default.gray('─'.repeat(50)));
                console.log(`${chalk_1.default.bold('ID:')} ${task.id}`);
                console.log(`${chalk_1.default.bold('Project:')} ${task.projectId}`);
                console.log(`${chalk_1.default.bold('Status:')} ${this.formatStatus(task.status)}`);
                console.log(`${chalk_1.default.bold('Priority:')} ${this.formatPriority(task.priority)}`);
                console.log(`${chalk_1.default.bold('Type:')} ${task.type}`);
                if (task.assignee)
                    console.log(`${chalk_1.default.bold('Assignee:')} ${task.assignee}`);
                if (task.dueDate)
                    console.log(`${chalk_1.default.bold('Due Date:')} ${(0, date_fns_1.format)(task.dueDate, 'PPP')}`);
                if (task.tags.length > 0)
                    console.log(`${chalk_1.default.bold('Tags:')} ${task.tags.join(', ')}`);
                console.log(`\n${chalk_1.default.bold('Description:')}`);
                console.log(task.description);
                if (task.aiContext) {
                    console.log(`\n${chalk_1.default.bold.cyan('AI Context:')}`);
                    if (task.aiContext.codeFiles?.length) {
                        console.log(`${chalk_1.default.bold('Code Files:')} ${task.aiContext.codeFiles.join(', ')}`);
                    }
                    if (task.aiContext.commands?.length) {
                        console.log(`${chalk_1.default.bold('Commands:')} ${task.aiContext.commands.join(', ')}`);
                    }
                    if (task.aiContext.testCriteria?.length) {
                        console.log(`${chalk_1.default.bold('Test Criteria:')}`);
                        task.aiContext.testCriteria.forEach(criteria => {
                            console.log(`  • ${criteria}`);
                        });
                    }
                }
                if (task.comments.length > 0) {
                    console.log(`\n${chalk_1.default.bold('Comments:')}`);
                    task.comments.forEach(comment => {
                        console.log(`${chalk_1.default.gray((0, date_fns_1.format)(comment.createdAt, 'PPp'))} - ${comment.author}:`);
                        console.log(`  ${comment.content}\n`);
                    });
                }
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error fetching task:'), error);
            }
        });
        // Update task status
        taskCmd
            .command('status <taskId> <status>')
            .description('Update task status')
            .action(async (taskId, status) => {
            const spinner = (0, ora_1.default)('Updating task status...').start();
            try {
                await firebase_1.FirebaseService.updateTaskStatus(taskId, status);
                spinner.stop();
                console.log(chalk_1.default.green(`✓ Task status updated to ${status}`));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error updating task status:'), error);
            }
        });
        // Add comment
        taskCmd
            .command('comment <taskId> <content>')
            .description('Add comment to task')
            .option('-a, --author <author>', 'Comment author', 'AI Assistant')
            .action(async (taskId, content, options) => {
            const spinner = (0, ora_1.default)('Adding comment...').start();
            try {
                await firebase_1.FirebaseService.addTaskComment(taskId, content, options.author);
                spinner.stop();
                console.log(chalk_1.default.green('✓ Comment added successfully'));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error adding comment:'), error);
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
exports.TaskCommands = TaskCommands;
