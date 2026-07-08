// Resume Builder — data model
// `profile` = pre-saved generic data. `draft` = resume currently being generated.
// Projects are stored in their own IndexedDB object store (the "saved projects manager"),
// fully isolated from the Upwork Proposal Writer's projects.

export interface Basics {
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  portfolio: string;
  github: string;
  linkedin: string;
}

export interface SkillCategory {
  category: string; // e.g. Languages, Frontend, Backend
  items: string[];
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

// Full saved project — `caseStudy` is long-form raw material the AI draws from.
export interface ResumeProject {
  id: string;
  title: string;
  liveUrl: string;
  codeUrl: string;
  stack: string[];
  bullets: string[];
  caseStudy: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  detail: string;
  start: string;
  end: string;
}

// The user's pre-saved generic data. Projects live in a separate store.
export interface Profile {
  basics: Basics;
  summary: string;
  skills: SkillCategory[];
  experience: Experience[];
  certifications: Certification[];
  education: Education[];
}

// A project as it appears in the resume draft (no caseStudy; references source project via id).
export interface DraftProject {
  id: string;
  title: string;
  liveUrl: string;
  codeUrl: string;
  stack: string[];
  bullets: string[];
}

// The resume currently being built. The preview ALWAYS renders this, never `profile`.
export interface ResumeDraft {
  basics: Basics;
  summary: string;
  skills: SkillCategory[];
  experience: Experience[];
  projects: DraftProject[];
  certifications: Certification[];
  education: Education[];
}

// AI suggestion that hasn't been committed to the resume yet.
export interface SuggestedSkill {
  category: string;
  item: string;
  reason: string;
}

export interface WizardState {
  jobDescription: string;
  step: number;
  // Raw AI responses cached so a refresh loses nothing.
  raw: {
    summarySkills?: SummarySkillsResult | null;
    projects?: ProjectsResult | null;
    experience?: ExperienceResult | null;
    certifications?: CertificationsResult | null;
  };
}

// ---- AI response shapes (returned by /api/resume) ----

export interface SummarySkillsResult {
  summary: string; // rewritten, JD-tailored
  selectedSkills: { category: string; item: string }[]; // picks from profile
  suggestedAdditions: SuggestedSkill[]; // NOT in profile
}

export interface ProjectsResult {
  projects: {
    id: string;
    include: boolean;
    reason: string;
    refactored: { title: string; stack: string[]; bullets: string[] };
  }[];
}

export interface ExperienceResult {
  experience: { id: string; bullets: string[] }[];
}

export interface CertificationsResult {
  selected: { id: string; reason: string }[];
  worthGetting: { name: string; reason: string }[]; // never inserted into the draft
}

export type ResumeTask =
  | "summary-skills"
  | "projects"
  | "experience"
  | "certifications";
