# Architecture & Implementation Guide

## 🏛️ System Architecture

### Overview

The AI Tools Hub is built using a modern, modular architecture that prioritizes scalability, maintainability, and user experience. The system follows a client-server pattern with edge-ready API routes.

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Homepage  │  │   Tools    │  │  Components │            │
│  │  (Dashboard)│  │  (Modules) │  │  (UI/UX)   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   State    │  │  Utilities │  │  Routing   │            │
│  │ Management │  │   (lib/)   │  │ (Next.js)  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Service Layer                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Gemini AI │  │ PDF Parser │  │ API Routes │            │
│  │ Integration│  │  (pdfjs)   │  │  (Next.js) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  ┌────────────┐  ┌────────────┐                             │
│  │ Google     │  │   CDN      │                             │
│  │ Gemini API │  │ (pdfjs)    │                             │
│  └────────────┘  └────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Component Architecture

### Design Principles

1. **Composition over Inheritance**: Use React composition patterns
2. **Single Responsibility**: Each component has one clear purpose
3. **Reusability**: Components are generic and configurable
4. **Type Safety**: Full TypeScript coverage

### Component Hierarchy

```
RootLayout (Theme Provider)
├── HomePage
│   ├── Header
│   │   └── ThemeToggle
│   ├── HeroSection (Personal Intro)
│   │   └── SocialLinks
│   ├── ToolsSection
│   │   └── ToolCard[] (Dynamic)
│   └── Footer
│
└── ToolPages
    └── ResumeAnalyzer
        ├── Header
        ├── UploadSection
        │   ├── ResumeUpload
        │   └── JobDescriptionInput
        └── ResultsSection
            ├── MatchScoreCard
            ├── SkillsAnalysis
            ├── ImprovementsSuggestions
            └── ATSOptimizations
```

## 🔄 Data Flow

### Resume Analysis Flow

```
1. User uploads resume (PDF) + job description (text/PDF)
                    ▼
2. Client: Extract text using pdfjs-dist
                    ▼
3. Client: Send extracted text to Gemini API
                    ▼
4. Gemini: Process with structured prompt
                    ▼
5. Gemini: Return JSON with analysis
                    ▼
6. Client: Parse JSON into TypeScript interface
                    ▼
7. Client: Render results with animations
```

### State Management

Currently using React hooks for local state:
- `useState` for component state
- `useTheme` for theme management

**Future Enhancement**: Zustand for global state if needed for cross-tool data sharing.

## 🎨 UI/UX Design System

### Color System

```typescript
// Light Mode
--primary: 221.2 83.2% 53.3%     // Blue
--secondary: 210 40% 96.1%        // Light Gray
--muted: 210 40% 96.1%            // Muted Gray

// Dark Mode
--primary: 217.2 91.2% 59.8%     // Lighter Blue
--secondary: 217.2 32.6% 17.5%    // Dark Gray
--muted: 217.2 32.6% 17.5%        // Darker Gray
```

### Animation Strategy

1. **Entry Animations**: Fade + slide for page loads
2. **Hover Effects**: Scale + shadow for cards
3. **Transitions**: Smooth color/position changes
4. **Loading States**: Spin animation for async operations

```typescript
// Example Framer Motion variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  hover: { y: -8, scale: 1.02 }
};
```

### Responsive Breakpoints

```typescript
sm: 640px   // Mobile landscape
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
2xl: 1400px // Container max-width
```

## 🔧 Tool Integration Pattern

### Adding a New Tool - Step by Step

#### 1. Create Tool Directory

```bash
mkdir -p app/tools/my-new-tool
touch app/tools/my-new-tool/page.tsx
```

#### 2. Implement Tool Component

```typescript
// app/tools/my-new-tool/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MyNewTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const handleProcess = async () => {
    // Your tool logic here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Your tool UI */}
    </div>
  );
}
```

#### 3. Add Tool to Homepage

```typescript
// app/page.tsx
const tools = [
  // ... existing tools
  {
    id: "my-new-tool",
    name: "My New Tool",
    description: "Description of what this tool does",
    icon: IconName, // from lucide-react
    href: "/tools/my-new-tool",
    color: "from-green-500 to-teal-500", // Gradient colors
  },
];
```

#### 4. Create Service Logic (if needed)

```typescript
// lib/my-tool-service.ts
export async function processData(input: string) {
  // Service logic
  return result;
}
```

## 🤖 Gemini API Integration

### How It Works

#### 1. Prompt Engineering

The key to good results is a well-structured prompt:

```typescript
const prompt = `You are an expert [ROLE]. [TASK DESCRIPTION]

INPUT DATA:
${userData}

Provide your analysis in the following JSON format:
{
  "field1": <description>,
  "field2": [<array>],
  ...
}

Guidelines:
- Guideline 1
- Guideline 2
`;
```

#### 2. API Call

```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const result = await model.generateContent(prompt);
const response = await result.response;
const text = response.text();
```

#### 3. Response Parsing

```typescript
// Clean markdown code blocks
let cleanedText = text.trim()
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '');

// Parse JSON
const parsedData = JSON.parse(cleanedText);
```

#### 4. Type Safety

```typescript
interface AnalysisResult {
  field1: string;
  field2: string[];
  // ... more fields
}

const analysis: AnalysisResult = parsedData;
```

### Best Practices

1. **Request JSON output explicitly** in the prompt
2. **Provide examples** of expected format
3. **Clean the response** before parsing
4. **Validate the structure** after parsing
5. **Handle errors gracefully** with try-catch

## 📄 PDF Processing

### Text Extraction Process

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// 1. Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// 2. Load PDF
const arrayBuffer = await file.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

// 3. Extract text from all pages
let fullText = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();
  const pageText = textContent.items
    .map((item: any) => item.str)
    .join(' ');
  fullText += pageText + '\n';
}
```

### Handling Different PDF Types

- **Text-based PDFs**: Directly extractable
- **Scanned PDFs**: Would need OCR (future enhancement)
- **Encrypted PDFs**: Not currently supported

## 🔐 Security Considerations

### API Key Management

1. **Never commit** API keys to version control
2. **Use environment variables** for sensitive data
3. **Prefix with NEXT_PUBLIC_** only for client-side access
4. **Consider server-side API routes** for production

### Input Validation

```typescript
// Validate file types
if (file.type !== 'application/pdf') {
  throw new Error('Invalid file type');
}

// Validate text length
if (text.length > 50000) {
  throw new Error('Text too long');
}
```

## 🚀 Performance Optimization

### Code Splitting

Next.js automatically code-splits by route:
- Each tool is a separate chunk
- Loads only when needed

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/icon.png"
  alt="Tool icon"
  width={48}
  height={48}
  loading="lazy"
/>
```

### API Optimization

- Use streaming for large responses (future)
- Implement caching for repeated queries
- Consider rate limiting

## 📊 Future Enhancements

### Planned Features

1. **User Authentication**: Save analysis history
2. **Export Results**: PDF/Word export functionality
3. **Template Library**: Pre-built resume templates
4. **Batch Processing**: Analyze multiple resumes
5. **API Rate Limiting**: Prevent abuse
6. **Analytics Dashboard**: Usage statistics
7. **More Tools**: Expand tool collection

### Scalability Considerations

1. **Database**: Add PostgreSQL/MongoDB for user data
2. **Caching**: Redis for API response caching
3. **Queue System**: Bull/BeeQueue for async jobs
4. **CDN**: Cloudflare/Vercel Edge for static assets
5. **Monitoring**: Sentry for error tracking

## 🧪 Testing Strategy (Future)

### Unit Tests
- Component rendering
- Utility functions
- API parsing logic

### Integration Tests
- PDF extraction flow
- Gemini API integration
- End-to-end tool usage

### E2E Tests
- User journey testing
- Cross-browser compatibility

## 📚 Code Style Guide

### TypeScript Conventions

```typescript
// Use interfaces for object shapes
interface ToolConfig {
  id: string;
  name: string;
}

// Use type for unions/intersections
type Status = 'loading' | 'success' | 'error';

// Prefer const assertions
const TOOL_IDS = ['resume', 'analyzer'] as const;
```

### Component Patterns

```typescript
// Prefer functional components
export default function MyComponent() {
  // Hooks at the top
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = () => {};
  
  // Render
  return <div>...</div>;
}
```

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Pages: `page.tsx` (Next.js convention)

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Guide](https://www.framer.com/motion/)
- [Gemini API Docs](https://ai.google.dev/docs)

---

This architecture is designed to be flexible and extensible. Feel free to adapt it to your specific needs!
