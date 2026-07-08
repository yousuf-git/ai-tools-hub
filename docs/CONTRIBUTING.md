# 🤝 Contributing Guide

Thank you for your interest in contributing to the AI Tools Hub! This guide will help you add new tools to the platform.

## 📋 Before You Start

1. Read the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
2. Check the [README.md](./README.md) for setup instructions
3. Ensure you have a working development environment

## 🛠️ Adding a New Tool

### Step 1: Plan Your Tool

Answer these questions:
- **What problem does it solve?**
- **What inputs does it need?**
- **What outputs will it provide?**
- **Will it use AI? Which API?**

### Step 2: Create the Tool Structure

```bash
# Create tool directory
mkdir -p app/tools/your-tool-name

# Create the main page
touch app/tools/your-tool-name/page.tsx
```

### Step 3: Implement the Tool UI

Use this template as a starting point:

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function YourToolName() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleProcess = async () => {
    setIsProcessing(true);
    setError("");
    setResult(null);

    try {
      // Your processing logic here
      // Example: Call API, process data, etc.
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-4">Your Tool Name</h1>
          <p className="text-muted-foreground">
            Brief description of what your tool does
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Input Section</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your input components here */}
            
            <Button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full mt-4"
            >
              {isProcessing ? "Processing..." : "Process"}
            </Button>

            {error && (
              <p className="text-destructive text-sm mt-2">{error}</p>
            )}
          </CardContent>
        </Card>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Display your results here */}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
```

### Step 4: Add Service Logic (if needed)

Create a service file in `lib/`:

```typescript
// lib/your-tool-service.ts
export interface YourToolResult {
  // Define your result type
}

export async function processYourTool(input: string): Promise<YourToolResult> {
  try {
    // Your processing logic
    // Could involve API calls, data processing, etc.
    
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Processing failed');
  }
}
```

### Step 5: Register Tool on Homepage

Edit `app/page.tsx` and add your tool to the array:

```typescript
const tools = [
  // ... existing tools
  {
    id: "your-tool-name",
    name: "Your Tool Display Name",
    description: "A brief description of what your tool does (1-2 sentences)",
    icon: YourIcon, // Choose from lucide-react
    href: "/tools/your-tool-name",
    color: "from-purple-500 to-pink-500", // Pick gradient colors
  },
];
```

### Step 6: Test Your Tool

1. Run `npm run dev`
2. Navigate to your tool
3. Test all functionality
4. Check error handling
5. Verify responsive design
6. Test dark/light modes

## 🎨 Design Guidelines

### Visual Consistency

- Use existing color palette from `app/globals.css`
- Follow spacing conventions (use Tailwind utilities)
- Match animation styles (use Framer Motion)
- Keep card layouts consistent

### Component Reuse

Prefer using existing components:
- `Button` for actions
- `Card` for content containers
- `Input` / `Textarea` for text input
- `Label` for form labels
- `Progress` for loading states

### Responsive Design

Test on multiple screen sizes:
```typescript
// Use responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Content */}
</div>
```

### Accessibility

- Use semantic HTML
- Add aria-labels where needed
- Ensure keyboard navigation works
- Test with screen readers

## 🔌 API Integration Guidelines

### Using Gemini API

Follow the pattern in `lib/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function yourAIFunction(input: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `Your detailed prompt here...`;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
```

### Using Other APIs

If using a different API:

1. Add API key to `.env.example`
2. Create service file in `lib/`
3. Handle errors gracefully
4. Add loading states
5. Consider rate limiting

## ✅ Code Quality Checklist

Before submitting:

- [ ] Code follows TypeScript best practices
- [ ] No console errors or warnings
- [ ] Error handling is implemented
- [ ] Loading states are shown
- [ ] Responsive design works on mobile
- [ ] Dark mode works correctly
- [ ] Animations are smooth
- [ ] Comments explain complex logic
- [ ] Tool is added to homepage
- [ ] README is updated (if needed)

## 📝 Documentation

### Tool Documentation

Create a README in your tool directory:

```markdown
# Your Tool Name

## Description
What it does and why it's useful.

## How to Use
1. Step 1
2. Step 2
3. Step 3

## Technical Details
- APIs used
- Processing logic
- Limitations

## Future Improvements
- Feature idea 1
- Feature idea 2
```

### Code Comments

Add comments for complex logic:

```typescript
/**
 * Processes the input data and returns results
 * @param input - The user's input text
 * @returns Processed result with analysis
 */
export async function processData(input: string): Promise<Result> {
  // Step 1: Validate input
  if (!input) throw new Error('Input required');
  
  // Step 2: Process with AI
  const result = await aiService(input);
  
  return result;
}
```

## 🎯 Tool Ideas to Get Started

### Easy Tools (Good for Beginners)
1. **Text Counter**: Word/character counter with statistics
2. **Color Palette Generator**: Random color schemes
3. **Password Generator**: Secure password creation
4. **Base64 Encoder/Decoder**: Simple encoding tool

### Medium Tools
1. **Markdown Preview**: Live markdown editor
2. **JSON Formatter**: Format and validate JSON
3. **QR Code Generator**: Create QR codes from text
4. **URL Shortener**: Shorten URLs (with backend)

### Advanced Tools (AI-Powered)
1. **Code Reviewer**: Analyze code for improvements
2. **Email Writer**: Generate professional emails
3. **SEO Analyzer**: Analyze content for SEO
4. **Interview Prep**: Generate interview questions

## 🐛 Reporting Issues

If you find a bug:

1. Check if it's already reported
2. Provide clear reproduction steps
3. Include error messages
4. Mention your environment (OS, browser, etc.)

## 💡 Suggesting Features

When suggesting a new tool:

1. Describe the use case
2. Explain the expected behavior
3. Consider technical feasibility
4. Think about user experience

## 📞 Getting Help

- Read existing code for examples
- Check the documentation files
- Look at the Resume Analyzer tool as a reference
- Review the component library in `components/ui/`

## 🎉 Recognition

Contributors will be acknowledged in the README.

---

Thank you for helping make AI Tools Hub better! 🚀
