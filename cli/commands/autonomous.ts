import { Command } from 'commander';
import { AutonomousAgent } from '../../src/lib/autonomous-agent';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as path from 'path';

export class AutonomousCommands {
  static register(program: Command): void {
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
          console.log(chalk.blue('🤖 Autonomous AI Development Agent'));
          console.log(chalk.gray('=====================================\n'));

          // Validate workspace and project
          const workspaceRoot = path.resolve(options.workspace);
          const projectPath = path.join(workspaceRoot, options.project);

          console.log(chalk.cyan(`Workspace: ${workspaceRoot}`));
          console.log(chalk.cyan(`Target Project: ${options.project}`));
          console.log(chalk.cyan(`Project Path: ${projectPath}`));

          if (options.dryRun) {
            console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
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
            logLevel: options.logLevel as 'debug' | 'info' | 'warn' | 'error'
          };

          // Show configuration
          console.log(chalk.yellow('Configuration:'));
          console.log(chalk.gray(`  Auto-approve: ${config.autoApprove ? 'Yes' : 'No'}`));
          console.log(chalk.gray(`  Analysis interval: ${config.analysisInterval} minutes`));
          console.log(chalk.gray(`  Max concurrent tasks: ${config.maxConcurrentTasks}`));
          console.log(chalk.gray(`  Log level: ${config.logLevel}`));
          console.log(chalk.gray(`  Safety checks: ${config.safetyChecks ? 'Enabled' : 'Disabled'}`));

          if (!options.dryRun) {
            // Confirm before starting
            const { confirmed } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirmed',
                message: 'Start the autonomous development agent?',
                default: false
              }
            ]);

            if (!confirmed) {
              console.log(chalk.yellow('Operation cancelled.'));
              return;
            }

            // Create and start the agent
            const agent = new AutonomousAgent(config);

            // Handle graceful shutdown
            process.on('SIGINT', () => {
              console.log(chalk.yellow('\n🛑 Received SIGINT, stopping agent...'));
              agent.stop();
              process.exit(0);
            });

            process.on('SIGTERM', () => {
              console.log(chalk.yellow('\n🛑 Received SIGTERM, stopping agent...'));
              agent.stop();
              process.exit(0);
            });

            // Start the agent
            await agent.start();
          } else {
            console.log(chalk.green('✅ Dry run completed - configuration validated'));
            console.log(chalk.cyan('\nConfiguration Summary:'));
            console.log(chalk.gray(`  Target: ${config.targetProject}`));
            console.log(chalk.gray(`  Workspace: ${config.workspaceRoot}`));
            console.log(chalk.gray(`  Allowed patterns: ${config.allowedFilePatterns.length} patterns`));
            console.log(chalk.gray(`  Forbidden patterns: ${config.forbiddenFilePatterns.length} patterns`));
            console.log(chalk.yellow('\n💡 To start the agent for real, remove the --dry-run flag'));
          }

        } catch (error: any) {
          console.error(chalk.red(`❌ Error: ${error.message}`));
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
          console.log(chalk.blue('🤖 Autonomous Agent Status'));
          console.log(chalk.gray('============================\n'));

          // Check for running processes
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);

          try {
            const { stdout } = await execAsync('ps aux | grep "autonomous" | grep -v grep');
            if (stdout.trim()) {
              console.log(chalk.green('✅ Autonomous agent appears to be running:'));
              console.log(chalk.gray(stdout));
            } else {
              console.log(chalk.yellow('⚠️  No autonomous agent processes found'));
            }
          } catch (error) {
            console.log(chalk.yellow('⚠️  No autonomous agent processes found'));
          }

          // Show recent logs
          const fs = require('fs');
          const path = require('path');
          const logDir = path.join(process.cwd(), 'task-manager', 'logs');

          if (fs.existsSync(logDir)) {
            const logFiles = fs.readdirSync(logDir)
              .filter((file: string) => file.startsWith('autonomous-'))
              .sort()
              .reverse();

            if (logFiles.length > 0) {
              const latestLog = path.join(logDir, logFiles[0]);
              console.log(chalk.cyan(`\n📝 Latest log file: ${latestLog}`));

              if (options.follow) {
                console.log(chalk.yellow('Following log output (Ctrl+C to stop)...\n'));
                const { spawn } = require('child_process');
                const tail = spawn('tail', ['-f', latestLog]);
                tail.stdout.on('data', (data: Buffer) => {
                  process.stdout.write(data);
                });
                tail.on('close', () => {
                  console.log(chalk.yellow('\nLog following stopped.'));
                });
              } else {
                const logContent = fs.readFileSync(latestLog, 'utf8');
                const lines = logContent.split('\n').slice(-parseInt(options.lines));
                console.log(chalk.gray('\nRecent log entries:'));
                console.log(lines.join('\n'));
              }
            } else {
              console.log(chalk.yellow('📝 No log files found'));
            }
          } else {
            console.log(chalk.yellow('📝 Log directory not found'));
          }

        } catch (error: any) {
          console.error(chalk.red(`❌ Error: ${error.message}`));
          process.exit(1);
        }
      });

    autonomousCmd
      .command('stop')
      .description('Stop the autonomous agent')
      .action(async () => {
        try {
          console.log(chalk.blue('🛑 Stopping Autonomous Agent'));
          console.log(chalk.gray('===============================\n'));

          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);

          try {
            // Find and kill autonomous agent processes
            const { stdout } = await execAsync('ps aux | grep "autonomous" | grep -v grep | awk \'{print $2}\'');
            const pids = stdout.trim().split('\n').filter((pid: string) => pid);

            if (pids.length > 0) {
              console.log(chalk.yellow(`Found ${pids.length} autonomous agent process(es)`));
              
              for (const pid of pids) {
                try {
                  await execAsync(`kill -TERM ${pid}`);
                  console.log(chalk.green(`✅ Sent SIGTERM to process ${pid}`));
                } catch (error) {
                  console.log(chalk.yellow(`⚠️  Could not stop process ${pid}`));
                }
              }

              // Wait a moment then check if processes are still running
              setTimeout(async () => {
                try {
                  const { stdout: remainingProcs } = await execAsync('ps aux | grep "autonomous" | grep -v grep');
                  if (remainingProcs.trim()) {
                    console.log(chalk.yellow('⚠️  Some processes may still be running. Use kill -9 if needed.'));
                  } else {
                    console.log(chalk.green('✅ All autonomous agent processes stopped'));
                  }
                } catch (error) {
                  console.log(chalk.green('✅ All autonomous agent processes stopped'));
                }
              }, 2000);

            } else {
              console.log(chalk.yellow('⚠️  No autonomous agent processes found'));
            }

          } catch (error) {
            console.log(chalk.yellow('⚠️  No autonomous agent processes found'));
          }

        } catch (error: any) {
          console.error(chalk.red(`❌ Error: ${error.message}`));
          process.exit(1);
        }
      });
  }
} 