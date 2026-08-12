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
  /** Skill names rendered bold on the resume. Omitted/empty = all regular weight. */
  bold?: string[];
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
  /** Lower = earlier in lists. Older stored projects may omit it. */
  order?: number;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  // Optional verification URL — older stored profiles won't have it.
  link?: string;
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

// The user's edits on top of an AI response. Seeded from `raw` when a response
// arrives, then owned by the user — steps unmount when you move between them, so
// this has to live outside the step components to survive.
export interface SummarySkillsTweaks {
  summary: string;
  categories: SkillCategory[]; // working arrangement of the profile's skills
  checked: string[]; // skill items marked bold on the resume (filled badges)
  addChecked: string[]; // suggested-addition keys included on the resume
  savedAdditions: string[]; // suggested-addition keys already written to the profile
}

export interface ProjectTweak {
  id: string;
  include: boolean;
  title: string;
  stack: string; // comma-separated while being edited
  bullets: string; // newline-separated while being edited
  reason: string;
}

export interface ExperienceTweaks {
  bullets: Record<string, string>; // job id -> newline-separated bullets
  include: Record<string, boolean>;
}

export interface WizardTweaks {
  summarySkills?: SummarySkillsTweaks | null;
  projects?: ProjectTweak[] | null;
  experience?: ExperienceTweaks | null;
  certifications?: string[] | null; // certification ids to keep
  certOrder?: string[] | null; // display/apply order of all certification ids
  // Which items get sent to the AI. Null = not chosen yet, defaults to all.
  sendProjects?: string[] | null;
  sendExperience?: string[] | null;
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
  tweaks: WizardTweaks;
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
    // Optional: the model may omit it (or fields within it) for excluded projects.
    refactored?: { title?: string; stack?: string[]; bullets?: string[] };
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
