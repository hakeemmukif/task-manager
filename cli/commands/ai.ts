import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import { format } from 'date-fns';
import { FirebaseService } from '../services/firebase';
import { TaskStatus, TaskPriority } from '../../src/types/task';

export class AICommands {
  static register(program: Command) {
    const aiCmd = program
      .command('ai')
      .description('AI-specific commands for Cursor integration');

    // Get next task to work on
    aiCmd
      .command('next')
      .description('Get the next highest priority task to work on')
      .option('-p, --project <projectId>', 'Filter by project ID')
      .action(async (options) => {
        const spinner = ora('Finding next task...').start();
        
        try {
          const task = await FirebaseService.getNextTask(options.project);
          spinner.stop();

          if (!task) {
            console.log(chalk.yellow('No pending tasks found.'));
            return;
          }

          console.log(chalk.bold.green('\n🎯 Next Task to Work On:'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`${chalk.bold('Title:')} ${task.title}`);
          console.log(`${chalk.bold('ID:')} ${task.id}`);
          console.log(`${chalk.bold('Priority:')} ${this.formatPriority(task.priority)}`);
          console.log(`${chalk.bold('Status:')} ${this.formatStatus(task.status)}`);
          console.log(`${chalk.bold('Type:')} ${task.type}`);
          
          if (task.dueDate) {
            const isOverdue = task.dueDate < new Date();
            const dueDateStr = format(task.dueDate, 'PPP');
            console.log(`${chalk.bold('Due Date:')} ${isOverdue ? chalk.red(dueDateStr + ' (OVERDUE)') : dueDateStr}`);
          }

          console.log(`\n${chalk.bold('Description:')}`);
          console.log(task.description);

          if (task.aiContext) {
            console.log(`\n${chalk.bold.cyan('🤖 AI Context:')}`);
            
            if (task.aiContext.codeFiles?.length) {
              console.log(`${chalk.bold('📁 Code Files:')}`);
              task.aiContext.codeFiles.forEach(file => {
                console.log(`  • ${file}`);
              });
            }
            
            if (task.aiContext.commands?.length) {
              console.log(`\n${chalk.bold('⚡ Commands to Run:')}`);
              task.aiContext.commands.forEach(cmd => {
                console.log(`  ${chalk.cyan('$')} ${cmd}`);
              });
            }
            
            if (task.aiContext.testCriteria?.length) {
              console.log(`\n${chalk.bold('✅ Test Criteria:')}`);
              task.aiContext.testCriteria.forEach(criteria => {
                console.log(`  • ${criteria}`);
              });
            }
            
            if (task.aiContext.references?.length) {
              console.log(`\n${chalk.bold('🔗 References:')}`);
              task.aiContext.references.forEach(ref => {
                console.log(`  • ${ref}`);
              });
            }
          }

          // Show dependencies if any
          if (task.dependencies.length > 0) {
            console.log(`\n${chalk.bold.yellow('⚠️  Dependencies:')}`);
            for (const depId of task.dependencies) {
              try {
                const depTask = await FirebaseService.getTask(depId);
                if (depTask) {
                  const statusColor = depTask.status === TaskStatus.DONE ? chalk.green : chalk.red;
                  console.log(`  • ${depTask.title} ${statusColor(`(${depTask.status})`)}`);
                }
              } catch (error) {
                console.log(`  • ${depId} ${chalk.gray('(not found)')}`);
              }
            }
          }

          console.log(chalk.gray(`\n💡 Tip: Use 'ai-tasks task status ${task.id} in_progress' to start working on this task`));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error finding next task:'), error);
        }
      });

    // Get tasks related to specific files
    aiCmd
      .command('files <files...>')
      .description('Find tasks related to specific files')
      .action(async (files) => {
        const spinner = ora('Finding related tasks...').start();
        
        try {
          const tasks = await FirebaseService.getTasksByFiles(files);
          spinner.stop();

          if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks found related to these files.'));
            return;
          }

          console.log(chalk.bold.blue(`\n📁 Tasks Related to Files:`));
          console.log(chalk.gray(`Files: ${files.join(', ')}`));
          console.log(chalk.gray('─'.repeat(50)));

          // Create table
          const tableData = [
            ['ID', 'Title', 'Priority', 'Status', 'Related Files']
          ];

          tasks.forEach(task => {
            const relatedFiles = task.aiContext?.codeFiles?.filter(file => 
              files.some((f: string) => f.includes(file) || file.includes(f))
            ) || [];

            tableData.push([
              task.id.substring(0, 8),
              task.title.length > 30 ? task.title.substring(0, 27) + '...' : task.title,
              this.formatPriority(task.priority),
              this.formatStatus(task.status),
              relatedFiles.join(', ')
            ]);
          });

          console.log(table(tableData));
          console.log(chalk.gray(`\nFound ${tasks.length} related tasks`));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error finding related tasks:'), error);
        }
      });

    // Get current sprint/active tasks
    aiCmd
      .command('active')
      .description('Show all active tasks (in progress or blocked)')
      .option('-p, --project <projectId>', 'Filter by project ID')
      .action(async (options) => {
        const spinner = ora('Fetching active tasks...').start();
        
        try {
          const tasks = await FirebaseService.getTasks({
            filters: {
              status: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
              ...(options.project && { projectId: options.project }),
            },
            sortBy: 'priority',
            sortOrder: 'desc',
          });

          spinner.stop();

          if (tasks.length === 0) {
            console.log(chalk.yellow('No active tasks found.'));
            return;
          }

          console.log(chalk.bold.blue('\n🚀 Active Tasks:'));
          console.log(chalk.gray('─'.repeat(50)));

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
              task.dueDate ? format(task.dueDate, 'MMM dd') : '-'
            ]);
          });

          console.log(table(tableData));
          console.log(chalk.gray(`\nShowing ${tasks.length} active tasks`));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error fetching active tasks:'), error);
        }
      });

    // Quick status update for AI workflow
    aiCmd
      .command('start <taskId>')
      .description('Mark task as in progress and show context')
      .action(async (taskId) => {
        const spinner = ora('Starting task...').start();
        
        try {
          await FirebaseService.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
          const task = await FirebaseService.getTask(taskId);
          spinner.stop();

          if (!task) {
            console.log(chalk.red('Task not found.'));
            return;
          }

          console.log(chalk.green('✓ Task marked as in progress'));
          console.log(chalk.bold.blue(`\n🎯 Working on: ${task.title}`));
          
          if (task.aiContext) {
            if (task.aiContext.codeFiles?.length) {
              console.log(`\n${chalk.bold('📁 Files to work on:')}`);
              task.aiContext.codeFiles.forEach(file => {
                console.log(`  • ${file}`);
              });
            }
            
            if (task.aiContext.commands?.length) {
              console.log(`\n${chalk.bold('⚡ Commands to run:')}`);
              task.aiContext.commands.forEach(cmd => {
                console.log(`  ${chalk.cyan('$')} ${cmd}`);
              });
            }
          }
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error starting task:'), error);
        }
      });

    // Complete task
    aiCmd
      .command('done <taskId>')
      .description('Mark task as done')
      .option('-c, --comment <comment>', 'Add completion comment')
      .action(async (taskId, options) => {
        const spinner = ora('Completing task...').start();
        
        try {
          await FirebaseService.updateTaskStatus(taskId, TaskStatus.DONE);
          
          if (options.comment) {
            await FirebaseService.addTaskComment(taskId, options.comment, 'AI Assistant');
          }
          
          spinner.stop();
          console.log(chalk.green('✓ Task marked as done!'));
          
          // Get next task suggestion
          const nextTask = await FirebaseService.getNextTask();
          if (nextTask) {
            console.log(chalk.gray(`\n💡 Next suggested task: ${nextTask.title} (${nextTask.id.substring(0, 8)})`));
          }
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error completing task:'), error);
        }
      });

    // Show project overview for AI context
    aiCmd
      .command('overview')
      .description('Show project overview with task statistics')
      .option('-p, --project <projectId>', 'Filter by project ID')
      .action(async (options) => {
        const spinner = ora('Generating overview...').start();
        
        try {
          const projects = options.project 
            ? [await FirebaseService.getProject(options.project)].filter(Boolean)
            : await FirebaseService.getProjects();

          spinner.stop();

          for (const project of projects) {
            if (!project) continue;

            console.log(chalk.bold.blue(`\n📊 ${project.name}`));
            console.log(chalk.gray('─'.repeat(50)));

            const tasks = await FirebaseService.getTasks({
              filters: { projectId: project.id },
            });

            const stats = {
              total: tasks.length,
              todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
              inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
              done: tasks.filter(t => t.status === TaskStatus.DONE).length,
              blocked: tasks.filter(t => t.status === TaskStatus.BLOCKED).length,
              critical: tasks.filter(t => t.priority === TaskPriority.CRITICAL).length,
              high: tasks.filter(t => t.priority === TaskPriority.HIGH).length,
            };

            console.log(`${chalk.bold('Total Tasks:')} ${stats.total}`);
            console.log(`${chalk.bold('Todo:')} ${stats.todo} | ${chalk.bold('In Progress:')} ${stats.inProgress} | ${chalk.bold('Done:')} ${stats.done} | ${chalk.bold('Blocked:')} ${stats.blocked}`);
            console.log(`${chalk.bold('Critical:')} ${chalk.red(stats.critical)} | ${chalk.bold('High Priority:')} ${chalk.yellow(stats.high)}`);

            if (stats.total > 0) {
              const completion = Math.round((stats.done / stats.total) * 100);
              console.log(`${chalk.bold('Completion:')} ${completion}%`);
            }
          }
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error generating overview:'), error);
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