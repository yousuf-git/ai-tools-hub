import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini models with fallback support
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
];

interface ExamineProposalRequest {
  jobDescription: string;
  proposalText: string;
  clientName?: string;
  jobCategory?: string;
  clientExperience?: string;
  budgetRange?: string;
  startWordRequired?: string;
  immediateAvailability?: boolean;
  experienceRequired?: string;
  preferredModel?: string;
}

const EXAMINER_PROMPT = `You are an expert Upwork Proposal Examiner and reviewer. Your task is to critically evaluate an Upwork proposal using the same professional standards and criteria used for writing high-converting proposals.

You must act as a strict but fair reviewer whose goal is to improve proposal quality, clarity, and conversion potential.

PRIMARY OBJECTIVE:
Examine the given proposal against proven Upwork proposal best practices and provide:
1) Clear scores (out of 10) across defined criteria
2) Identification of weaknesses and deficiencies
3) Actionable, concrete improvement suggestions
4) A short rewritten example ONLY where it meaningfully improves clarity or impact

STRICT EVALUATION CONTEXT:
- The proposal is meant for Upwork.
- First 224 characters are critical for winning attention.
- Proposal should feel human, personalized, and client-centric.
- Overly generic, salesy, emotional, or templated language must be penalized.
- Simplicity, relevance, and clarity matter more than jargon or self-praise.

EVALUATION CRITERIA (score each out of 10):

1) Hook Strength (First 224 Characters)
- Does it immediately address the client's pain point or goal?
- Does it avoid greetings and filler?
- Does it feel specific to the job?

2) Client Pain Point Identification
- Is the client's core problem or objective clearly stated?
- Is it accurate and relevant to the job description?
- Is it client-focused rather than self-focused?

3) Solution & Approach Quality
- Is a clear solution or approach proposed?
- Is the depth appropriate for the client's experience level?
- Does it avoid unnecessary technical detail for experienced clients?
- Does it explain enough for naive clients?

4) Relevance & Alignment
- Does the proposal align with the job category?
- Are skills, experience, or examples directly related to the job?
- Is there evidence of understanding the client's context?

5) Structure & Flow
- Does the proposal follow a logical sequence?
  (Name → Pain → Solution → Proof → Support → CTA → Signature)
- Is it easy to skim and read?
- Are transitions smooth and natural?

6) Support Section Effectiveness
- Is there a clear "Here is how I can support you" (or equivalent)?
- Are bullets skimmable and non-redundant?
- Do they add value beyond repeating the solution?

7) Questions Usage (if present)
- Are questions necessary and purposeful?
- Are they placed correctly (early if critical)?
- Are they concise and non-vague?

8) CTA Strength
- Is the CTA natural and confidence-based?
- Does it align with the budget range if mentioned?
- Does it avoid desperation or generic closing lines?

9) Tone & Language Quality
- Simple English, professional, confident?
- No heavy jargon or buzzwords?
- Sounds human, not AI-templated?

10) Overall Conversion Potential
- Would this proposal realistically win attention?
- Does it build trust quickly?
- Does it feel worth replying to?

EVALUATION RULES:
- Do NOT rewrite the full proposal unless explicitly asked.
- Do NOT change tone preferences unless required.
- Do NOT assume missing facts; judge based on what is written.
- Be precise and direct. Avoid vague feedback.

OUTPUT FORMAT (respond with valid JSON only):
{
  "scores": {
    "hookStrength": <number 0-10>,
    "painPointIdentification": <number 0-10>,
    "solutionQuality": <number 0-10>,
    "relevanceAlignment": <number 0-10>,
    "structureFlow": <number 0-10>,
    "supportSection": <number 0-10>,
    "questionsUsage": <number 0-10>,
    "ctaStrength": <number 0-10>,
    "toneLanguage": <number 0-10>,
    "conversionPotential": <number 0-10>
  },
  "overallScore": <average of all scores>,
  "deficiencies": [<array of 3-5 key weaknesses as strings>],
  "improvements": [<array of actionable suggestions as strings>],
  "improvedExamples": {
    "openingHook": "<improved opening if needed, or null>",
    "weakParagraph": "<improved paragraph if needed, or null>",
    "cta": "<improved CTA if needed, or null>"
  },
  "finalVerdict": "<one paragraph summarizing how close to high-converting and what to fix>"
}`;

async function examineProposalWithGemini(
  jobDescription: string,
  proposalText: string,
  context: any,
  preferredModel?: string
): Promise<any> {
  const modelOrder = preferredModel
    ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)]
    : GEMINI_MODELS;

  let lastError: Error | null = null;

  for (const modelName of modelOrder) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      const contextStr = `
<JOB_DESCRIPTION>
${jobDescription}
</JOB_DESCRIPTION>

<PROPOSAL_TEXT>
${proposalText}
</PROPOSAL_TEXT>

${context.clientName ? `<CLIENT_NAME>${context.clientName}</CLIENT_NAME>` : ''}
${context.jobCategory ? `<JOB_CATEGORY>${context.jobCategory}</JOB_CATEGORY>` : ''}
${context.clientExperience ? `<CLIENT_EXPERIENCE_LEVEL>${context.clientExperience}</CLIENT_EXPERIENCE_LEVEL>` : ''}
${context.budgetRange ? `<BUDGET_RANGE>${context.budgetRange}</BUDGET_RANGE>` : ''}
${context.startWordRequired ? `<START_WORD_REQUIRED>${context.startWordRequired}</START_WORD_REQUIRED>` : ''}
${context.immediateAvailability ? `<IMMEDIATE_AVAILABILITY_REQUIRED>true</IMMEDIATE_AVAILABILITY_REQUIRED>` : ''}
${context.experienceRequired ? `<EXPERIENCE_LEVEL_REQUIRED>${context.experienceRequired}</EXPERIENCE_LEVEL_REQUIRED>` : ''}
`;

      const prompt = `${EXAMINER_PROMPT}

---
${contextStr}

Examine this proposal and provide a detailed evaluation in valid JSON format as specified above.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }

      // Clean the response to ensure it's valid JSON
      let cleanedText = text.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }

      const evaluation = JSON.parse(cleanedText);

      // Validate the response structure
      if (
        !evaluation.scores ||
        typeof evaluation.overallScore !== 'number' ||
        !Array.isArray(evaluation.deficiencies) ||
        !Array.isArray(evaluation.improvements)
      ) {
        throw new Error('Invalid response structure from Gemini API');
      }

      return evaluation;
    } catch (error: any) {
      console.error(`Error with model ${modelName}:`, error.message);
      lastError = error;

      // If it's a rate limit or service unavailable error, try the next model
      const status = error?.status || error?.response?.status;
      if (status === 429 || status === 503 || status === 500) {
        console.log(`Model ${modelName} failed, trying next model...`);
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  // If all models failed, throw the last error
  throw lastError || new Error('Failed to examine proposal with all available models');
}

export async function POST(request: NextRequest) {
  try {
    const body: ExamineProposalRequest = await request.json();
    const {
      jobDescription,
      proposalText,
      clientName,
      jobCategory,
      clientExperience,
      budgetRange,
      startWordRequired,
      immediateAvailability,
      experienceRequired,
      preferredModel,
    } = body;

    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    if (!proposalText || proposalText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Proposal text is required' },
        { status: 400 }
      );
    }

    const context = {
      clientName,
      jobCategory,
      clientExperience,
      budgetRange,
      startWordRequired,
      immediateAvailability,
      experienceRequired,
    };

    const evaluation = await examineProposalWithGemini(
      jobDescription,
      proposalText,
      context,
      preferredModel
    );

    return NextResponse.json({ evaluation });
  } catch (error: any) {
    console.error('Error examining proposal:', error);

    const status = error?.status || error?.response?.status || 500;
    const errorMessage = error?.message || 'Failed to examine proposal';

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
