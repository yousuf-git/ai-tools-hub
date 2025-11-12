# 🚀 AI Tools Hub

A modern, scalable web application that serves as a hub for multiple AI-powered tools. Built with Next.js 14, TypeScript, and powered by Google's Gemini AI.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🎨 **Modern UI**: Clean, professional interface with ShadCN UI components
- 🌓 **Dark/Light Mode**: Seamless theme switching with next-themes
- 🎭 **Smooth Animations**: Framer Motion powered transitions and effects
- 📱 **Fully Responsive**: Works perfectly on mobile, tablet, and desktop
- 🔧 **Modular Architecture**: Easy to add new tools
- ⚡ **Fast & Optimized**: Built with Next.js 14 App Router
- 🤖 **AI-Powered**: Leverages Google Gemini API for intelligent analysis

## 🧩 Available Tools

### 1. Resume & Job Fit Analyzer

Upload your resume and job description to receive:

- **Match Score**: Percentage match between your resume and job requirements
- **Missing Skills**: Skills mentioned in the job but absent from your resume
- **Weak Skills**: Skills present but not well-demonstrated
- **Suggested Improvements**: AI-generated rewrites for specific resume sections
- **ATS Optimization**: Tips to improve your resume for Applicant Tracking Systems

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI (Radix UI primitives)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **AI**: Google Gemini API
- **PDF Processing**: pdfjs-dist
- **Theme**: next-themes
- **State Management**: React Hooks (Zustand ready)

## 📁 Project Structure

```
tools-hub/
├── app/
│   ├── globals.css           # Global styles with Tailwind
│   ├── layout.tsx             # Root layout with theme provider
│   ├── page.tsx               # Homepage with tool cards
│   └── tools/
│       └── resume-analyzer/
│           └── page.tsx       # Resume analyzer tool
├── components/
│   ├── ui/                    # ShadCN UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   └── progress.tsx
│   ├── theme-provider.tsx     # Theme context provider
│   └── theme-toggle.tsx       # Dark/light mode toggle
├── lib/
│   ├── utils.ts               # Utility functions (cn helper)
│   ├── pdf-parser.ts          # PDF text extraction
│   └── gemini.ts              # Gemini API integration
├── public/                    # Static assets
├── .env.example               # Environment variables template
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository** (or use the provided files)

```bash
cd tools-hub
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
```

4. **Run the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Modular Tool System

Each tool is designed as a self-contained module within the `app/tools/` directory. This architecture makes it easy to add new tools:

```typescript
// Example: Adding a new tool
app/tools/your-new-tool/
  └── page.tsx              // Tool implementation
```

### Adding New Tools

1. **Create a new tool directory**

```bash
mkdir -p app/tools/your-tool-name
```

2. **Create the tool page**

```typescript
// app/tools/your-tool-name/page.tsx
"use client";

export default function YourToolName() {
  return (
    <div>
      {/* Your tool UI */}
    </div>
  );
}
```

3. **Add the tool to the homepage**

```typescript
// app/page.tsx
const tools = [
  // ... existing tools
  {
    id: "your-tool-name",
    name: "Your Tool Name",
    description: "Brief description of what your tool does",
    icon: YourIcon, // from lucide-react
    href: "/tools/your-tool-name",
    color: "from-purple-500 to-pink-500",
  },
];
```

### How Gemini API Integration Works

The `lib/gemini.ts` file contains the AI integration logic:

1. **Initialize the Gemini client** with your API key
2. **Create a structured prompt** that requests JSON output
3. **Parse the response** into a TypeScript interface
4. **Return structured data** to the UI component

```typescript
// Simplified flow
const analysis = await analyzeResumeWithGemini(resumeText, jobDescription);
// Returns: { matchScore, missingSkills, weakSkills, suggestedImprovements, ... }
```

### Resume Text Extraction

The `lib/pdf-parser.ts` file handles PDF processing:

1. **Accept a PDF file** from the user
2. **Convert to ArrayBuffer**
3. **Use pdfjs-dist** to extract text from each page
4. **Combine into a single text string**
5. **Pass to Gemini** for analysis

## 🎨 Customization

### Personalizing the Homepage

Edit `app/page.tsx`:

```typescript
// Replace with your information
<p className="text-lg md:text-xl text-muted-foreground mb-8">
  Hi, I'm <span className="font-semibold text-foreground">Your Name</span>
</p>

// Update social links
const socialLinks = [
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/yourusername",
  },
  // ... more links
];
```

### Styling

The project uses Tailwind CSS with a custom color scheme defined in `app/globals.css`. Modify the CSS variables to change the theme:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* ... more variables */
}
```

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variable: `NEXT_PUBLIC_GEMINI_API_KEY`
5. Deploy!

### Build for Production

```bash
npm run build
npm start
```

## 🔮 Future Tool Ideas

Here are some ideas for additional tools you can integrate:

1. **Image Compressor**: AI-powered image optimization with quality preservation
2. **Code Reviewer**: Analyze code for best practices and suggest improvements
3. **Text Summarizer**: Condense long articles into key points
4. **Language Translator**: Multi-language translation with context awareness
5. **SEO Analyzer**: Analyze web content for SEO optimization
6. **Email Writer**: Generate professional emails from bullet points
7. **Social Media Generator**: Create engaging social media posts
8. **Interview Prep**: Generate interview questions based on job description
9. **Cover Letter Generator**: Create tailored cover letters from resume + job description
10. **Salary Analyzer**: Estimate fair compensation based on role and location

## 📚 Key Learnings

### Why This Architecture?

- **Modularity**: Each tool is independent and can be developed/maintained separately
- **Scalability**: Easy to add new tools without affecting existing ones
- **Type Safety**: TypeScript ensures robust code with fewer runtime errors
- **Performance**: Next.js App Router provides optimal loading and rendering
- **User Experience**: Framer Motion creates smooth, professional animations

### Best Practices Implemented

- ✅ TypeScript for type safety
- ✅ Component-based architecture
- ✅ Responsive design with Tailwind
- ✅ Accessible UI with Radix primitives
- ✅ SEO-friendly with Next.js metadata
- ✅ Error handling and loading states
- ✅ Environment variable management
- ✅ Clean code structure

## 🤝 Contributing

Feel free to fork this project and add your own tools! Contributions are welcome.

## 📝 License

This project is open source and available under the MIT License.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [ShadCN UI](https://ui.shadcn.com/) - Beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI model
- [Lucide Icons](https://lucide.dev/) - Icon library

---

Built with ❤️ using Next.js, TypeScript, and AI

---

Author: [M. Yousuf](https://www.linkedin.com/in/muhammad-yousuf952)\
Date: November 2025
