import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ResumeTask } from "@/lib/resume/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Fallback chain — preferred model first, then higher-rate-limit fallbacks.
const FALLBACK_CHAIN = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
];

const SYSTEM_RULES = `You are an expert technical resume writer.
Hard rules you must never break:
- Respond with ONLY valid JSON matching the requested schema. No markdown, no commentary, no code fences.
- NEVER invent facts. Every bullet must be derived strictly from the provided source material (caseStudy / original bullets). Do not fabricate metrics, employers, dates, or credentials.
- Only use numbers/metrics that already appear in the source text.
- Resume bullet style: "action verb + what + measurable outcome". Concise, one sentence each.`;

function buildPrompt(task: ResumeTask, payload: any): string {
  switch (task) {
    case "summary-skills":
      return `${SYSTEM_RULES}

TASK: Tailor a developer's summary and skills to a job description.

JOB DESCRIPTION:
${payload.jobDescription}

CANDIDATE ROLE: ${payload.role}

CURRENT SUMMARY:
${payload.summary}

SAVED SKILLS (grouped by category):
${JSON.stringify(payload.skills)}

Return JSON of this exact shape:
{
  "summary": "<rewritten summary tailored to the JD, 2-4 sentences, only facts implied by the current summary>",
  "selectedSkills": [ { "category": "<existing category>", "item": "<existing skill>" } ],
  "suggestedAdditions": [ { "category": "<category>", "item": "<skill NOT already in saved skills>", "reason": "<one line why it's relevant to the JD>" } ]
}
Rules:
- selectedSkills: choose the saved skills most relevant to the JD (use the EXACT item strings provided).
- suggestedAdditions: skills the JD asks for that are NOT in the saved list. Do not duplicate saved skills. Keep it short (max 6).`;

    case "projects":
      return `${SYSTEM_RULES}

TASK: For each saved project, decide JD relevance and refactor it toward the JD.

JOB DESCRIPTION:
${payload.jobDescription}

SAVED PROJECTS (id, title, stack, current bullets, caseStudy):
${JSON.stringify(payload.projects)}

Return JSON of this exact shape:
{
  "projects": [
    {
      "id": "<the project id, unchanged>",
      "include": <true if relevant enough to include on this resume, else false>,
      "reason": "<one line relevance rationale>",
      "refactored": {
        "title": "<keep the original title>",
        "stack": [ "<stack reordered/trimmed to JD-relevant tools, drawn only from the project's stack>" ],
        "bullets": [ "<2-3 rewritten bullets derived from the caseStudy, JD-aligned, no fabricated metrics>" ]
      }
    }
  ]
}
Include every project id exactly once.`;

    case "experience":
      return `${SYSTEM_RULES}

TASK: Refactor each job's bullets toward the job description.

JOB DESCRIPTION:
${payload.jobDescription}

EXPERIENCE (id, title, company, original bullets):
${JSON.stringify(payload.experience)}

Return JSON of this exact shape:
{
  "experience": [
    { "id": "<job id, unchanged>", "bullets": [ "<rewritten bullets, JD-aligned, derived only from the originals, no new metrics>" ] }
  ]
}
Keep roughly the same number of bullets per job. Include every job id.`;

    case "certifications":
      return `${SYSTEM_RULES}

TASK: Rank the most JD-relevant certifications and (separately) suggest ones worth pursuing.

JOB DESCRIPTION:
${payload.jobDescription}

CERTIFICATIONS (id, name, issuer, year):
${JSON.stringify(payload.certifications)}

Return JSON of this exact shape:
{
  "selected": [ { "id": "<cert id of a relevant existing cert>", "reason": "<one line>" } ],
  "worthGetting": [ { "name": "<a cert worth pursuing for this JD>", "reason": "<one line>" } ]
}
Rules:
- selected: only ids from the provided list, ordered most→least relevant.
- worthGetting: certifications the candidate does NOT yet hold. These are advisory only — never claim they are earned.`;

    default:
      throw new Error(`Unknown task: ${task}`);
  }
}

function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```json")) t = t.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  else if (t.startsWith("```")) t = t.replace(/```\n?/g, "");
  return t.trim();
}

function isRetryable(error: any): boolean {
  const msg = error?.message || "";
  const status = error?.status || 0;
  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    /RESOURCE_EXHAUSTED|quota|INTERNAL|UNAVAILABLE|overloaded|429|500|503/i.test(msg)
  );
}

// Reports whether the server has a Gemini key configured — never exposes the key.
export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured. Add GEMINI_API_KEY to .env." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const task = body.task as ResumeTask;
    const payload = body.payload;
    const preferred = body.model as string | undefined;

    if (!task || !payload) {
      return NextResponse.json({ error: "Missing task or payload." }, { status: 400 });
    }

    const prompt = buildPrompt(task, payload);

    // Build model order: preferred first, then the rest of the fallback chain.
    const order = preferred
      ? [preferred, ...FALLBACK_CHAIN.filter((m) => m !== preferred)]
      : [...FALLBACK_CHAIN];

    let lastError: any = null;
    let firstAttempted = "";

    for (let i = 0; i < order.length; i++) {
      const modelName = order[i];
      if (i === 0) firstAttempted = modelName;
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const data = JSON.parse(stripFences(text));
        return NextResponse.json({
          data,
          modelUsed: modelName,
          wasFallback: modelName !== firstAttempted,
        });
      } catch (error) {
        lastError = error;
        console.error(`resume task "${task}" failed on ${modelName}:`, error instanceof Error ? error.message : error);
        if (isRetryable(error) && i < order.length - 1) continue;
        break;
      }
    }

    const msg = lastError instanceof Error ? lastError.message : "Unknown error";
    return NextResponse.json(
      { error: `AI request failed: ${msg}` },
      { status: 502 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
