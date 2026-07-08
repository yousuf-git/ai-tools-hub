# 📁 Project Directory Structure

Complete visual representation of the AI Tools Hub project structure.

```
tools-hub/
│
├── 📚 Documentation (Root Level)
│   ├── README.md                     ⭐ Main project documentation
│   ├── INDEX.md                      📖 Documentation index (start here)
│   ├── QUICKSTART.md                 ⚡ Quick setup guide
│   ├── ARCHITECTURE.md               🏗️ Technical architecture
│   ├── CONTRIBUTING.md               🤝 How to contribute/add tools
│   ├── DEPLOYMENT.md                 🚀 Production deployment guide
│   ├── PROJECT_SUMMARY.md            🎯 Complete project overview
│   └── COMMANDS.md                   📋 Command reference
│
├── 🎨 Application Source (app/)
│   ├── layout.tsx                    🏠 Root layout with theme provider
│   ├── page.tsx                      🏡 Homepage with tool cards
│   ├── globals.css                   🎨 Global styles & Tailwind config
│   │
│   ├── api/                          🔌 API routes
│   │   └── analyze/
│   │       └── route.ts              🤖 Resume analysis API endpoint
│   │
│   └── tools/                        🛠️ Tool modules (add more here!)
│       └── resume-analyzer/
│           └── page.tsx              📄 Resume & Job Fit Analyzer
│
├── 🧩 Components (components/)
│   ├── ui/                           🎭 ShadCN UI components
│   │   ├── button.tsx               🔘 Button component
│   │   ├── card.tsx                 📇 Card component
│   │   ├── input.tsx                ⌨️ Input component
│   │   ├── textarea.tsx             📝 Textarea component
│   │   ├── label.tsx                🏷️ Label component
│   │   └── progress.tsx             📊 Progress bar component
│   │
│   ├── theme-provider.tsx           🌓 Theme context provider
│   └── theme-toggle.tsx             🌗 Dark/light mode toggle button
│
├── 🔧 Utilities (lib/)
│   ├── utils.ts                     🔨 Helper functions (cn, etc.)
│   ├── pdf-parser.ts                📄 PDF text extraction logic
│   └── gemini.ts                    🤖 Gemini AI integration
│
├── 🖼️ Static Assets (public/)
│   └── (place images, icons, etc.)
│
├── ⚙️ Configuration Files
│   ├── package.json                 📦 Dependencies & scripts
│   ├── package-lock.json            🔒 Dependency lock file
│   ├── tsconfig.json                📘 TypeScript configuration
│   ├── tailwind.config.ts           🎨 Tailwind CSS configuration
│   ├── postcss.config.js            📮 PostCSS configuration
│   ├── next.config.js               ⚡ Next.js configuration
│   ├── .eslintrc.json              ✅ ESLint configuration
│   ├── .gitignore                  🚫 Git ignore rules
│   ├── .env                        🔐 Environment variables (create this)
│   └── .env.example                📋 Environment template
│
├── 🔧 Setup Scripts
│   ├── setup.sh                    🐧 Linux/Mac setup script
│   └── setup.bat                   🪟 Windows setup script
│
└── 📁 Generated Folders (auto-created)
    ├── node_modules/               📚 Installed dependencies
    ├── .next/                      ⚡ Next.js build output
    └── out/                        📦 Static export (if used)
```

## 📊 File Count Summary

### Documentation
- **8 comprehensive guides** with 10,000+ words
- Complete setup to deployment coverage
- Architecture diagrams and code examples

### Source Code
- **Application**: 3 main pages (layout, homepage, tool)
- **Components**: 8 UI components + 2 custom components
- **Libraries**: 3 utility files
- **Configuration**: 9 config files

### Total Files
- **Core Files**: ~30 files
- **Documentation**: 8 comprehensive guides
- **Lines of Code**: 5,000+ lines
- **Ready to Deploy**: ✅ Yes!

## 🎯 Key Directories Explained

### `/app` - Application Source
The heart of your Next.js application using the App Router:
- `layout.tsx`: Root layout wrapping all pages
- `page.tsx`: Homepage with tool cards
- `tools/`: Each subdirectory is a tool (modular!)
- `api/`: Backend API routes

### `/components` - Reusable Components
Shared UI components used across the application:
- `ui/`: ShadCN components (customizable)
- Custom components for theme management

### `/lib` - Utility Functions
Business logic and helper functions:
- PDF parsing logic
- AI integration code
- Utility helpers

### `/public` - Static Assets
Images, icons, fonts, and other static files served directly

## 🔄 Data Flow Example

```
User uploads resume
       ↓
app/tools/resume-analyzer/page.tsx
       ↓
lib/pdf-parser.ts → Extract text
       ↓
lib/gemini.ts → AI analysis
       ↓
components/ui/* → Display results
```

## 📂 Where to Add New Tools

```
app/tools/
├── resume-analyzer/     ✅ Existing tool
├── your-new-tool/       ⬅️ Add here!
│   └── page.tsx
├── another-tool/        ⬅️ And here!
│   └── page.tsx
└── ...                  ⬅️ Unlimited tools!
```

Then register in `app/page.tsx` tools array.

## 🎨 Styling Architecture

```
app/globals.css          → Global styles & CSS variables
tailwind.config.ts       → Tailwind theme configuration
components/ui/*          → Component-specific styles
```

## 🔐 Environment Variables

```
.env.example    → Template (committed to Git)
.env            → Actual keys (NOT in Git, create locally)
```

## 📦 Dependencies Overview

### Production Dependencies
- **next**: Framework
- **react**: UI library
- **typescript**: Type safety
- **tailwindcss**: Styling
- **framer-motion**: Animations
- **@google/generative-ai**: AI integration
- **pdfjs-dist**: PDF parsing
- **@radix-ui/***: UI primitives
- **lucide-react**: Icons

### Development Dependencies
- **@types/***: TypeScript definitions
- **eslint**: Code linting
- **autoprefixer**: CSS processing

## 🚀 Build Output

```
.next/
├── cache/              → Build cache
├── server/             → Server bundles
├── static/             → Static assets
│   ├── chunks/         → JavaScript chunks
│   └── css/            → Compiled CSS
└── types/              → TypeScript types
```

## 📱 Responsive Design Structure

```
Mobile First Approach:
Default     → Mobile styles
md:         → Tablet (768px+)
lg:         → Desktop (1024px+)
xl:         → Large desktop (1280px+)
2xl:        → Extra large (1400px+)
```

## 🎯 Quick File Reference

| Need to...                    | File to Edit                |
|-------------------------------|----------------------------|
| Add new tool                  | `app/tools/[name]/page.tsx` |
| Register tool on homepage     | `app/page.tsx`             |
| Customize theme colors        | `app/globals.css`          |
| Add UI component              | `components/ui/`           |
| Add utility function          | `lib/utils.ts`             |
| Configure API                 | `lib/gemini.ts`            |
| Change personal info          | `app/page.tsx`             |
| Add dependencies              | `package.json`             |

## 🔍 Finding Specific Code

| Looking for...            | Location                          |
|---------------------------|-----------------------------------|
| Homepage layout           | `app/page.tsx`                   |
| Tool cards                | `app/page.tsx` (tools array)     |
| Resume analyzer           | `app/tools/resume-analyzer/`     |
| PDF extraction            | `lib/pdf-parser.ts`              |
| AI prompts                | `lib/gemini.ts`                  |
| Theme toggle              | `components/theme-toggle.tsx`    |
| Button styles             | `components/ui/button.tsx`       |
| Card styles               | `components/ui/card.tsx`         |
| Color scheme              | `app/globals.css`                |
| API routes                | `app/api/*/route.ts`             |

## 📈 Growth Path

```
Current:
└── tools/
    └── resume-analyzer/

After adding 3 more tools:
└── tools/
    ├── resume-analyzer/     ✅
    ├── image-compressor/    ✨ New!
    ├── code-reviewer/       ✨ New!
    └── email-writer/        ✨ New!
```

Each tool is independent and self-contained!

## 🎓 Learning the Structure

**Day 1**: Explore `/app` to understand pages
**Day 2**: Check `/components` to see UI building blocks
**Day 3**: Review `/lib` to understand utilities
**Day 4**: Read docs to plan your first tool!

---

**This structure is designed for clarity, scalability, and ease of development.**

Start exploring with [INDEX.md](./INDEX.md) for navigation help!
