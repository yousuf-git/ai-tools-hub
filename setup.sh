#!/bin/bash

# AI Tools Hub - Installation Script
# This script sets up the development environment

echo "🚀 Setting up AI Tools Hub..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
node_version=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $node_version"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi

echo "✅ Dependencies installed successfully!"
echo ""

# Setup environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created!"
    echo ""
    echo "⚠️  IMPORTANT: Add your Gemini API key to .env file"
    echo "   Get your API key from: https://makersuite.google.com/app/apikey"
    echo "   Edit .env and replace 'your_gemini_api_key_here' with your actual key"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your Gemini API key to .env file"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Main documentation"
echo "   - QUICKSTART.md - Quick setup guide"
echo "   - ARCHITECTURE.md - Technical details"
echo "   - CONTRIBUTING.md - How to add new tools"
echo "   - DEPLOYMENT.md - Production deployment"
echo ""
echo "Happy coding! 🚀"
