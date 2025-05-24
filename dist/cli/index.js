#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const dotenv_1 = require("dotenv");
const tasks_1 = require("./commands/tasks");
const ai_1 = require("./commands/ai");
const autonomous_1 = require("./commands/autonomous");
const project_1 = require("./commands/project");
const cursor_1 = require("./commands/cursor");
// Load environment variables
(0, dotenv_1.config)();
const program = new commander_1.Command();
program
    .name('ai-tasks')
    .description('AI Task Manager - Manage tasks across multiple projects for AI development')
    .version('1.0.0');
// Add command groups
tasks_1.TaskCommands.register(program);
ai_1.AICommands.register(program);
autonomous_1.AutonomousCommands.register(program);
project_1.ProjectCommands.register(program);
cursor_1.CursorCommands.register(program);
// Global error handler
program.exitOverride((err) => {
    if (err.code === 'commander.help') {
        process.exit(0);
    }
    console.error(chalk_1.default.red('Error:'), err.message);
    process.exit(1);
});
// Parse command line arguments
program.parse();
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
