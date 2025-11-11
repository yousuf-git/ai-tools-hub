import { NextRequest, NextResponse } from 'next/server';
import { analyzeResumeWithGemini } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { resumeText, jobDescription, preferredModel } = await request.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume text and job description are required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env file.' },
        { status: 500 }
      );
    }

    const result = await analyzeResumeWithGemini(resumeText, jobDescription, preferredModel);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze-resume API route:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze resume. Please try again.' 
      },
      { status: 500 }
    );
  }
}
