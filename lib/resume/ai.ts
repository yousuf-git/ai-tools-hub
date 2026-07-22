// Client-side helpers that call /api/resume, plus a per-model sliding-window rate limiter.
import { GEMINI_MODELS } from "@/lib/gemini";
import { parseJsonResponse } from "@/lib/fetch-json";
import type {
  Profile,
  ResumeProject,
  Experience,
  ResumeTask,
  SummarySkillsResult,
  ProjectsResult,
  ExperienceResult,
  CertificationsResult,
} from "./types";

interface ApiResponse<T> {
  data: T;
  modelUsed: string;
  wasFallback: boolean;
}

async function callResumeApi<T>(task: ResumeTask, payload: unknown, model: string): Promise<ApiResponse<T>> {
  const res = await fetch("/api/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload, model }),
  });
  return parseJsonResponse<ApiResponse<T>>(res);
}

export function generateSummarySkills(profile: Profile, jobDescription: string, model: string) {
  return callResumeApi<SummarySkillsResult>(
    "summary-skills",
    {
      jobDescription,
      role: profile.basics.role,
      summary: profile.summary,
      skills: profile.skills,
    },
    model
  );
}

export function generateProjects(projects: ResumeProject[], jobDescription: string, model: string) {
  return callResumeApi<ProjectsResult>(
    "projects",
    {
      jobDescription,
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        stack: p.stack,
        bullets: p.bullets,
        caseStudy: p.caseStudy,
      })),
    },
    model
  );
}

export function generateExperience(experience: Experience[], jobDescription: string, model: string) {
  return callResumeApi<ExperienceResult>(
    "experience",
    {
      jobDescription,
      experience: experience.map((e) => ({
        id: e.id,
        title: e.title,
        company: e.company,
        bullets: e.bullets,
      })),
    },
    model
  );
}

export function generateCertifications(profile: Profile, jobDescription: string, model: string) {
  return callResumeApi<CertificationsResult>(
    "certifications",
    {
      jobDescription,
      certifications: profile.certifications.map((c) => ({ id: c.id, name: c.name, issuer: c.issuer, year: c.year })),
    },
    model
  );
}

// ---- Client-side rate limiter (sliding 60s window per model) ----
const callTimestamps = new Map<string, number[]>();

function rpmFor(model: string): number {
  return GEMINI_MODELS.find((m) => m.name === model)?.rateLimit ?? 15;
}

// Returns seconds until the next call is allowed (0 = allowed now).
export function secondsUntilAllowed(model: string, now: number): number {
  const limit = rpmFor(model);
  const windowStart = now - 60_000;
  const stamps = (callTimestamps.get(model) || []).filter((t) => t > windowStart);
  callTimestamps.set(model, stamps);
  if (stamps.length < limit) return 0;
  const oldest = stamps[0];
  return Math.ceil((oldest + 60_000 - now) / 1000);
}

export function recordCall(model: string, now: number): void {
  const stamps = callTimestamps.get(model) || [];
  stamps.push(now);
  callTimestamps.set(model, stamps);
}
