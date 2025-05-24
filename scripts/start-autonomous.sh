#!/bin/bash

# Autonomous AI Development Agent Startup Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Starting Autonomous AI Development Agent${NC}"
echo -e "${BLUE}===========================================${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from task-manager directory${NC}"
    exit 1
fi

# Build the CLI first
echo -e "${YELLOW}📦 Building CLI...${NC}"
npm run build-cli

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CLI build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CLI built successfully${NC}"

# Check Firebase configuration
echo -e "${YELLOW}🔥 Checking Firebase configuration...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "${YELLOW}💡 Creating sample .env file...${NC}"
    
    cat > .env << 'EOF'
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# Application
NODE_ENV=development
PORT=3000
EOF
    
    echo -e "${YELLOW}📝 Please update .env with your Firebase credentials${NC}"
    echo -e "${YELLOW}🔗 Get credentials from: https://console.firebase.google.com/${NC}"
fi

# Parse command line arguments
DRY_RUN=false
AUTO_APPROVE=false
PROJECT="debt-settler"
INTERVAL=30

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        --project)
            PROJECT="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run        Run in demo mode without Firebase"
            echo "  --auto-approve   Auto-approve low-risk tasks"
            echo "  --project NAME   Target project name (default: debt-settler)"
            echo "  --interval MIN   Analysis interval in minutes (default: 30)"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Show configuration
echo -e "${GREEN}⚙️  Configuration:${NC}"
echo -e "  Project: ${PROJECT}"
echo -e "  Dry run: ${DRY_RUN}"
echo -e "  Auto-approve: ${AUTO_APPROVE}"
echo -e "  Analysis interval: ${INTERVAL} minutes"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🧪 Running in DRY RUN mode (no Firebase required)${NC}"
    node demo-autonomous.js
    echo ""
    echo -e "${GREEN}✅ Dry run completed successfully!${NC}"
    echo -e "${YELLOW}💡 To start the real agent, run without --dry-run${NC}"
    exit 0
fi

# Test Firebase connection
echo -e "${YELLOW}🔥 Testing Firebase connection...${NC}"
node -e "
try {
    require('dotenv').config();
    const admin = require('firebase-admin');
    
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n')
            })
        });
    }
    
    console.log('✅ Firebase connection successful');
    process.exit(0);
} catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    process.exit(1);
}
" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Firebase connection failed${NC}"
    echo -e "${YELLOW}💡 Options:${NC}"
    echo -e "  1. Run with --dry-run to test without Firebase"
    echo -e "  2. Update your .env file with correct Firebase credentials"
    echo -e "  3. Check Firebase project settings"
    echo ""
    echo -e "${YELLOW}🧪 Running dry run instead...${NC}"
    node demo-autonomous.js
    exit 1
fi

echo -e "${GREEN}✅ Firebase connection successful${NC}"

# Start the autonomous agent
echo -e "${GREEN}🚀 Starting Autonomous Agent...${NC}"
echo -e "${YELLOW}⚠️  Press Ctrl+C to stop the agent${NC}"
echo ""

# Build command
CMD="node dist/cli/index.js autonomous start --project $PROJECT --interval $INTERVAL"

if [ "$AUTO_APPROVE" = true ]; then
    CMD="$CMD --auto-approve"
fi

echo -e "${BLUE}Running: $CMD${NC}"
echo ""

# Execute the command
exec $CMD 