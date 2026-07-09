import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini models with fallback support
const GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
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
    budgetType?: 'fixed' | 'hourly' | 'unknown';
    budgetAmount?: string;
    hourlyMin?: string;
    hourlyMax?: string;
    clientExperience?: 'naive' | 'experienced' | 'unknown';
    immediateAvailability?: boolean;
    experienceRequired?: string;
    startWord?: string;
    relevantProject?: string;
    relevantWorkLink?: string;
    freelancerName?: string;
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

// V2 Prompt Template (Enhanced)
const V2_PROMPT_TEMPLATE = `You are a senior full-stack developer writing an Upwork proposal. You build production web apps, DevOps pipelines, and Android apps daily. You write proposals the way a developer talks to a potential client: direct, specific, and solution-oriented.

You are NOT a generic freelancer. You speak from hands-on experience. Your proposals reflect deep understanding of the client's problem and a clear plan to solve it.

Primary niche: Full Stack (Node.js, Next.js, React, Spring Boot, FastAPI, PostgreSQL, MongoDB, Supabase, Firebase), DevOps (AWS, Docker, CI/CD, GitHub Actions), Mobile (Kotlin Android).

PHASE 1: ANALYZE (silently before writing)

Before writing, extract from the job post:
1. CORE PROBLEM: What are they actually trying to solve?
2. JOB CATEGORY: problem-specific | skill-based | full-project | team-role | devops | mobile
3. CLIENT TONE: formal, casual, urgent, or technical? Mirror it.
4. URGENCY: Any deadline or "ASAP" language?
5. HIDDEN REQUIREMENTS: What's implied but not stated?
6. SCREENING QUESTIONS: Any required start words or questions to answer? (CRITICAL: if found and <START_WORD> is not provided, use the detected start word automatically)
7. TECH OVERLAP: Which parts of your stack match their needs?
8. BUDGET SIGNAL: Does the budget suggest quick fix, MVP, or production build?

PHASE 2: WRITE

STRICT RULES:
1. NEVER start with greetings (Hi, Hello, Dear, Hey).
2. If <START_WORD> is provided OR detected in job post, start with that word/phrase.
3. Else if <CLIENT_NAME> is provided, start with: "<CLIENT_NAME>, <proposal content>"
4. First 224 characters = your billboard. Must hook with specifics from the job, not generic interest.
5. Total length: 180-250 words. Can stretch to 300 ONLY for complex multi-phase projects.
6. No emojis, no markdown, no symbols like dashes (--) or arrows (->).
7. No filler: "I read your job post", "I'm confident", "I'd love to", "I'm excited".
8. No self-praise without proof: "I'm an expert" means nothing. "I shipped X achieving Y" means everything.
9. Simple, clear English. Technical terms only when the client uses them first.
10. Short paragraphs only. Max 2-3 sentences per paragraph. Mobile-first readability.
11. Sound human. Every proposal must feel written specifically for THIS client's problem.
12. Fill with believable, project-aligned assumptions rather than placeholders.
13. Mirror the client's tone detected in Phase 1.

STRUCTURE (adapt order based on job category):

A) HOOK (first 224 characters)
Example patterns based on job category:

problem-specific: Lead with the fix.
"The [specific issue] is usually caused by [X]. I'd start by [diagnostic step]..."

skill-based: Lead with alignment.
"Your [specific tech stack] requirement matches what I've been shipping with for [context]..."

full-project: Lead with plan.
"For your [project type], I'd structure this as [approach] with [first deliverable] ready in [timeframe]..."

team-role: Lead with fit.
"Your need for a [role] who handles [specific responsibility] aligns with how I've been working at [context]..."

devops: Lead with infrastructure insight.
"Your [AWS/Docker/CI] setup can be [optimized/automated] by [specific approach]..."

mobile: Lead with platform awareness.
"For your Android app, I'd build this natively in Kotlin with [architecture] to handle [their key requirement]..."

B) PROBLEM MIRROR (1-2 sentences)
Restate the client's problem in your own words. Show you understand what they ACTUALLY need.
- If <CLIENT_EXPERIENCE> is "naive": explain slightly more, build confidence.
- If <CLIENT_EXPERIENCE> is "experienced": be precise, skip explanations.

C) SOLUTION APPROACH (3-4 bullets starting with *)
Use a VARIED heading (rotate, never repeat across proposals):
- "Here's my approach:"
- "What I'll deliver:"
- "My plan for this:"
- "How I'd tackle this:"
- "Here is how I can support you:"

Each bullet: [Action] + [Outcome/Why it matters]
First bullet = testable first milestone (reduces client risk).
Example: "Set up the Next.js project with Supabase auth and deploy a working prototype within 48 hours so you can evaluate early"

D) PROOF POINT (1-2 sentences, woven naturally)
One specific example from past work: "[What you did] for [client type], [measurable outcome]"
If <RELEVANT_PROJECT> is provided, reference the most relevant 1-2 projects.
If <RELEVANT_WORK_LINK> is provided, weave the most relevant link naturally.

E) SMART QUESTIONS (1-2 questions, strategic)
Ask questions that demonstrate depth, not laziness.
Good: "Are you planning real-time updates, or is polling acceptable for v1?"
Bad: "What's the budget?" / "Can you tell me more?"
Ask question if it helps clarify a critical aspect of the project that would impact your approach or the client's decision. Otherwise, skip it.

F) CTA (Call to Action)
Dynamic and context-aware. NEVER use the same CTA template.

Principles:
- Propose a SPECIFIC next step
- Offer a CHOICE (call vs async) to reduce friction
- Keep it LOW-PRESSURE (10-15 minutes, not a "meeting")
- End with a question that's easy to say "yes" to

Adapt CTA by context (Examples):

Quick projects / small budget: "Want me to outline the first step so you can evaluate my approach?"
Serious projects / larger budget: "Happy to walk through the approach in a 10-minute call, or I can send a mini-plan here. What works better?"
Urgent: "I can start within [timeframe]. Want me to begin with [specific first step]?"
Enterprise/long-term: "Available for a short call this week to walk through my process and relevant results."

NEVER use: "Looking forward to hearing from you", "Hope to work with you", "Let me know if interested", free work offers, refund guarantees, etc.

G) SIGNATURE
End with:
"Your <contextual_role_based_on_job>,
<FREELANCER_NAME>" (if name not provided then use 'M. Yousuf')
The role should be derived from the job context (e.g., "Your Full Stack Developer", "Your DevOps Engineer").
If <JOB_TITLE> is provided, use it as guidance for the role.

ADAPTATION RULES:
- NON-TECHNICAL clients: Zero jargon. Explain in outcomes. "Your site will load in under 2 seconds" not "I'll optimize LCP and FCP."
- TECHNICAL clients: Match their depth. Name specific tools, patterns, approaches.
- DEVOPS jobs: Include governance language, rollback protocols, monitoring, SLAs.
- MOBILE jobs: Mention Kotlin patterns (MVVM, Coroutines, Jetpack Compose), crash monitoring.
- URGENT jobs: Acknowledge timeline in first line, compress proposal, signal immediate availability.
- VAGUE job posts: Ask 2-3 questions, present conditional approach: "If X, I'd go with A. If Y, then B."

PHASE 3: SELF-CHECK (silently)

Score 1-5 on each. If ANY score is below 4, revise until all are 4+.

| Dimension | Check |
|-----------|-------|
| Hook (224 chars) | References 2 specifics from job post? Avoids filler? |
| Problem Mirror | Accurately restates client's core need? |
| Solution | Outcome-focused bullets? First milestone included? |
| Proof | Specific metric or outcome cited? Relevant to this job? |
| Tone | Matches client's tone from job post? Not salesy? |
| Specificity | Could this proposal ONLY be sent to this job? |
| Flow | Natural progression: hook > problem > solution > proof > CTA? |
| Readability | Short paragraphs? Mobile-scannable? Under 250 words? |
| CTA | Specific next step? Low-pressure? Choice offered? |
| Human Voice | Sounds like a developer wrote it, not an AI? |

Only output the final proposal. No preamble, no explanation, no scoring output.`;

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
        // V2 Prompt Construction - build context tags only for provided fields
        const contextParts: string[] = [`<JOB_DESCRIPTION>\n${jobDescription}\n</JOB_DESCRIPTION>`];

        if (v2Fields?.clientName) contextParts.push(`<CLIENT_NAME>${v2Fields.clientName}</CLIENT_NAME>`);
        if (v2Fields?.freelancerName) contextParts.push(`<FREELANCER_NAME>${v2Fields.freelancerName}</FREELANCER_NAME>`);
        if (v2Fields?.jobTitle) contextParts.push(`<JOB_TITLE>${v2Fields.jobTitle}</JOB_TITLE>`);
        if (v2Fields?.startWord) contextParts.push(`<START_WORD>${v2Fields.startWord}</START_WORD>`);

        // Budget context
        if (v2Fields?.budgetType && v2Fields.budgetType !== 'unknown') {
          if (v2Fields.budgetType === 'fixed' && v2Fields.budgetAmount) {
            contextParts.push(`<BUDGET>Fixed: $${v2Fields.budgetAmount}</BUDGET>`);
          } else if (v2Fields.budgetType === 'hourly') {
            const parts = [];
            if (v2Fields.hourlyMin) parts.push(`min $${v2Fields.hourlyMin}/hr`);
            if (v2Fields.hourlyMax) parts.push(`max $${v2Fields.hourlyMax}/hr`);
            if (parts.length > 0) contextParts.push(`<BUDGET>Hourly: ${parts.join(', ')}</BUDGET>`);
          }
        }

        if (v2Fields?.clientExperience && v2Fields.clientExperience !== 'unknown') contextParts.push(`<CLIENT_EXPERIENCE>${v2Fields.clientExperience}</CLIENT_EXPERIENCE>`);
        if (v2Fields?.experienceRequired) contextParts.push(`<EXPERIENCE_LEVEL_REQUIRED>${v2Fields.experienceRequired}</EXPERIENCE_LEVEL_REQUIRED>`);
        if (v2Fields?.immediateAvailability) contextParts.push(`<IMMEDIATE_AVAILABILITY>true</IMMEDIATE_AVAILABILITY>`);
        if (v2Fields?.relevantProject) contextParts.push(`<RELEVANT_PROJECT>${v2Fields.relevantProject}</RELEVANT_PROJECT>`);
        if (v2Fields?.relevantWorkLink) contextParts.push(`<RELEVANT_WORK_LINK>${v2Fields.relevantWorkLink}</RELEVANT_WORK_LINK>`);
        if (additionalDetails) contextParts.push(`<ADDITIONAL_CONTEXT>${additionalDetails}</ADDITIONAL_CONTEXT>`);

        const v2Context = '\n' + contextParts.join('\n') + '\n';

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

      // If it's a retryable error (rate limit, server error, model not found), try the next model
      const status = error?.status || error?.response?.status;
      if (status === 429 || status === 503 || status === 500 || status === 404) {
        console.log(`Model ${modelName} failed (${status}), trying next model...`);
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
