# 📋 Useful Commands Reference

Quick reference for common commands used in this project.

## 🚀 Setup & Installation

```bash
# Clone the repository (if from Git)
git clone <your-repo-url>
cd tools-hub

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run setup script (Linux/Mac)
chmod +x setup.sh
./setup.sh

# Run setup script (Windows)
setup.bat
```

## 💻 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix
```

## 🔍 Useful URLs

```
Development:     http://localhost:3000
Resume Analyzer: http://localhost:3000/tools/resume-analyzer
```

## 📦 Package Management

```bash
# Install a new package
npm install <package-name>

# Install as dev dependency
npm install -D <package-name>

# Update all packages
npm update

# Check for outdated packages
npm outdated

# Remove a package
npm uninstall <package-name>

# Clear npm cache
npm cache clean --force
```

## 🎨 UI Component Commands

```bash
# Add a new ShadCN UI component
npx shadcn-ui@latest add <component-name>

# Examples:
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

## 🐙 Git Commands

```bash
# Initialize repository
git init

# Check status
git status

# Add files
git add .

# Commit changes
git commit -m "Your message"

# Push to remote
git push origin main

# Pull latest changes
git pull origin main

# Create new branch
git checkout -b feature/new-tool

# Switch branches
git checkout main

# Merge branch
git merge feature/new-tool
```

## 🌐 Deployment

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Manual Build

```bash
# Build project
npm run build

# Test production build locally
npm start

# Check build size
npm run build -- --analyze
```

## 🧪 Testing (Future)

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

## 🔧 Debugging

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for Node.js version
node -v

# Check for npm version
npm -v

# List all scripts
npm run
```

## 📊 Performance Analysis

```bash
# Analyze bundle size
npm run build

# Generate bundle analyzer report
ANALYZE=true npm run build

# Check for unused dependencies
npx depcheck

# Find duplicate dependencies
npm dedupe
```

## 🔐 Environment Variables

```bash
# Print environment variables (be careful!)
printenv | grep NEXT_PUBLIC

# Load .env in current shell (Linux/Mac)
export $(cat .env | xargs)

# Check if env var is set
echo $NEXT_PUBLIC_GEMINI_API_KEY
```

## 📱 Mobile Testing

```bash
# Find your local IP
# Linux/Mac
ifconfig | grep inet

# Windows
ipconfig

# Access from mobile
# Use http://<your-ip>:3000
```

## 🎯 Quick Tasks

### Create a New Tool

```bash
# Create directory
mkdir -p app/tools/my-tool

# Create page file
touch app/tools/my-tool/page.tsx

# Edit homepage to add tool
# Edit app/page.tsx
```

### Add a New Component

```bash
# Create component file
touch components/MyComponent.tsx

# Or use ShadCN
npx shadcn-ui@latest add <component>
```

### Update Dependencies

```bash
# Update Next.js
npm install next@latest react@latest react-dom@latest

# Update TypeScript
npm install -D typescript@latest

# Update Tailwind
npm install -D tailwindcss@latest
```

## 🚨 Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000 (Linux/Mac)
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Permission Issues

```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Fix script permissions
chmod +x setup.sh
```

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build

# Increase memory for build
NODE_OPTIONS='--max-old-space-size=4096' npm run build
```

## 📚 Documentation Generation

```bash
# Generate TypeScript documentation (if using TypeDoc)
npx typedoc --out docs src

# Generate component documentation (if using Storybook)
npm run storybook
```

## 🔄 Database Commands (Future)

```bash
# When you add a database:

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Open database GUI
npm run db:studio

# Reset database
npm run db:reset
```

## 📦 Docker Commands (Optional)

```bash
# Build Docker image
docker build -t ai-tools-hub .

# Run container
docker run -p 3000:3000 ai-tools-hub

# Run with env file
docker run -p 3000:3000 --env-file .env ai-tools-hub

# Stop container
docker stop <container-id>

# Remove container
docker rm <container-id>

# Remove image
docker rmi ai-tools-hub
```

## 🎨 Style Commands

```bash
# Format with Prettier (if configured)
npx prettier --write .

# Check Tailwind classes
npx tailwindcss -i ./app/globals.css -o ./output.css
```

## ⚡ Quick Fixes

```bash
# Fix "MODULE_NOT_FOUND"
npm install

# Fix "EACCES: permission denied"
sudo chown -R $USER ~/.npm

# Fix "Port 3000 is already in use"
killall node
# or
PORT=3001 npm run dev

# Fix TypeScript errors
rm -rf node_modules package-lock.json
npm install
```

## 📝 Productivity Aliases (Optional)

Add to `.bashrc` or `.zshrc`:

```bash
# Development aliases
alias dev='npm run dev'
alias build='npm run build'
alias start='npm start'

# Git aliases
alias gs='git status'
alias ga='git add .'
alias gc='git commit -m'
alias gp='git push'

# Project aliases
alias fresh='rm -rf node_modules package-lock.json && npm install'
alias clear-cache='rm -rf .next node_modules/.cache'
```

## 🎯 Keyboard Shortcuts in VS Code

```
Ctrl/Cmd + P       - Quick file open
Ctrl/Cmd + Shift + P - Command palette
Ctrl/Cmd + B       - Toggle sidebar
Ctrl/Cmd + `       - Toggle terminal
Ctrl/Cmd + /       - Toggle comment
Alt + Up/Down      - Move line up/down
Shift + Alt + Down - Copy line down
Ctrl/Cmd + D       - Select next occurrence
F2                 - Rename symbol
```

---

**Pro Tip**: Bookmark this file for quick reference during development!
