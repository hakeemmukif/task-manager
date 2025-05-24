import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import { format } from 'date-fns';
import { FirebaseService } from '../services/firebase';
import { ReadmeParser } from '../services/readme-parser';
import { TaskStatus, TaskPriority, TaskType } from '../../src/types/task';

export class CursorCommands {
  static register(program: Command) {
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
        const spinner = ora('Finding optimal task for Cursor AI...').start();
        
        try {
          const task = await FirebaseService.getNextTask(options.project);
          spinner.stop();

          if (!task) {
            console.log(chalk.yellow('No actionable tasks found.'));
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
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error finding task:'), error);
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
            console.error(chalk.red('Title and description are required for AI tasks'));
            return;
          }

          let projectId = options.project;
          if (!projectId) {
            const projects = await FirebaseService.getProjects();
            if (projects.length === 0) {
              console.error(chalk.red('No projects found. Create a project first.'));
              return;
            }
            projectId = projects[0].id; // Use first project as default
          }

          const taskData = {
            title: options.title,
            description: this.enhanceDescriptionForAI(options.description),
            projectId,
            priority: options.priority as TaskPriority,
            type: options.type as TaskType,
            status: TaskStatus.TODO,
            tags: ['ai-optimized', options.type],
            dependencies: [],
            blockedBy: [],
            attachments: [],
            comments: [],
            aiContext: {
              codeFiles: options.files ? options.files.split(',').map((f: string) => f.trim()) : [],
              commands: options.commands ? options.commands.split(',').map((c: string) => c.trim()) : [],
              testCriteria: options.tests ? options.tests.split(',').map((t: string) => t.trim()) : [],
              references: [],
            },
          };

          const spinner = ora('Creating AI-optimized task...').start();
          const task = await FirebaseService.createTask(taskData);
          spinner.stop();

          console.log(chalk.green('✓ AI-optimized task created successfully!'));
          console.log(chalk.gray(`ID: ${task.id}`));
          console.log(chalk.gray(`Title: ${task.title}`));
          console.log(chalk.cyan('\n💡 Use "ai-tasks cursor next-task" to get this task with full context'));
        } catch (error) {
          console.error(chalk.red('Error creating AI task:'), error);
        }
      });

    // Import tasks from current directory's README
    cursorCmd
      .command('import-readme')
      .description('Import pending features from README.md in current directory')
      .option('-f, --file <file>', 'README file path', './README.md')
      .option('-p, --project <projectId>', 'Target project ID')
      .action(async (options) => {
        const spinner = ora('Parsing README.md for pending features...').start();
        
        try {
          const features = ReadmeParser.parseReadme(options.file);
          spinner.stop();

          if (features.length === 0) {
            console.log(chalk.yellow('No pending features found in README.md'));
            console.log(chalk.gray('💡 Add a "## Pending Features" section to your README.md'));
            return;
          }

          let projectId = options.project;
          if (!projectId) {
            const projects = await FirebaseService.getProjects();
            if (projects.length === 0) {
              console.error(chalk.red('No projects found. Create a project first.'));
              return;
            }
            projectId = projects[0].id;
          }

          const importSpinner = ora('Importing features as AI-optimized tasks...').start();
          let imported = 0;

          for (const feature of features) {
            try {
              const task = ReadmeParser.featureToTask(feature, projectId);
              // Enhance for AI
              task.description = this.enhanceDescriptionForAI(task.description);
              task.tags = [...task.tags, 'ai-optimized', 'readme-import'];
              
              await FirebaseService.createTask(task);
              imported++;
            } catch (error) {
              console.error(chalk.red(`Failed to import: ${feature.title}`), error);
            }
          }

          importSpinner.stop();
          console.log(chalk.green(`✓ Successfully imported ${imported}/${features.length} features as AI-optimized tasks`));
          console.log(chalk.cyan('\n💡 Use "ai-tasks cursor next-task" to start working on these tasks'));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error importing from README:'), error);
        }
      });

    // Mark task as completed and get next
    cursorCmd
      .command('complete <taskId>')
      .description('Mark a task as completed and get the next task')
      .option('--comment <comment>', 'Completion comment')
      .action(async (taskId, options) => {
        const spinner = ora('Completing task...').start();
        
        try {
          await FirebaseService.updateTaskStatus(taskId, TaskStatus.DONE);
          
          if (options.comment) {
            await FirebaseService.addTaskComment(taskId, options.comment, 'Cursor AI');
          }

          const nextTask = await FirebaseService.getNextTask();
          spinner.stop();

          console.log(chalk.green('✓ Task completed successfully!'));
          
          if (nextTask) {
            console.log(chalk.bold.blue('\n🎯 Next Task:'));
            console.log(this.formatTaskForTerminal(nextTask));
          } else {
            console.log(chalk.yellow('\n🎉 No more tasks! All caught up.'));
          }
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error completing task:'), error);
        }
      });

    // Get task context for current working directory
    cursorCmd
      .command('context')
      .description('Get tasks related to files in current working directory')
      .option('--files <files>', 'Specific files to check (comma-separated)')
      .action(async (options) => {
        const spinner = ora('Analyzing current context...').start();
        
        try {
          let filesToCheck: string[] = [];
          
          if (options.files) {
            filesToCheck = options.files.split(',').map((f: string) => f.trim());
          } else {
            // Auto-detect common files in current directory
            const fs = await import('node:fs');
            const path = await import('node:path');
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

          const tasks = await FirebaseService.getTasksByFiles(filesToCheck);
          spinner.stop();

          if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks found related to current context.'));
            return;
          }

          console.log(chalk.bold.blue(`\n📁 Tasks Related to Current Context:`));
          console.log(chalk.gray(`Files: ${filesToCheck.join(', ')}`));
          console.log(chalk.gray('─'.repeat(60)));

          tasks.forEach((task, index) => {
            console.log(`\n${index + 1}. ${chalk.bold(task.title)} [${this.formatPriority(task.priority)}]`);
            console.log(`   ${chalk.gray('Status:')} ${this.formatStatus(task.status)}`);
            console.log(`   ${chalk.gray('ID:')} ${task.id}`);
            
            if (task.aiContext?.codeFiles?.length) {
              const relatedFiles = task.aiContext.codeFiles.filter(file => 
                filesToCheck.some(f => f.includes(file) || file.includes(f))
              );
              if (relatedFiles.length > 0) {
                console.log(`   ${chalk.gray('Related files:')} ${relatedFiles.join(', ')}`);
              }
            }
          });
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error analyzing context:'), error);
        }
      });
  }

  private static formatTaskForCursor(task: any) {
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

  private static formatTaskAsMarkdown(task: any): string {
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
${task.aiContext?.codeFiles?.map((file: string) => `- ${file}`).join('\n') || 'No specific files specified'}

## Commands to Run
${task.aiContext?.commands?.map((cmd: string) => `\`\`\`bash\n${cmd}\n\`\`\``).join('\n\n') || 'No specific commands specified'}

## Acceptance Criteria
${task.aiContext?.testCriteria?.map((criteria: string) => `- [ ] ${criteria}`).join('\n') || 'No specific criteria specified'}

## References
${task.aiContext?.references?.map((ref: string) => `- ${ref}`).join('\n') || 'No references provided'}

---
Task ID: ${task.id}
`;
  }

  private static formatTaskForTerminal(task: any): string {
    const output = [];
    
    output.push(chalk.bold.green(`\n🎯 Task: ${task.title}`));
    output.push(chalk.gray('─'.repeat(60)));
    output.push(`${chalk.bold('ID:')} ${task.id}`);
    output.push(`${chalk.bold('Priority:')} ${this.formatPriority(task.priority)}`);
    output.push(`${chalk.bold('Type:')} ${task.type}`);
    output.push(`${chalk.bold('Status:')} ${this.formatStatus(task.status)}`);
    
    if (task.dueDate) {
      const isOverdue = task.dueDate < new Date();
      const dueDateStr = format(task.dueDate, 'PPP');
      output.push(`${chalk.bold('Due Date:')} ${isOverdue ? chalk.red(dueDateStr + ' (OVERDUE)') : dueDateStr}`);
    }

    output.push(`\n${chalk.bold('Description:')}`);
    output.push(task.description);

    const instructions = this.generateCursorInstructions(task);
    output.push(`\n${chalk.bold.cyan('🤖 Instructions for Cursor AI:')}`);
    output.push(instructions);

    if (task.aiContext?.codeFiles?.length) {
      output.push(`\n${chalk.bold('📁 Files to Work On:')}`);
      task.aiContext.codeFiles.forEach((file: string) => {
        output.push(`  • ${file}`);
      });
    }

    if (task.aiContext?.commands?.length) {
      output.push(`\n${chalk.bold('⚡ Commands to Run:')}`);
      task.aiContext.commands.forEach((cmd: string) => {
        output.push(`  ${chalk.cyan('$')} ${cmd}`);
      });
    }

    if (task.aiContext?.testCriteria?.length) {
      output.push(`\n${chalk.bold('✅ Acceptance Criteria:')}`);
      task.aiContext.testCriteria.forEach((criteria: string) => {
        output.push(`  • ${criteria}`);
      });
    }

    if (task.aiContext?.references?.length) {
      output.push(`\n${chalk.bold('🔗 References:')}`);
      task.aiContext.references.forEach((ref: string) => {
        output.push(`  • ${ref}`);
      });
    }

    output.push(chalk.gray(`\n💡 Complete with: ai-tasks cursor complete ${task.id}`));
    
    return output.join('\n');
  }

  private static generateCursorInstructions(task: any): string {
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
      instructions.push(`\nEnsure these criteria are met:\n${task.aiContext.testCriteria.map((c: string) => `- ${c}`).join('\n')}`);
    }

    instructions.push('\nImplement this feature completely and autonomously. Do not ask for clarification unless absolutely necessary.');
    
    return instructions.join('\n');
  }

  private static enhanceDescriptionForAI(description: string): string {
    if (description.length < 50) {
      return `${description}\n\nThis task should be implemented autonomously by Cursor AI. Include proper error handling, testing, and documentation as needed.`;
    }
    
    if (!description.includes('autonomous') && !description.includes('AI')) {
      return `${description}\n\nImplement this autonomously with proper error handling and testing.`;
    }
    
    return description;
  }

  private static formatPriority(priority: string): string {
    const colors: Record<string, (text: string) => string> = {
      critical: chalk.red.bold,
      high: chalk.yellow.bold,
      medium: chalk.blue.bold,
      low: chalk.green.bold,
    };
    return colors[priority]?.(priority.toUpperCase()) || priority;
  }

  private static formatStatus(status: string): string {
    const colors: Record<string, (text: string) => string> = {
      todo: chalk.gray,
      in_progress: chalk.blue,
      in_review: chalk.yellow,
      done: chalk.green,
      blocked: chalk.red,
      cancelled: chalk.gray,
    };
    return colors[status]?.(status.replace('_', ' ').toUpperCase()) || status;
  }
} 