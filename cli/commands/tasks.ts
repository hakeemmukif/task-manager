import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { table } from 'table';
import ora from 'ora';
import { format } from 'date-fns';
import { FirebaseService } from '../services/firebase';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
  Task,
  CreateTask,
} from '../../src/types/task';

export class TaskCommands {
  static register(program: Command) {
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
        const spinner = ora('Fetching tasks...').start();
        
        try {
          const filters: any = {};
          
          if (options.project) filters.projectId = options.project;
          if (options.status) filters.status = options.status.split(',');
          if (options.priority) filters.priority = options.priority.split(',');
          if (options.type) filters.type = options.type.split(',');
          if (options.assignee) filters.assignee = options.assignee;
          if (options.tags) filters.tags = options.tags.split(',');

          const tasks = await FirebaseService.getTasks({
            filters,
            limit: parseInt(options.limit),
            sortBy: 'priority',
            sortOrder: 'desc',
          });

          spinner.stop();

          if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks found.'));
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
              task.dueDate ? format(task.dueDate, 'MMM dd') : '-'
            ]);
          });

          console.log(table(tableData));
          console.log(chalk.gray(`\nShowing ${tasks.length} tasks`));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error fetching tasks:'), error);
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
          let taskData: Partial<CreateTask> = {};

          // Interactive mode if no options provided
          if (!options.project || !options.title || !options.description) {
            const projects = await FirebaseService.getProjects();
            
            const answers = await inquirer.prompt([
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
                choices: Object.values(TaskPriority),
                default: TaskPriority.MEDIUM,
                when: !options.priority,
              },
              {
                type: 'list',
                name: 'type',
                message: 'Task type:',
                choices: Object.values(TaskType),
                default: TaskType.FEATURE,
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
                  if (!input) return true;
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
          if (options.project) taskData.projectId = options.project;
          if (options.title) taskData.title = options.title;
          if (options.description) taskData.description = options.description;
          if (options.priority) taskData.priority = options.priority as TaskPriority;
          if (options.type) taskData.type = options.type as TaskType;
          if (options.assignee) taskData.assignee = options.assignee;
          if (options.due) taskData.dueDate = new Date(options.due);
          if (options.tags) taskData.tags = options.tags.split(',').map((t: string) => t.trim());

          // Set defaults
          taskData.status = TaskStatus.TODO;
          taskData.priority = taskData.priority || TaskPriority.MEDIUM;
          taskData.type = taskData.type || TaskType.FEATURE;
          taskData.tags = taskData.tags || [];

          const spinner = ora('Creating task...').start();
          const task = await FirebaseService.createTask(taskData as CreateTask);
          spinner.stop();

          console.log(chalk.green('✓ Task created successfully!'));
          console.log(chalk.gray(`ID: ${task.id}`));
          console.log(chalk.gray(`Title: ${task.title}`));
        } catch (error) {
          console.error(chalk.red('Error creating task:'), error);
        }
      });

    // Show task details
    taskCmd
      .command('show <taskId>')
      .description('Show task details')
      .action(async (taskId) => {
        const spinner = ora('Fetching task...').start();
        
        try {
          const task = await FirebaseService.getTask(taskId);
          spinner.stop();

          if (!task) {
            console.log(chalk.red('Task not found.'));
            return;
          }

          console.log(chalk.bold.blue(`\n${task.title}`));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`${chalk.bold('ID:')} ${task.id}`);
          console.log(`${chalk.bold('Project:')} ${task.projectId}`);
          console.log(`${chalk.bold('Status:')} ${this.formatStatus(task.status)}`);
          console.log(`${chalk.bold('Priority:')} ${this.formatPriority(task.priority)}`);
          console.log(`${chalk.bold('Type:')} ${task.type}`);
          if (task.assignee) console.log(`${chalk.bold('Assignee:')} ${task.assignee}`);
          if (task.dueDate) console.log(`${chalk.bold('Due Date:')} ${format(task.dueDate, 'PPP')}`);
          if (task.tags.length > 0) console.log(`${chalk.bold('Tags:')} ${task.tags.join(', ')}`);
          
          console.log(`\n${chalk.bold('Description:')}`);
          console.log(task.description);

          if (task.aiContext) {
            console.log(`\n${chalk.bold.cyan('AI Context:')}`);
            if (task.aiContext.codeFiles?.length) {
              console.log(`${chalk.bold('Code Files:')} ${task.aiContext.codeFiles.join(', ')}`);
            }
            if (task.aiContext.commands?.length) {
              console.log(`${chalk.bold('Commands:')} ${task.aiContext.commands.join(', ')}`);
            }
            if (task.aiContext.testCriteria?.length) {
              console.log(`${chalk.bold('Test Criteria:')}`);
              task.aiContext.testCriteria.forEach(criteria => {
                console.log(`  • ${criteria}`);
              });
            }
          }

          if (task.comments.length > 0) {
            console.log(`\n${chalk.bold('Comments:')}`);
            task.comments.forEach(comment => {
              console.log(`${chalk.gray(format(comment.createdAt, 'PPp'))} - ${comment.author}:`);
              console.log(`  ${comment.content}\n`);
            });
          }
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error fetching task:'), error);
        }
      });

    // Update task status
    taskCmd
      .command('status <taskId> <status>')
      .description('Update task status')
      .action(async (taskId, status) => {
        const spinner = ora('Updating task status...').start();
        
        try {
          await FirebaseService.updateTaskStatus(taskId, status as TaskStatus);
          spinner.stop();
          console.log(chalk.green(`✓ Task status updated to ${status}`));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error updating task status:'), error);
        }
      });

    // Add comment
    taskCmd
      .command('comment <taskId> <content>')
      .description('Add comment to task')
      .option('-a, --author <author>', 'Comment author', 'AI Assistant')
      .action(async (taskId, content, options) => {
        const spinner = ora('Adding comment...').start();
        
        try {
          await FirebaseService.addTaskComment(taskId, content, options.author);
          spinner.stop();
          console.log(chalk.green('✓ Comment added successfully'));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error adding comment:'), error);
        }
      });
  }

  private static formatPriority(priority: TaskPriority): string {
    const colors = {
      [TaskPriority.CRITICAL]: chalk.red.bold,
      [TaskPriority.HIGH]: chalk.red,
      [TaskPriority.MEDIUM]: chalk.yellow,
      [TaskPriority.LOW]: chalk.green,
    };
    return colors[priority](priority.toUpperCase());
  }

  private static formatStatus(status: TaskStatus): string {
    const colors = {
      [TaskStatus.TODO]: chalk.gray,
      [TaskStatus.IN_PROGRESS]: chalk.blue,
      [TaskStatus.IN_REVIEW]: chalk.yellow,
      [TaskStatus.DONE]: chalk.green,
      [TaskStatus.BLOCKED]: chalk.red,
      [TaskStatus.CANCELLED]: chalk.gray.strikethrough,
    };
    return colors[status](status.replace('_', ' ').toUpperCase());
  }
} 