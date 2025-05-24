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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadmeParser = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const task_1 = require("../../src/types/task");
class ReadmeParser {
    /**
     * Parse a README.md file and extract pending features
     */
    static parseReadme(readmePath) {
        if (!fs.existsSync(readmePath)) {
            return [];
        }
        const content = fs.readFileSync(readmePath, 'utf-8');
        const features = [];
        // Find the "Pending Features" section
        const pendingFeaturesRegex = /#{1,6}\s*(?:pending\s+features?|features?\s+pending|todo|roadmap)\s*\n([\s\S]*?)(?=\n#{1,6}|\n\n#{1,6}|$)/gi;
        const match = pendingFeaturesRegex.exec(content);
        if (!match) {
            return features;
        }
        const featuresSection = match[1];
        // Parse individual features (support both - and * bullet points)
        const featureLines = featuresSection.split('\n').filter(line => line.trim().match(/^[-*]\s+/) || line.trim().match(/^\d+\.\s+/));
        for (const line of featureLines) {
            const feature = this.parseFeatureLine(line.trim());
            if (feature) {
                features.push(feature);
            }
        }
        return features;
    }
    /**
     * Parse a single feature line and extract metadata
     */
    static parseFeatureLine(line) {
        // Remove bullet point or number
        let cleanLine = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
        // Extract priority from tags like [HIGH], [CRITICAL], etc.
        const priorityMatch = cleanLine.match(/\[(?:priority:)?\s*(critical|high|medium|low)\s*\]/gi);
        let priority = task_1.TaskPriority.MEDIUM;
        if (priorityMatch) {
            const priorityStr = priorityMatch[0].replace(/[\[\]]/g, '').replace(/priority:\s*/i, '').toLowerCase();
            switch (priorityStr) {
                case 'critical':
                    priority = task_1.TaskPriority.CRITICAL;
                    break;
                case 'high':
                    priority = task_1.TaskPriority.HIGH;
                    break;
                case 'low':
                    priority = task_1.TaskPriority.LOW;
                    break;
                default: priority = task_1.TaskPriority.MEDIUM;
            }
            cleanLine = cleanLine.replace(priorityMatch[0], '').trim();
        }
        // Extract type from tags like [BUG], [FEATURE], etc.
        const typeMatch = cleanLine.match(/\[(?:type:)?\s*(feature|bug|improvement|documentation|refactor|testing|deployment)\s*\]/gi);
        let type = task_1.TaskType.FEATURE;
        if (typeMatch) {
            const typeStr = typeMatch[0].replace(/[\[\]]/g, '').replace(/type:\s*/i, '').toLowerCase();
            switch (typeStr) {
                case 'bug':
                    type = task_1.TaskType.BUG;
                    break;
                case 'improvement':
                    type = task_1.TaskType.IMPROVEMENT;
                    break;
                case 'documentation':
                    type = task_1.TaskType.DOCUMENTATION;
                    break;
                case 'refactor':
                    type = task_1.TaskType.REFACTOR;
                    break;
                case 'testing':
                    type = task_1.TaskType.TESTING;
                    break;
                case 'deployment':
                    type = task_1.TaskType.DEPLOYMENT;
                    break;
                default: type = task_1.TaskType.FEATURE;
            }
            cleanLine = cleanLine.replace(typeMatch[0], '').trim();
        }
        // Extract estimated hours from tags like [2h], [4 hours], etc.
        const hoursMatch = cleanLine.match(/\[(?:estimate:)?\s*(\d+(?:\.\d+)?)\s*(?:h|hours?)\s*\]/gi);
        let estimatedHours;
        if (hoursMatch) {
            estimatedHours = parseFloat(hoursMatch[0].replace(/[\[\]]/g, '').replace(/estimate:\s*/i, '').replace(/\s*(?:h|hours?)\s*/gi, ''));
            cleanLine = cleanLine.replace(hoursMatch[0], '').trim();
        }
        // Extract files from tags like [files: src/app.js, src/utils.js]
        const filesMatch = cleanLine.match(/\[files:\s*([^\]]+)\]/gi);
        let files = [];
        if (filesMatch) {
            files = filesMatch[0]
                .replace(/\[files:\s*/gi, '')
                .replace(/\]/g, '')
                .split(',')
                .map(f => f.trim())
                .filter(f => f.length > 0);
            cleanLine = cleanLine.replace(filesMatch[0], '').trim();
        }
        // Extract commands from tags like [commands: npm test, npm build]
        const commandsMatch = cleanLine.match(/\[commands:\s*([^\]]+)\]/gi);
        let commands = [];
        if (commandsMatch) {
            commands = commandsMatch[0]
                .replace(/\[commands:\s*/gi, '')
                .replace(/\]/g, '')
                .split(',')
                .map(c => c.trim())
                .filter(c => c.length > 0);
            cleanLine = cleanLine.replace(commandsMatch[0], '').trim();
        }
        // Extract test criteria from tags like [tests: should render correctly, should handle errors]
        const testsMatch = cleanLine.match(/\[tests:\s*([^\]]+)\]/gi);
        let testCriteria = [];
        if (testsMatch) {
            testCriteria = testsMatch[0]
                .replace(/\[tests:\s*/gi, '')
                .replace(/\]/g, '')
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0);
            cleanLine = cleanLine.replace(testsMatch[0], '').trim();
        }
        // What's left is the title and description
        const parts = cleanLine.split(' - ');
        const title = parts[0].trim();
        const description = parts.length > 1 ? parts.slice(1).join(' - ').trim() : title;
        if (!title) {
            return null;
        }
        return {
            title,
            description,
            priority,
            type,
            estimatedHours,
            files: files.length > 0 ? files : undefined,
            commands: commands.length > 0 ? commands : undefined,
            testCriteria: testCriteria.length > 0 ? testCriteria : undefined,
        };
    }
    /**
     * Scan a directory for projects with README.md files
     */
    static scanProjectsInDirectory(baseDir) {
        const projects = [];
        if (!fs.existsSync(baseDir)) {
            return projects;
        }
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const projectPath = path.join(baseDir, entry.name);
                const readmePath = path.join(projectPath, 'README.md');
                if (fs.existsSync(readmePath)) {
                    const pendingFeatures = this.parseReadme(readmePath);
                    if (pendingFeatures.length > 0) {
                        projects.push({
                            name: entry.name,
                            path: projectPath,
                            readmePath,
                            pendingFeatures,
                        });
                    }
                }
            }
        }
        return projects;
    }
    /**
     * Convert a PendingFeature to a CreateTask object
     */
    static featureToTask(feature, projectId) {
        return {
            title: feature.title,
            description: feature.description,
            priority: feature.priority,
            type: feature.type,
            status: task_1.TaskStatus.TODO,
            projectId,
            estimatedHours: feature.estimatedHours,
            tags: [feature.type.toLowerCase()],
            dependencies: [],
            blockedBy: [],
            attachments: [],
            comments: [],
            aiContext: {
                codeFiles: feature.files || [],
                commands: feature.commands || [],
                testCriteria: feature.testCriteria || [],
                references: [],
            },
        };
    }
    /**
     * Generate a well-formatted pending features section for README.md
     */
    static generatePendingFeaturesSection(features) {
        if (features.length === 0) {
            return '';
        }
        let section = '## Pending Features\n\n';
        for (const feature of features) {
            let line = `- ${feature.title}`;
            if (feature.description !== feature.title) {
                line += ` - ${feature.description}`;
            }
            const tags = [];
            if (feature.priority !== task_1.TaskPriority.MEDIUM) {
                tags.push(`[${feature.priority.toUpperCase()}]`);
            }
            if (feature.type !== task_1.TaskType.FEATURE) {
                tags.push(`[${feature.type.toUpperCase()}]`);
            }
            if (feature.estimatedHours) {
                tags.push(`[${feature.estimatedHours}h]`);
            }
            if (feature.files && feature.files.length > 0) {
                tags.push(`[files: ${feature.files.join(', ')}]`);
            }
            if (feature.commands && feature.commands.length > 0) {
                tags.push(`[commands: ${feature.commands.join(', ')}]`);
            }
            if (feature.testCriteria && feature.testCriteria.length > 0) {
                tags.push(`[tests: ${feature.testCriteria.join(', ')}]`);
            }
            if (tags.length > 0) {
                line += ` ${tags.join(' ')}`;
            }
            section += line + '\n';
        }
        return section;
    }
}
exports.ReadmeParser = ReadmeParser;
