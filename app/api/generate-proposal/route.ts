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
  proposalVersion?: 'v1' | 'v2';
  v2Fields?: {
    clientName?: string;
    jobTitle?: string;
    budgetRange?: '<500' | '500+' | 'unknown';
    clientExperience?: 'naive' | 'experienced' | 'unknown';
    immediateAvailability?: boolean;
    experienceRequired?: string;
    startWord?: string;
    relevantProject?: string;
    relevantWorkLink?: string;
  };
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

// V2 Prompt Template
const V2_PROMPT_TEMPLATE = `You are an expert Upwork proposal writer who creates concise, high-converting, human-sounding proposals across all job categories.

Primary Objective:
Win attention in the first 224 characters by directly addressing the client's pain point, then clearly present a solution-oriented proposal aligned with the client's context, maturity level, and job intent.

STRICT RULES (do not violate):
- Do NOT start with greetings (Hi, Hello, Dear).
- If <CLIENT_NAME> is provided, start exactly like:
  "<CLIENT_NAME>, <proposal content>"
- If the job description explicitly asks to start with a specific word or phrase, start with that word instead.
- First 224 characters are critical → must hook by reflecting the client's pain point or goal.
- Keep tone balanced, professional, and confident (not emotional or salesy).
- Avoid filler phrases and generic claims.
- Use simple English, no heavy jargon.
- Max length: 200-250 words (but can be increased if job description is lengthy and requires long proposal)
- Avoid placeholders unless absolutely required; infer realistic details when possible.

CONTENT REQUIREMENTS (must adapt dynamically):

1. Name Line
- Start with client name or required start word if provided.

2. Pain Point
- Clearly state the client's problem or goal in 1–2 lines.
- Show understanding, not sympathy.

3. Solution & Approach
- Always propose a solution.
- Adjust depth based on <CLIENT_EXPERIENCE_LEVEL>:
  - Naive → explain approach slightly more to build confidence.
  - Experienced → be precise, outcome-focused, no deep tool explanations.
- Mention immediate availability ONLY if required in job description.
- If expertise is requested, explicitly state alignment (e.g., "I'm working as an expert in …").

4. Reference Work
- Mention relevant past work briefly.
- Include <RELEVANT_WORK_LINK> only if it naturally fits.

5. Heading Section (mandatory)
"Here is how I can support you:"
- Use skimmable bullets.
- Mention tools/tech ONLY if relevant and not repetitive.

6. Questions (optional)
- Ask only if something is missing.
- If critical, place immediately after pain point.
- Keep questions short and purposeful.

7. CTA (conditional)
- If <BUDGET_RANGE> is "<500":
  Include:
  "Once you share the project details, I'll share relevant samples within a few hours, at no charge."
- If <BUDGET_RANGE> is "500+":
  Include:
  "You can start with confidence — if the work doesn't meet expectations, I'll refund the amount."

8. Signature (mandatory)
End exactly like:
"Your <JOB_TITLE_based_role>,
M. Yousuf"

OUTPUT FORMAT:
- Single proposal (no title, no bullets outside the support section).
- Natural paragraph flow.
- Must feel written specifically for THIS job, not templated.
- No emojis, no symbols, no markdown.

Before finalizing, silently score the proposal from 1–5 on each point below.
If any score is below 4, revise until all are ≥4 and then give me final output.

Rubric dimensions:
Hook strength → First 224 chars clearly reflect client pain or goal
Specificity → Sounds tailored to this job, not generic
Clarity → Simple English, no jargon, easy to skim
Alignment → Solution matches client experience level and job category
Value focus → Emphasizes outcomes over self-praise
Flow → Natural progression (pain → solution → support → CTA)
Compliance → Follows all formatting, tone and sequence rules`;

async function generateProposalWithGemini(
  jobDescription: string,
  additionalDetails: string,
  preferredModel?: string,
  previousProposal?: string,
  improvisationNotes?: string,
  proposalVersion: 'v1' | 'v2' = 'v1',
  v2Fields?: any
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

      // Construct the prompt based on version and mode
      let prompt: string;

      if (proposalVersion === 'v2') {
        // V2 Prompt Construction
        const v2Context = `
<JOB_DESCRIPTION>
${jobDescription}
</JOB_DESCRIPTION>

${v2Fields?.clientName ? `<CLIENT_NAME>${v2Fields.clientName}</CLIENT_NAME>` : ''}
${v2Fields?.jobTitle ? `<JOB_TITLE>${v2Fields.jobTitle}</JOB_TITLE>` : ''}
${v2Fields?.budgetRange && v2Fields.budgetRange !== 'unknown' ? `<BUDGET_RANGE>${v2Fields.budgetRange}</BUDGET_RANGE>` : ''}
${v2Fields?.clientExperience && v2Fields.clientExperience !== 'unknown' ? `<CLIENT_EXPERIENCE_LEVEL>${v2Fields.clientExperience}</CLIENT_EXPERIENCE_LEVEL>` : ''}
${v2Fields?.immediateAvailability ? `<IMMEDIATE_AVAILABILITY_REQUIRED>true</IMMEDIATE_AVAILABILITY_REQUIRED>` : ''}
${v2Fields?.experienceRequired ? `<EXPERIENCE_LEVEL_REQUIRED>${v2Fields.experienceRequired}</EXPERIENCE_LEVEL_REQUIRED>` : ''}
${v2Fields?.startWord ? `<START_WORD_FROM_JOB>${v2Fields.startWord}</START_WORD_FROM_JOB>` : ''}
${v2Fields?.relevantProject ? `<RELEVANT_PROJECT_DESCRIPTION>${v2Fields.relevantProject}</RELEVANT_PROJECT_DESCRIPTION>` : ''}
${v2Fields?.relevantWorkLink ? `<RELEVANT_WORK_LINK>${v2Fields.relevantWorkLink}</RELEVANT_WORK_LINK>` : ''}
${additionalDetails ? `<ADDITIONAL_CONTEXT>${additionalDetails}</ADDITIONAL_CONTEXT>` : ''}
`;

        if (previousProposal && improvisationNotes) {
          // V2 Revision mode
          prompt = `${V2_PROMPT_TEMPLATE}

---
INPUT VARIABLES:
${v2Context}

<PREVIOUS_PROPOSAL>
${previousProposal}
</PREVIOUS_PROPOSAL>

<USER_IMPROVEMENT_NOTES>
${improvisationNotes}
</USER_IMPROVEMENT_NOTES>

Based on the user's feedback, generate an IMPROVED version of the proposal that addresses their concerns while maintaining all V2 guidelines and structure.`;
        } else {
          // V2 Initial generation
          prompt = `${V2_PROMPT_TEMPLATE}

---
INPUT VARIABLES:
${v2Context}

Generate a compelling Upwork proposal now following all the rules and structure outlined above.`;
        }
      } else {
        // V1 Prompt (existing logic)
        if (previousProposal && improvisationNotes) {
          // V1 Revision mode
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
          // V1 Initial generation mode
          prompt = `${BASE_PROMPT_TEMPLATE}
---

Job Description:
${jobDescription}

${additionalDetails ? `Additional Context:\n${additionalDetails}\n` : ''}

Generate a compelling Upwork proposal now.`;
        }
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
      isRevision = false,
      proposalVersion = 'v1',
      v2Fields
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
      improvisationNotes,
      proposalVersion,
      v2Fields
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
