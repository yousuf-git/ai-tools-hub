import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

// Model configuration with rate limits
export const GEMINI_MODELS = [
  { name: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', rateLimit: 3, description: 'Balanced speed and quality' },
  { name: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', rateLimit: 5, description: 'Fastest, lightweight' },
  { name: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', rateLimit: 3, description: 'Fast, lightweight' },
  { name: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', rateLimit: 3, description: 'Balanced' },
  { name: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', rateLimit: 1, description: 'Highest quality (slowest)' },
] as const;

export interface AnalysisResult {
  matchScore: number;
  missingSkills: string[];
  weakSkills: string[];
  suggestedImprovements: Array<{
    section: string;
    original: string;
    improved: string;
    reason: string;
  }>;
  atsOptimizations: string[];
  overallFeedback: string;
  modelUsed?: string; // Track which model was used
  wasFallback?: boolean; // Track if a fallback model was used
}

// Enhanced error handling with specific error codes
function handleGeminiError(error: any, modelName: string): { shouldRetry: boolean; userMessage: string } {
  const errorMsg = error?.message || '';
  const status = error?.status || 0;
  
  // 400 - INVALID_ARGUMENT
  if (status === 400 && errorMsg.includes('INVALID_ARGUMENT')) {
    return {
      shouldRetry: false,
      userMessage: 'Invalid request format. Please check your input and try again. If the issue persists, the document might be too large or contain unsupported content.'
    };
  }
  
  // 400 - FAILED_PRECONDITION
  if (status === 400 && errorMsg.includes('FAILED_PRECONDITION')) {
    return {
      shouldRetry: false,
      userMessage: 'Gemini API is not available in your region with the free tier. Please enable billing in Google AI Studio or use a VPN.'
    };
  }
  
  // 403 - PERMISSION_DENIED
  if (status === 403 || errorMsg.includes('PERMISSION_DENIED') || errorMsg.includes('403')) {
    return {
      shouldRetry: false,
      userMessage: 'API key permission denied. Please verify your API key is valid and has the required permissions in Google AI Studio.'
    };
  }
  
  // 404 - NOT_FOUND
  if (status === 404 || errorMsg.includes('NOT_FOUND') || errorMsg.includes('not found')) {
    return {
      shouldRetry: false,
      userMessage: `Model "${modelName}" not found. This model may not be available in your API version. Please try a different model.`
    };
  }
  
  // 429 - RESOURCE_EXHAUSTED (Rate limit)
  if (status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('429') || errorMsg.includes('quota')) {
    return {
      shouldRetry: true,
      userMessage: `Rate limit exceeded for ${modelName}. Trying fallback model with higher rate limit...`
    };
  }
  
  // 500 - INTERNAL
  if (status === 500 || errorMsg.includes('INTERNAL') || errorMsg.includes('500')) {
    return {
      shouldRetry: true,
      userMessage: 'Internal server error. Your input might be too long. Trying a different model or reduce input size...'
    };
  }
  
  // 503 - UNAVAILABLE (Overloaded)
  if (status === 503 || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('503') || errorMsg.includes('overloaded')) {
    return {
      shouldRetry: true,
      userMessage: `${modelName} is temporarily overloaded. Trying fallback model...`
    };
  }
  
  // 504 - DEADLINE_EXCEEDED
  if (status === 504 || errorMsg.includes('DEADLINE_EXCEEDED') || errorMsg.includes('504') || errorMsg.includes('timeout')) {
    return {
      shouldRetry: false,
      userMessage: 'Request timeout. Your input is too large to process. Please reduce the size of your resume or job description and try again.'
    };
  }
  
  // Default unknown error
  return {
    shouldRetry: false,
    userMessage: `Unexpected error: ${errorMsg || 'Unknown error occurred'}`
  };
}

export async function analyzeResumeWithGemini(
  resumeText: string,
  jobDescription: string,
  preferredModel?: string
): Promise<AnalysisResult> {
  // Model priority list - use preferred model first if specified
  let models = [
    { name: 'gemini-2.5-flash', label: 'Primary' },
    { name: 'gemini-2.0-flash-lite', label: 'Fallback 1' },
    { name: 'gemini-2.5-flash-lite', label: 'Fallback 2' },
    { name: 'gemini-2.0-flash', label: 'Fallback 3' },
  ];
  
  // If user selected a preferred model, try it first
  if (preferredModel) {
    const preferred = GEMINI_MODELS.find(m => m.name === preferredModel);
    if (preferred) {
      models = [
        { name: preferred.name, label: 'User Selected' },
        ...models.filter(m => m.name !== preferredModel)
      ];
    }
  }

  // Check if API key is available
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === '') {
    throw new Error('Gemini API key is not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env file.');
  }

  let lastError: Error | null = null;
  let firstModelAttempted = '';

  // Try each model in order
  for (let i = 0; i < models.length; i++) {
    const { name: modelName, label } = models[i];
    if (i === 0) firstModelAttempted = modelName;
    try {
      console.log(`Attempting to use model: ${modelName} (${label})`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const prompt = `You are an expert ATS (Applicant Tracking System) and resume analyst. Analyze the following resume against the job description and provide a comprehensive analysis.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown or additional text):
{
  "matchScore": <number between 0-100>,
  "missingSkills": [<array of skills mentioned in job description but missing from resume>],
  "weakSkills": [<array of skills present but not well-demonstrated in resume>],
  "suggestedImprovements": [
    {
      "section": "<section name, e.g., 'Work Experience - Project Manager'>",
      "original": "<original text from resume>",
      "improved": "<improved version with better ATS keywords and impact>",
      "reason": "<brief explanation why this improvement helps>"
    }
  ],
  "atsOptimizations": [<array of general ATS optimization tips>],
  "overallFeedback": "<2-3 sentence summary of strengths and areas for improvement>"
}

Guidelines:
- matchScore should reflect how well the resume aligns with job requirements
- Focus on quantifiable achievements and action verbs
- Ensure improved versions use keywords from the job description naturally
- Provide 3-5 specific improvements for key sections
- Be constructive and specific in feedback`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to ensure it's valid JSON
    let cleanedText = text.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '');
    }
    
    const analysis: AnalysisResult = JSON.parse(cleanedText);
    
    // Validate the response structure
    if (
      typeof analysis.matchScore !== 'number' ||
      !Array.isArray(analysis.missingSkills) ||
      !Array.isArray(analysis.weakSkills) ||
      !Array.isArray(analysis.suggestedImprovements) ||
      !Array.isArray(analysis.atsOptimizations)
    ) {
      throw new Error('Invalid response structure from Gemini API');
    }
    
    console.log(`✅ Successfully used model: ${modelName} (${label})`);
    
    // Add metadata about which model was used
    const wasFallback = modelName !== firstModelAttempted;
    return {
      ...analysis,
      modelUsed: modelName,
      wasFallback
    };

    } catch (error) {
      console.error(`Failed with model ${modelName} (${label}):`, error instanceof Error ? error.message : error);
      lastError = error as Error;
      
      // Handle error with specific error codes
      const { shouldRetry, userMessage } = handleGeminiError(error, modelName);
      
      if (shouldRetry && i < models.length - 1) {
        console.log(userMessage);
        continue; // Try next model
      }
      
      // For non-retryable errors or last model, throw with user-friendly message
      throw new Error(userMessage);
    }
  }

  // If all models failed, throw the last error
  console.error('All models failed. Last error:', lastError);
  throw new Error(`All Gemini models are currently unavailable. Please try again later. ${lastError?.message || ''}`);
}
