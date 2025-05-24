# TaskForge - AI-Powered Task Management System

TaskForge is a sophisticated task management system that leverages AI to enhance productivity and streamline project organization. Built with modern web technologies and designed for scalability, it offers a robust solution for managing complex projects and tasks.

## 🚀 Features

### Core Task Management
- **Comprehensive Task Tracking**
  - Multiple status states (Todo, In Progress, In Review, Done, Blocked, Cancelled)
  - Priority levels (Critical, High, Medium, Low)
  - Various task types (Feature, Bug, Improvement, Documentation, Refactor, Testing, Deployment)
  - Time tracking with estimated and actual hours

### AI Integration
- **AI-Enhanced Context**
  - Automatic code file association
  - CLI command suggestions
  - Test criteria tracking
  - Reference documentation linking

### Project Organization
- **Multi-Project Support**
  - Project metadata management
  - Repository integration
  - Tagging system
  - Ownership tracking

### Advanced Features
- **Task Dependencies**
  - Dependency tracking
  - Blocking relationship management
- **Collaboration**
  - Comment system
  - File attachments
  - Task assignment
- **Smart Organization**
  - Custom tagging
  - Advanced filtering
  - Priority-based sorting

## 🛠️ Tech Stack

- **Frontend**
  - Next.js 14.0
  - React 18
  - TailwindCSS
  - TypeScript

- **Backend**
  - Firebase/Firestore
  - Firebase Admin SDK

- **Development Tools**
  - ESLint
  - Jest
  - TypeScript
  - PostCSS

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/taskforge.git
cd taskforge
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Firebase configuration.

4. Run the development server:
```bash
npm run dev
```

## 🔧 Configuration

### Firebase Setup

1. Create a new Firebase project
2. Enable Firestore Database
3. Add your Firebase configuration to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 🚀 Usage

### Web Interface
Access the web interface at `http://localhost:3000` after starting the development server.

### CLI
TaskForge includes a CLI for quick task management:

```bash
# Install CLI globally
npm install -g ai-tasks

# Create a new task
ai-tasks create

# List tasks
ai-tasks list

# Update task status
ai-tasks update <task-id>
```

## 📝 API Types

### Task Model
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  type: TaskType;
  assignee?: string;
  dueDate?: Date;
  // ... other properties
}
```

### Project Model
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  repository?: string;
  isActive: boolean;
  tags: string[];
  // ... other properties
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Firebase](https://firebase.google.com/)
- Styled with [TailwindCSS](https://tailwindcss.com/)

## 🔮 Roadmap

### Pending Features

- Implement user authentication and authorization system [HIGH] [FEATURE] [8h] [files: src/auth/AuthProvider.tsx, src/auth/hooks/useAuth.ts, src/pages/login.tsx] [tests: should authenticate users, should handle invalid credentials, should maintain session] [commands: npm test src/auth/*, npm run lint]

- Add real-time collaboration features [MEDIUM] [FEATURE] [12h] [files: src/components/Collaboration.tsx, src/hooks/useRealtimeSync.ts] [tests: should sync data in real-time, should handle offline mode, should resolve conflicts] [commands: npm test src/components/Collaboration.test.tsx]

- Enhance AI task suggestions with machine learning [HIGH] [IMPROVEMENT] [16h] [files: src/services/ai/TaskSuggestion.ts, src/ml/TaskPredictor.ts] [tests: should predict next tasks accurately, should learn from user patterns] [commands: npm run train-model, npm test src/services/ai/*]

- Integrate with GitHub, GitLab, and Bitbucket [MEDIUM] [FEATURE] [10h] [files: src/integrations/vcs/*.ts] [tests: should fetch repositories, should sync issues, should handle webhooks] [commands: npm test src/integrations/vcs]

- Develop cross-platform mobile application [HIGH] [FEATURE] [40h] [files: mobile/*, src/api/mobile/*] [tests: should work offline, should sync with main app, should handle notifications] [commands: cd mobile && npm test]

- Create comprehensive API documentation [MEDIUM] [DOCUMENTATION] [6h] [files: docs/api/*, src/types/api.ts] [tests: should validate OpenAPI spec] [commands: npm run generate-docs, npm run validate-api]

- Build advanced reporting and analytics dashboard [LOW] [FEATURE] [20h] [files: src/components/Analytics/*, src/services/reporting/*] [tests: should generate accurate reports, should export in multiple formats] [commands: npm test src/components/Analytics]

## 📞 Support

For support, email support@taskforge.com or join our Slack channel.

---

<p align="center">Made with ❤️ by TaskForge Team</p>

# AI Task Manager CLI

A powerful command-line interface for managing development tasks across multiple projects, specifically designed for AI-assisted development with Cursor AI.

## 🚀 Features

- **Cross-Project Task Management**: Manage tasks across multiple projects from a single interface
- **Cursor AI Integration**: Optimized commands and output formats for autonomous AI development
- **README.md Integration**: Automatically import pending features from README files
- **Firebase Backend**: Cloud-based task storage and synchronization
- **Smart Task Prioritization**: AI-optimized task selection and context
- **Rich CLI Experience**: Beautiful terminal output with colors and spinners

## 📦 Installation

```bash
# Install dependencies
npm install

# Build the CLI
npm run build:cli

# Link for global usage (optional)
npm link
```

## 🔧 Configuration

1. Set up Firebase configuration in `.env`:
```bash
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

2. Initialize the database:
```bash
ai-tasks init
```

## 🎯 Quick Start for Cursor AI

### Get Your Next Task
```bash
# Get the next actionable task optimized for Cursor AI
ai-tasks cursor next-task

# Get task in JSON format for programmatic use
ai-tasks cursor next-task --format json

# Get task as markdown for documentation
ai-tasks cursor next-task --format markdown
```

### Import Tasks from README
```bash
# Import pending features from current directory's README.md
ai-tasks cursor import-readme

# Import from specific README file
ai-tasks cursor import-readme -f ./path/to/README.md
```

### Create AI-Optimized Tasks
```bash
# Interactive task creation
ai-tasks cursor create-ai-task

# Quick task creation
ai-tasks cursor create-ai-task \
  -t "Add user authentication" \
  -d "Implement JWT-based authentication with login/logout" \
  --files "src/auth.js,src/middleware/auth.js" \
  --commands "npm test,npm run lint" \
  --tests "should authenticate users,should handle invalid tokens" \
  --priority high
```

### Complete Tasks and Get Next
```bash
# Mark task as completed and get the next one
ai-tasks cursor complete <task-id> --comment "Implemented successfully"
```

### Context-Aware Task Discovery
```bash
# Find tasks related to files in current directory
ai-tasks cursor context

# Check specific files
ai-tasks cursor context --files "src/app.js,package.json"
```

## 📋 Command Reference

### Core Commands

#### `ai-tasks cursor` (Cursor AI Integration)
- `next-task` - Get the next actionable task with full context
- `create-ai-task` - Create tasks optimized for AI development
- `import-readme` - Import pending features from README.md
- `complete <id>` - Mark task complete and get next
- `context` - Find tasks related to current working directory

#### `ai-tasks tasks` (Task Management)
- `list` - List all tasks with filtering options
- `create` - Create a new task
- `update <id>` - Update task details
- `delete <id>` - Delete a task
- `show <id>` - Show detailed task information

#### `ai-tasks project` (Project Management)
- `list` - List all projects
- `create` - Create a new project
- `scan [workspace]` - Scan workspace for projects with pending features
- `import <readme>` - Import features from specific README

#### `ai-tasks ai` (AI Commands)
- `suggest` - Get AI suggestions for next tasks