import * as fs from 'node:fs';
import * as path from 'node:path';
import { CreateTask, TaskPriority, TaskType, TaskStatus } from '../../src/types/task';

export interface PendingFeature {
  title: string;
  description: string;
  priority: TaskPriority;
  type: TaskType;
  estimatedHours?: number;
  dependencies?: string[];
  files?: string[];
  commands?: string[];
  testCriteria?: string[];
}

export interface ProjectInfo {
  name: string;
  path: string;
  readmePath: string;
  pendingFeatures: PendingFeature[];
}

export class ReadmeParser {
  /**
   * Parse a README.md file and extract pending features
   */
  static parseReadme(readmePath: string): PendingFeature[] {
    if (!fs.existsSync(readmePath)) {
      return [];
    }

    const content = fs.readFileSync(readmePath, 'utf-8');
    const features: PendingFeature[] = [];

    // Find the "Pending Features" section
    const pendingFeaturesRegex = /#{1,6}\s*(?:pending\s+features?|features?\s+pending|todo|roadmap)\s*\n([\s\S]*?)(?=\n#{1,6}|\n\n#{1,6}|$)/gi;
    const match = pendingFeaturesRegex.exec(content);

    if (!match) {
      return features;
    }

    const featuresSection = match[1];
    
    // Parse individual features (support both - and * bullet points)
    const featureLines = featuresSection.split('\n').filter(line => 
      line.trim().match(/^[-*]\s+/) || line.trim().match(/^\d+\.\s+/)
    );

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
  private static parseFeatureLine(line: string): PendingFeature | null {
    // Remove bullet point or number
    let cleanLine = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
    
    // Extract priority from tags like [HIGH], [CRITICAL], etc.
    const priorityMatch = cleanLine.match(/\[(?:priority:)?\s*(critical|high|medium|low)\s*\]/gi);
    let priority = TaskPriority.MEDIUM;
    if (priorityMatch) {
      const priorityStr = priorityMatch[0].replace(/[\[\]]/g, '').replace(/priority:\s*/i, '').toLowerCase();
      switch (priorityStr) {
        case 'critical': priority = TaskPriority.CRITICAL; break;
        case 'high': priority = TaskPriority.HIGH; break;
        case 'low': priority = TaskPriority.LOW; break;
        default: priority = TaskPriority.MEDIUM;
      }
      cleanLine = cleanLine.replace(priorityMatch[0], '').trim();
    }

    // Extract type from tags like [BUG], [FEATURE], etc.
    const typeMatch = cleanLine.match(/\[(?:type:)?\s*(feature|bug|improvement|documentation|refactor|testing|deployment)\s*\]/gi);
    let type = TaskType.FEATURE;
    if (typeMatch) {
      const typeStr = typeMatch[0].replace(/[\[\]]/g, '').replace(/type:\s*/i, '').toLowerCase();
      switch (typeStr) {
        case 'bug': type = TaskType.BUG; break;
        case 'improvement': type = TaskType.IMPROVEMENT; break;
        case 'documentation': type = TaskType.DOCUMENTATION; break;
        case 'refactor': type = TaskType.REFACTOR; break;
        case 'testing': type = TaskType.TESTING; break;
        case 'deployment': type = TaskType.DEPLOYMENT; break;
        default: type = TaskType.FEATURE;
      }
      cleanLine = cleanLine.replace(typeMatch[0], '').trim();
    }

    // Extract estimated hours from tags like [2h], [4 hours], etc.
    const hoursMatch = cleanLine.match(/\[(?:estimate:)?\s*(\d+(?:\.\d+)?)\s*(?:h|hours?)\s*\]/gi);
    let estimatedHours: number | undefined;
    if (hoursMatch) {
      estimatedHours = parseFloat(hoursMatch[0].replace(/[\[\]]/g, '').replace(/estimate:\s*/i, '').replace(/\s*(?:h|hours?)\s*/gi, ''));
      cleanLine = cleanLine.replace(hoursMatch[0], '').trim();
    }

    // Extract files from tags like [files: src/app.js, src/utils.js]
    const filesMatch = cleanLine.match(/\[files:\s*([^\]]+)\]/gi);
    let files: string[] = [];
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
    let commands: string[] = [];
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
    let testCriteria: string[] = [];
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
  static scanProjectsInDirectory(baseDir: string): ProjectInfo[] {
    const projects: ProjectInfo[] = [];
    
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
  static featureToTask(feature: PendingFeature, projectId: string): CreateTask {
    return {
      title: feature.title,
      description: feature.description,
      priority: feature.priority,
      type: feature.type,
      status: TaskStatus.TODO,
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
  static generatePendingFeaturesSection(features: PendingFeature[]): string {
    if (features.length === 0) {
      return '';
    }

    let section = '## Pending Features\n\n';
    
    for (const feature of features) {
      let line = `- ${feature.title}`;
      
      if (feature.description !== feature.title) {
        line += ` - ${feature.description}`;
      }
      
      const tags: string[] = [];
      
      if (feature.priority !== TaskPriority.MEDIUM) {
        tags.push(`[${feature.priority.toUpperCase()}]`);
      }
      
      if (feature.type !== TaskType.FEATURE) {
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