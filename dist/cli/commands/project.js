"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectCommands = void 0;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const table_1 = require("table");
const ora_1 = __importDefault(require("ora"));
const firebase_1 = require("../services/firebase");
const readme_parser_1 = require("../services/readme-parser");
class ProjectCommands {
    static register(program) {
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
            const spinner = (0, ora_1.default)(`Scanning ${workspaceDir} for projects...`).start();
            try {
                const projects = readme_parser_1.ReadmeParser.scanProjectsInDirectory(workspaceDir);
                spinner.stop();
                if (projects.length === 0) {
                    console.log(chalk_1.default.yellow('No projects with pending features found.'));
                    return;
                }
                console.log(chalk_1.default.bold.blue(`\n📁 Found ${projects.length} projects with pending features:`));
                console.log(chalk_1.default.gray('─'.repeat(60)));
                for (const project of projects) {
                    console.log(`\n${chalk_1.default.bold.green('Project:')} ${project.name}`);
                    console.log(`${chalk_1.default.gray('Path:')} ${project.path}`);
                    console.log(`${chalk_1.default.gray('Features:')} ${project.pendingFeatures.length}`);
                    if (options.dryRun || !options.import) {
                        console.log(chalk_1.default.cyan('\nPending Features:'));
                        project.pendingFeatures.forEach((feature, index) => {
                            console.log(`  ${index + 1}. ${feature.title} [${feature.priority}] [${feature.type}]`);
                            if (feature.description !== feature.title) {
                                console.log(`     ${chalk_1.default.gray(feature.description)}`);
                            }
                        });
                    }
                }
                if (options.import && !options.dryRun) {
                    const { shouldImport } = await inquirer_1.default.prompt([
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
                    console.log(chalk_1.default.yellow('\n💡 Use --import flag to actually import these features as tasks'));
                }
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error scanning projects:'), error);
            }
        });
        // Import pending features from a specific README
        projectCmd
            .command('import <readmePath>')
            .description('Import pending features from a specific README.md file')
            .option('-p, --project <projectId>', 'Target project ID (will prompt if not provided)')
            .action(async (readmePath, options) => {
            const spinner = (0, ora_1.default)('Parsing README.md...').start();
            try {
                const features = readme_parser_1.ReadmeParser.parseReadme(readmePath);
                spinner.stop();
                if (features.length === 0) {
                    console.log(chalk_1.default.yellow('No pending features found in README.md'));
                    return;
                }
                console.log(chalk_1.default.bold.blue(`\n📋 Found ${features.length} pending features:`));
                features.forEach((feature, index) => {
                    console.log(`  ${index + 1}. ${feature.title} [${feature.priority}] [${feature.type}]`);
                });
                let projectId = options.project;
                if (!projectId) {
                    const projects = await firebase_1.FirebaseService.getProjects();
                    const { selectedProject } = await inquirer_1.default.prompt([
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
                        const { projectName, projectDescription } = await inquirer_1.default.prompt([
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
                        const newProject = await firebase_1.FirebaseService.createProject({
                            name: projectName,
                            description: projectDescription,
                            isActive: true,
                            status: 'active',
                            tags: [],
                        });
                        projectId = newProject.id;
                        console.log(chalk_1.default.green(`✓ Created new project: ${newProject.name}`));
                    }
                    else {
                        projectId = selectedProject;
                    }
                }
                const importSpinner = (0, ora_1.default)('Importing features as tasks...').start();
                let imported = 0;
                for (const feature of features) {
                    try {
                        const task = readme_parser_1.ReadmeParser.featureToTask(feature, projectId);
                        await firebase_1.FirebaseService.createTask(task);
                        imported++;
                    }
                    catch (error) {
                        console.error(chalk_1.default.red(`Failed to import: ${feature.title}`), error);
                    }
                }
                importSpinner.stop();
                console.log(chalk_1.default.green(`✓ Successfully imported ${imported}/${features.length} features as tasks`));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error importing features:'), error);
            }
        });
        // List all projects
        projectCmd
            .command('list')
            .alias('ls')
            .description('List all projects')
            .option('--active', 'Show only active projects')
            .action(async (options) => {
            const spinner = (0, ora_1.default)('Fetching projects...').start();
            try {
                let projects = await firebase_1.FirebaseService.getProjects();
                if (options.active) {
                    projects = projects.filter(p => p.isActive);
                }
                spinner.stop();
                if (projects.length === 0) {
                    console.log(chalk_1.default.yellow('No projects found.'));
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
                        project.isActive ? chalk_1.default.green('Yes') : chalk_1.default.red('No'),
                        project.tags.join(', ') || '-'
                    ]);
                });
                console.log((0, table_1.table)(tableData));
                console.log(chalk_1.default.gray(`\nShowing ${projects.length} projects`));
            }
            catch (error) {
                spinner.stop();
                console.error(chalk_1.default.red('Error fetching projects:'), error);
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
                let projectData = {};
                // Interactive mode if no options provided
                if (!options.name) {
                    const answers = await inquirer_1.default.prompt([
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
                }
                else {
                    projectData.name = options.name;
                    projectData.description = options.description;
                    if (options.tags) {
                        projectData.tags = options.tags.split(',').map((t) => t.trim());
                    }
                }
                // Set defaults
                projectData.isActive = true;
                projectData.status = 'active';
                projectData.tags = projectData.tags || [];
                const spinner = (0, ora_1.default)('Creating project...').start();
                const project = await firebase_1.FirebaseService.createProject(projectData);
                spinner.stop();
                console.log(chalk_1.default.green('✓ Project created successfully!'));
                console.log(chalk_1.default.gray(`ID: ${project.id}`));
                console.log(chalk_1.default.gray(`Name: ${project.name}`));
            }
            catch (error) {
                console.error(chalk_1.default.red('Error creating project:'), error);
            }
        });
    }
    static async importProjectFeatures(projects) {
        const spinner = (0, ora_1.default)('Importing features...').start();
        let totalImported = 0;
        let totalFeatures = 0;
        for (const projectInfo of projects) {
            try {
                // Check if project exists in Firebase
                const existingProjects = await firebase_1.FirebaseService.getProjects();
                let project = existingProjects.find(p => p.name === projectInfo.name);
                if (!project) {
                    // Create new project
                    project = await firebase_1.FirebaseService.createProject({
                        name: projectInfo.name,
                        description: `Auto-imported from ${projectInfo.path}`,
                        isActive: true,
                        status: 'active',
                        tags: ['auto-imported'],
                        repository: projectInfo.path,
                    });
                }
                // Import features as tasks
                for (const feature of projectInfo.pendingFeatures) {
                    try {
                        const task = readme_parser_1.ReadmeParser.featureToTask(feature, project.id);
                        await firebase_1.FirebaseService.createTask(task);
                        totalImported++;
                    }
                    catch (error) {
                        console.error(chalk_1.default.red(`Failed to import: ${feature.title}`), error);
                    }
                    totalFeatures++;
                }
            }
            catch (error) {
                console.error(chalk_1.default.red(`Failed to process project: ${projectInfo.name}`), error);
            }
        }
        spinner.stop();
        console.log(chalk_1.default.green(`\n✓ Successfully imported ${totalImported}/${totalFeatures} features from ${projects.length} projects`));
    }
}
exports.ProjectCommands = ProjectCommands;
