import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { table } from 'table';
import ora from 'ora';
import { FirebaseService } from '../services/firebase';
import { ReadmeParser, ProjectInfo } from '../services/readme-parser';
import { CreateProject } from '../../src/types/task';

export class ProjectCommands {
  static register(program: Command) {
    const projectCmd = program
      .command('project')
      .alias('p')
      .description('Cross-project management commands');

    // Scan workspace for projects and import pending features
    projectCmd
      .command('scan [workspace]')
      .description('Scan workspace directory for projects with pending features in README.md')
      .option('-i, --import', 'Import pending features as tasks')
      .option('-d, --dry-run', 'Show what would be imported without actually importing')
      .action(async (workspace, options) => {
        const workspaceDir = workspace || process.cwd();
        const spinner = ora(`Scanning ${workspaceDir} for projects...`).start();
        
        try {
          const projects = ReadmeParser.scanProjectsInDirectory(workspaceDir);
          spinner.stop();

          if (projects.length === 0) {
            console.log(chalk.yellow('No projects with pending features found.'));
            return;
          }

          console.log(chalk.bold.blue(`\n📁 Found ${projects.length} projects with pending features:`));
          console.log(chalk.gray('─'.repeat(60)));

          for (const project of projects) {
            console.log(`\n${chalk.bold.green('Project:')} ${project.name}`);
            console.log(`${chalk.gray('Path:')} ${project.path}`);
            console.log(`${chalk.gray('Features:')} ${project.pendingFeatures.length}`);
            
            if (options.dryRun || !options.import) {
              console.log(chalk.cyan('\nPending Features:'));
              project.pendingFeatures.forEach((feature, index) => {
                console.log(`  ${index + 1}. ${feature.title} [${feature.priority}] [${feature.type}]`);
                if (feature.description !== feature.title) {
                  console.log(`     ${chalk.gray(feature.description)}`);
                }
              });
            }
          }

          if (options.import && !options.dryRun) {
            const { shouldImport } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'shouldImport',
                message: 'Import all pending features as tasks?',
                default: true,
              },
            ]);

            if (shouldImport) {
              await this.importProjectFeatures(projects);
            }
          }

          if (options.dryRun) {
            console.log(chalk.yellow('\n💡 Use --import flag to actually import these features as tasks'));
          }
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error scanning projects:'), error);
        }
      });

    // Import pending features from a specific README
    projectCmd
      .command('import <readmePath>')
      .description('Import pending features from a specific README.md file')
      .option('-p, --project <projectId>', 'Target project ID (will prompt if not provided)')
      .action(async (readmePath, options) => {
        const spinner = ora('Parsing README.md...').start();
        
        try {
          const features = ReadmeParser.parseReadme(readmePath);
          spinner.stop();

          if (features.length === 0) {
            console.log(chalk.yellow('No pending features found in README.md'));
            return;
          }

          console.log(chalk.bold.blue(`\n📋 Found ${features.length} pending features:`));
          features.forEach((feature, index) => {
            console.log(`  ${index + 1}. ${feature.title} [${feature.priority}] [${feature.type}]`);
          });

          let projectId = options.project;
          
          if (!projectId) {
            const projects = await FirebaseService.getProjects();
            const { selectedProject } = await inquirer.prompt([
              {
                type: 'list',
                name: 'selectedProject',
                message: 'Select target project:',
                choices: [
                  ...projects.map(p => ({ name: p.name, value: p.id })),
                  { name: 'Create new project', value: 'new' },
                ],
              },
            ]);

            if (selectedProject === 'new') {
              const { projectName, projectDescription } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'projectName',
                  message: 'Project name:',
                  validate: (input) => input.length > 0 || 'Project name is required',
                },
                {
                  type: 'input',
                  name: 'projectDescription',
                  message: 'Project description (optional):',
                },
              ]);

              const newProject = await FirebaseService.createProject({
                name: projectName,
                description: projectDescription,
                isActive: true,
                status: 'active' as const,
                tags: [],
              });
              projectId = newProject.id;
              console.log(chalk.green(`✓ Created new project: ${newProject.name}`));
            } else {
              projectId = selectedProject;
            }
          }

          const importSpinner = ora('Importing features as tasks...').start();
          let imported = 0;

          for (const feature of features) {
            try {
              const task = ReadmeParser.featureToTask(feature, projectId);
              await FirebaseService.createTask(task);
              imported++;
            } catch (error) {
              console.error(chalk.red(`Failed to import: ${feature.title}`), error);
            }
          }

          importSpinner.stop();
          console.log(chalk.green(`✓ Successfully imported ${imported}/${features.length} features as tasks`));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error importing features:'), error);
        }
      });

    // List all projects
    projectCmd
      .command('list')
      .alias('ls')
      .description('List all projects')
      .option('--active', 'Show only active projects')
      .action(async (options) => {
        const spinner = ora('Fetching projects...').start();
        
        try {
          let projects = await FirebaseService.getProjects();
          
          if (options.active) {
            projects = projects.filter(p => p.isActive);
          }

          spinner.stop();

          if (projects.length === 0) {
            console.log(chalk.yellow('No projects found.'));
            return;
          }

          // Create table
          const tableData = [
            ['ID', 'Name', 'Description', 'Active', 'Tags']
          ];

          projects.forEach(project => {
            tableData.push([
              project.id.substring(0, 8),
              project.name.length > 20 ? project.name.substring(0, 17) + '...' : project.name,
              project.description ? 
                (project.description.length > 30 ? project.description.substring(0, 27) + '...' : project.description) 
                : '-',
              project.isActive ? chalk.green('Yes') : chalk.red('No'),
              project.tags.join(', ') || '-'
            ]);
          });

          console.log(table(tableData));
          console.log(chalk.gray(`\nShowing ${projects.length} projects`));
        } catch (error) {
          spinner.stop();
          console.error(chalk.red('Error fetching projects:'), error);
        }
      });

    // Create new project
    projectCmd
      .command('create')
      .alias('new')
      .description('Create a new project')
      .option('-n, --name <name>', 'Project name')
      .option('-d, --description <description>', 'Project description')
      .option('--tags <tags>', 'Project tags (comma-separated)')
      .action(async (options) => {
        try {
          let projectData: Partial<CreateProject> = {};

          // Interactive mode if no options provided
          if (!options.name) {
            const answers = await inquirer.prompt([
              {
                type: 'input',
                name: 'name',
                message: 'Project name:',
                validate: (input) => input.length > 0 || 'Project name is required',
              },
              {
                type: 'input',
                name: 'description',
                message: 'Project description (optional):',
              },
              {
                type: 'input',
                name: 'repository',
                message: 'Repository URL (optional):',
              },
              {
                type: 'input',
                name: 'tags',
                message: 'Tags (comma-separated, optional):',
              },
            ]);

            projectData = answers;
          } else {
            projectData.name = options.name;
            projectData.description = options.description;
            if (options.tags) {
              projectData.tags = options.tags.split(',').map((t: string) => t.trim());
            }
          }

          // Set defaults
          projectData.isActive = true;
          projectData.status = 'active' as const;
          projectData.tags = projectData.tags || [];

          const spinner = ora('Creating project...').start();
          const project = await FirebaseService.createProject(projectData as CreateProject);
          spinner.stop();

          console.log(chalk.green('✓ Project created successfully!'));
          console.log(chalk.gray(`ID: ${project.id}`));
          console.log(chalk.gray(`Name: ${project.name}`));
        } catch (error) {
          console.error(chalk.red('Error creating project:'), error);
        }
      });
  }

  private static async importProjectFeatures(projects: ProjectInfo[]): Promise<void> {
    const spinner = ora('Importing features...').start();
    let totalImported = 0;
    let totalFeatures = 0;

    for (const projectInfo of projects) {
      try {
        // Check if project exists in Firebase
        const existingProjects = await FirebaseService.getProjects();
        let project = existingProjects.find(p => p.name === projectInfo.name);

        if (!project) {
          // Create new project
          project = await FirebaseService.createProject({
            name: projectInfo.name,
            description: `Auto-imported from ${projectInfo.path}`,
            isActive: true,
            status: 'active' as const,
            tags: ['auto-imported'],
            repository: projectInfo.path,
          });
        }

        // Import features as tasks
        for (const feature of projectInfo.pendingFeatures) {
          try {
            const task = ReadmeParser.featureToTask(feature, project.id);
            await FirebaseService.createTask(task);
            totalImported++;
          } catch (error) {
            console.error(chalk.red(`Failed to import: ${feature.title}`), error);
          }
          totalFeatures++;
        }
      } catch (error) {
        console.error(chalk.red(`Failed to process project: ${projectInfo.name}`), error);
      }
    }

    spinner.stop();
    console.log(chalk.green(`\n✓ Successfully imported ${totalImported}/${totalFeatures} features from ${projects.length} projects`));
  }
} 