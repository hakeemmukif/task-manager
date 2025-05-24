#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { TaskCommands } from './commands/tasks';
import { AICommands } from './commands/ai';
import { AutonomousCommands } from './commands/autonomous';
import { ProjectCommands } from './commands/project';
import { CursorCommands } from './commands/cursor';

// Load environment variables
config();

const program = new Command();

program
  .name('ai-tasks')
  .description('AI Task Manager - Manage tasks across multiple projects for AI development')
  .version('1.0.0');

// Add command groups
TaskCommands.register(program);
AICommands.register(program);
AutonomousCommands.register(program);
ProjectCommands.register(program);
CursorCommands.register(program);

// Global error handler
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 