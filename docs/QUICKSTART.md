# 🚀 Quick Start Guide

Get your AI Tools Hub up and running in minutes!

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- A Google Gemini API key

## Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (keep it secure!)

## Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js, React, TypeScript
- Tailwind CSS, ShadCN UI
- Framer Motion, Lucide Icons
- Google Generative AI SDK
- PDF.js for PDF parsing

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Then edit `.env` and add your API key:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

## Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Customize Your Hub

### Update Personal Information

Edit `app/page.tsx`:

```typescript
// Line ~75
Hi, I'm <span className="font-semibold text-foreground">Your Name</span>

// Lines ~36-48
const socialLinks = [
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/yourusername", // ← Change this
  },
  // ... update other links
];
```

### Try the Resume Analyzer

1. Click on "Resume & Job Fit Analyzer" card
2. Upload a sample resume (PDF format)
3. Paste or upload a job description
4. Click "Analyze Resume"
5. View the AI-generated insights!

## Common Issues

### Issue: "Cannot find module 'xxx'"

**Solution**: Run `npm install` again

### Issue: "API key is invalid"

**Solution**: 
1. Check that you copied the full API key
2. Ensure no extra spaces in the `.env` file
3. Restart the development server after changing `.env`

### Issue: "PDF extraction failed"

**Solution**: 
1. Ensure the PDF is text-based (not scanned images)
2. Try a different PDF file
3. Check browser console for specific errors

### Issue: Animations not working

**Solution**: 
1. Clear browser cache
2. Ensure JavaScript is enabled
3. Try a different browser (Chrome/Firefox recommended)

## Building for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Add environment variable: `NEXT_PUBLIC_GEMINI_API_KEY`
6. Deploy!

### Option 2: Netlify

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site"
4. Import your repository
5. Build command: `npm run build`
6. Publish directory: `.next`
7. Add environment variable
8. Deploy!

### Option 3: Self-Hosted

Requirements:
- Node.js 18+ on server
- Nginx or Apache for reverse proxy
- SSL certificate for HTTPS

```bash
# On your server
git clone your-repo
cd tools-hub
npm install
npm run build
npm start
```

## Next Steps

1. ✅ **Customize the homepage** with your information
2. ✅ **Test the resume analyzer** with sample documents
3. ✅ **Add your own styling** tweaks
4. ✅ **Deploy to production**
5. 🚀 **Start building new tools!**

## Need Help?

- Check the [README.md](./README.md) for detailed information
- Read the [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Review the code comments for inline documentation

---

Happy coding! 🎉
