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

interface GenerateProposalRequest {
  jobDescription: string;
  additionalDetails?: string;
  preferredModel?: string;
  previousProposal?: string;
  improvisationNotes?: string;
  isRevision?: boolean;
}

// Shared prompt template for both initial and revision modes
const BASE_PROMPT_TEMPLATE = `You are an expert Upwork proposal writer who crafts highly engaging, concise, and personalized proposals for any job category (technical, creative, writing, design, etc.).

Your goal: write proposals that win attention in the first 224 characters, maintain clarity, and show genuine understanding of the client's needs.

🎯 Guidelines

No greetings (never start with "Hi", "Hello", or "Dear").
The first line (224 chars) must immediately hook attention — it should be client-centric, showing you understand their need or offering an insight/mini-solution.
Don't use too excited or emotional tone. Be Balanced and formal.
Avoid filler phrases like "I read your job post carefully" or "I'm confident I can do this."
Keep the proposal simple, conversational, and precise — no heavy jargons.

Adapt tone and focus depending on the job category:

Generic Jobs (e.g., Virtual Assistant, Data Entry, Blog Writing)
→ Write a straightforward, professional proposal showing reliability and understanding of the tasks.

Skill-Based Jobs (e.g., "We need a React developer" / "Hiring content writer")
→ Align your proposal around the skills listed, how you'll apply them effectively, and a brief example.

Problem-Specific Jobs (e.g., "We need help fixing X issue" / "Our emails are not sending" / "Website speed issue")
→ Focus on the solution approach first, then short questions (if needed), then your relevant experience.

Team/Company Positions (e.g., "Join our agency as backend dev" / "Looking for long-term partner")
→ Align with the role, team collaboration mindset, communication style, and reliability.

Keep it around 150–200 words max.

Ask questions only if necessary, and make them short, purposeful, and natural.

End with a smooth CTA (Call To Action) encouraging short discussion or next step — no begging or generic "looking forward to working with you".

Output Format

1 short proposal paragraph (no greeting, no title)
Tone: friendly + confident
Length: concise, ~150–200 words

Structure:
Hook (first 1–2 lines) → grab attention with context or insight
Understanding + Alignment → what client needs & how you fit
Approach or Questions (optional) → short and to-the-point
Relevance → experience/tools directly matching need
Call To Action → short and natural closing

Bonus Behaviors

The output must always sound human, not templated (avoid emojis and symbols like '—')
It should feel like a thoughtful response to that specific client's problem.
Keep language fluid, confident, respectful, and engaging.
Note: Don't leave too many placeholders, fill them with believable, project-aligned assumptions rather than leaving placeholders. Only use placeholders where absolutely necessary.`;

async function generateProposalWithGemini(
  jobDescription: string,
  additionalDetails: string,
  preferredModel?: string,
  previousProposal?: string,
  improvisationNotes?: string
): Promise<string> {
  // Determine the order of models to try
  const modelOrder = preferredModel
    ? [preferredModel, ...GEMINI_MODELS.filter(m => m !== preferredModel)]
    : GEMINI_MODELS;

  let lastError: Error | null = null;

  // Try each model in order
  for (const modelName of modelOrder) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      // Construct the prompt based on user's template
      let prompt: string;

      if (previousProposal && improvisationNotes) {
        // Revision mode - improve upon the previous proposal
        prompt = `${BASE_PROMPT_TEMPLATE}
---

Job Description:
${jobDescription}

${additionalDetails ? `Additional Context:\n${additionalDetails}\n` : ''}

Previous Proposal:
${previousProposal}

User's Improvement Notes:
${improvisationNotes}

Based on the user's feedback, generate an IMPROVED version of the proposal that addresses their concerns and incorporates their suggestions. Make the necessary changes while maintaining the overall quality and professionalism.`;
      } else {
        // Initial generation mode
        prompt = `${BASE_PROMPT_TEMPLATE}
---

Job Description:
${jobDescription}

${additionalDetails ? `Additional Context:\n${additionalDetails}\n` : ''}

Generate a compelling Upwork proposal now.`;
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini API');
      }

      return text.trim();
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
  throw lastError || new Error('Failed to generate proposal with all available models');
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateProposalRequest = await request.json();
    const { 
      jobDescription, 
      additionalDetails = '', 
      preferredModel,
      previousProposal,
      improvisationNotes,
      isRevision = false
    } = body;

    if (!jobDescription || jobDescription.trim().length === 0) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    // If it's a revision, validate that we have the necessary data
    if (isRevision && (!previousProposal || !improvisationNotes)) {
      return NextResponse.json(
        { error: 'Previous proposal and improvisation notes are required for revisions' },
        { status: 400 }
      );
    }

    const proposal = await generateProposalWithGemini(
      jobDescription,
      additionalDetails,
      preferredModel,
      previousProposal,
      improvisationNotes
    );

    return NextResponse.json({ proposal });
  } catch (error: any) {
    console.error('Error generating proposal:', error);

    const status = error?.status || error?.response?.status || 500;
    const errorMessage = error?.message || 'Failed to generate proposal';

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
