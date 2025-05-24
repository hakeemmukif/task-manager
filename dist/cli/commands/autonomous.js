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
exports.AutonomousCommands = void 0;
const autonomous_agent_1 = require("../../src/lib/autonomous-agent");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const path = __importStar(require("path"));
class AutonomousCommands {
    static register(program) {
        const autonomousCmd = program
            .command('autonomous')
            .alias('auto')
            .description('🤖 Autonomous AI Development Agent commands');
        autonomousCmd
            .command('start')
            .description('Start the autonomous development agent')
            .option('-p, --project <project>', 'Target project directory name', 'debt-settler')
            .option('-w, --workspace <workspace>', 'Workspace root path', path.dirname(process.cwd()))
            .option('-a, --auto-approve', 'Auto-approve low-risk changes', false)
            .option('-i, --interval <minutes>', 'Analysis interval in minutes', '30')
            .option('-c, --concurrent <number>', 'Max concurrent tasks', '2')
            .option('-l, --log-level <level>', 'Log level (debug|info|warn|error)', 'info')
            .option('--dry-run', 'Show what would be done without executing', false)
            .action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🤖 Autonomous AI Development Agent'));
                console.log(chalk_1.default.gray('=====================================\n'));
                // Validate workspace and project
                const workspaceRoot = path.resolve(options.workspace);
                const projectPath = path.join(workspaceRoot, options.project);
                console.log(chalk_1.default.cyan(`Workspace: ${workspaceRoot}`));
                console.log(chalk_1.default.cyan(`Target Project: ${options.project}`));
                console.log(chalk_1.default.cyan(`Project Path: ${projectPath}`));
                if (options.dryRun) {
                    console.log(chalk_1.default.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
                }
                // Configuration
                const config = {
                    workspaceRoot,
                    targetProject: options.project,
                    autoApprove: options.autoApprove,
                    maxConcurrentTasks: parseInt(options.concurrent),
                    analysisInterval: parseInt(options.interval),
                    safetyChecks: true,
                    allowedFilePatterns: [
                        'src/',
                        'App.tsx',
                        'app.json',
                        'package.json',
                        'README.md',
                        '.expo/',
                        'assets/',
                        'components/',
                        'screens/',
                        'services/',
                        'types/',
                        'utils/',
                        'contexts/',
                        'navigation/'
                    ],
                    forbiddenFilePatterns: [
                        'node_modules/',
                        '.git/',
                        'dist/',
                        'build/',
                        '.env',
                        'ios/',
                        'android/',
                        'web-build/',
                        '.expo-shared/'
                    ],
                    logLevel: options.logLevel
                };
                // Show configuration
                console.log(chalk_1.default.yellow('Configuration:'));
                console.log(chalk_1.default.gray(`  Auto-approve: ${config.autoApprove ? 'Yes' : 'No'}`));
                console.log(chalk_1.default.gray(`  Analysis interval: ${config.analysisInterval} minutes`));
                console.log(chalk_1.default.gray(`  Max concurrent tasks: ${config.maxConcurrentTasks}`));
                console.log(chalk_1.default.gray(`  Log level: ${config.logLevel}`));
                console.log(chalk_1.default.gray(`  Safety checks: ${config.safetyChecks ? 'Enabled' : 'Disabled'}`));
                if (!options.dryRun) {
                    // Confirm before starting
                    const { confirmed } = await inquirer_1.default.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmed',
                            message: 'Start the autonomous development agent?',
                            default: false
                        }
                    ]);
                    if (!confirmed) {
                        console.log(chalk_1.default.yellow('Operation cancelled.'));
                        return;
                    }
                    // Create and start the agent
                    const agent = new autonomous_agent_1.AutonomousAgent(config);
                    // Handle graceful shutdown
                    process.on('SIGINT', () => {
                        console.log(chalk_1.default.yellow('\n🛑 Received SIGINT, stopping agent...'));
                        agent.stop();
                        process.exit(0);
                    });
                    process.on('SIGTERM', () => {
                        console.log(chalk_1.default.yellow('\n🛑 Received SIGTERM, stopping agent...'));
                        agent.stop();
                        process.exit(0);
                    });
                    // Start the agent
                    await agent.start();
                }
                else {
                    console.log(chalk_1.default.green('✅ Dry run completed - configuration validated'));
                    console.log(chalk_1.default.cyan('\nConfiguration Summary:'));
                    console.log(chalk_1.default.gray(`  Target: ${config.targetProject}`));
                    console.log(chalk_1.default.gray(`  Workspace: ${config.workspaceRoot}`));
                    console.log(chalk_1.default.gray(`  Allowed patterns: ${config.allowedFilePatterns.length} patterns`));
                    console.log(chalk_1.default.gray(`  Forbidden patterns: ${config.forbiddenFilePatterns.length} patterns`));
                    console.log(chalk_1.default.yellow('\n💡 To start the agent for real, remove the --dry-run flag'));
                }
            }
            catch (error) {
                console.error(chalk_1.default.red(`❌ Error: ${error.message}`));
                process.exit(1);
            }
        });
        autonomousCmd
            .command('status')
            .description('Show autonomous agent status and logs')
            .option('-f, --follow', 'Follow log output', false)
            .option('-n, --lines <number>', 'Number of log lines to show', '50')
            .action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🤖 Autonomous Agent Status'));
                console.log(chalk_1.default.gray('============================\n'));
                // Check for running processes
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                try {
                    const { stdout } = await execAsync('ps aux | grep "autonomous" | grep -v grep');
                    if (stdout.trim()) {
                        console.log(chalk_1.default.green('✅ Autonomous agent appears to be running:'));
                        console.log(chalk_1.default.gray(stdout));
                    }
                    else {
                        console.log(chalk_1.default.yellow('⚠️  No autonomous agent processes found'));
                    }
                }
                catch (error) {
                    console.log(chalk_1.default.yellow('⚠️  No autonomous agent processes found'));
                }
                // Show recent logs
                const fs = require('fs');
                const path = require('path');
                const logDir = path.join(process.cwd(), 'task-manager', 'logs');
                if (fs.existsSync(logDir)) {
                    const logFiles = fs.readdirSync(logDir)
                        .filter((file) => file.startsWith('autonomous-'))
                        .sort()
                        .reverse();
                    if (logFiles.length > 0) {
                        const latestLog = path.join(logDir, logFiles[0]);
                        console.log(chalk_1.default.cyan(`\n📝 Latest log file: ${latestLog}`));
                        if (options.follow) {
                            console.log(chalk_1.default.yellow('Following log output (Ctrl+C to stop)...\n'));
                            const { spawn } = require('child_process');
                            const tail = spawn('tail', ['-f', latestLog]);
                            tail.stdout.on('data', (data) => {
                                process.stdout.write(data);
                            });
                            tail.on('close', () => {
                                console.log(chalk_1.default.yellow('\nLog following stopped.'));
                            });
                        }
                        else {
                            const logContent = fs.readFileSync(latestLog, 'utf8');
                            const lines = logContent.split('\n').slice(-parseInt(options.lines));
                            console.log(chalk_1.default.gray('\nRecent log entries:'));
                            console.log(lines.join('\n'));
                        }
                    }
                    else {
                        console.log(chalk_1.default.yellow('📝 No log files found'));
                    }
                }
                else {
                    console.log(chalk_1.default.yellow('📝 Log directory not found'));
                }
            }
            catch (error) {
                console.error(chalk_1.default.red(`❌ Error: ${error.message}`));
                process.exit(1);
            }
        });
        autonomousCmd
            .command('stop')
            .description('Stop the autonomous agent')
            .action(async () => {
            try {
                console.log(chalk_1.default.blue('🛑 Stopping Autonomous Agent'));
                console.log(chalk_1.default.gray('===============================\n'));
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                try {
                    // Find and kill autonomous agent processes
                    const { stdout } = await execAsync('ps aux | grep "autonomous" | grep -v grep | awk \'{print $2}\'');
                    const pids = stdout.trim().split('\n').filter((pid) => pid);
                    if (pids.length > 0) {
                        console.log(chalk_1.default.yellow(`Found ${pids.length} autonomous agent process(es)`));
                        for (const pid of pids) {
                            try {
                                await execAsync(`kill -TERM ${pid}`);
                                console.log(chalk_1.default.green(`✅ Sent SIGTERM to process ${pid}`));
                            }
                            catch (error) {
                                console.log(chalk_1.default.yellow(`⚠️  Could not stop process ${pid}`));
                            }
                        }
                        // Wait a moment then check if processes are still running
                        setTimeout(async () => {
                            try {
                                const { stdout: remainingProcs } = await execAsync('ps aux | grep "autonomous" | grep -v grep');
                                if (remainingProcs.trim()) {
                                    console.log(chalk_1.default.yellow('⚠️  Some processes may still be running. Use kill -9 if needed.'));
                                }
                                else {
                                    console.log(chalk_1.default.green('✅ All autonomous agent processes stopped'));
                                }
                            }
                            catch (error) {
                                console.log(chalk_1.default.green('✅ All autonomous agent processes stopped'));
                            }
                        }, 2000);
                    }
                    else {
                        console.log(chalk_1.default.yellow('⚠️  No autonomous agent processes found'));
                    }
                }
                catch (error) {
                    console.log(chalk_1.default.yellow('⚠️  No autonomous agent processes found'));
                }
            }
            catch (error) {
                console.error(chalk_1.default.red(`❌ Error: ${error.message}`));
                process.exit(1);
            }
        });
    }
}
exports.AutonomousCommands = AutonomousCommands;
