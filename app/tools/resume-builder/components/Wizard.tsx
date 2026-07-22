"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Check,
  Save,
  RotateCcw,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  Profile,
  ResumeProject,
  Experience,
  ResumeDraft,
  WizardState,
  SkillCategory,
  SummarySkillsResult,
  SummarySkillsTweaks,
  ProjectsResult,
  ProjectTweak,
  ExperienceResult,
  ExperienceTweaks,
} from "@/lib/resume/types";
import {
  generateSummarySkills,
  generateProjects,
  generateExperience,
  generateCertifications,
  secondsUntilAllowed,
  recordCall,
} from "@/lib/resume/ai";
import type { Patch } from "./ResumePreview";
import SkillsBadgeBoard from "./SkillsBadgeBoard";

const STEPS = ["Job Description", "Summary & Skills", "Projects", "Experience", "Certifications", "Review"];

// ---- Tweak seeding ----
// Called when a fresh AI response lands (replacing the previous tweaks), and as a
// fallback when a step renders against a response that predates its tweaks.

function seedSummarySkills(
  res: SummarySkillsResult,
  profile: Profile,
  prev?: SummarySkillsTweaks | null
): SummarySkillsTweaks {
  return {
    summary: res.summary || "",
    // A re-run re-picks skills but keeps the arrangement the user built.
    categories: (prev?.categories.length ? prev.categories : profile.skills).map((c) => ({
      category: c.category,
      items: [...c.items],
    })),
    checked: res.selectedSkills.map((s) => s.item),
    addChecked: [],
    savedAdditions: [...(prev?.savedAdditions ?? [])],
  };
}

function seedProjects(res: ProjectsResult, projects: ResumeProject[]): ProjectTweak[] {
  // The model sometimes omits `refactored` (or fields within it) for projects it
  // marks as not-included — fall back to the original so nothing dereferences undefined.
  return res.projects.map((p) => {
    const orig = projects.find((x) => x.id === p.id);
    const r = p.refactored ?? {};
    return {
      id: p.id,
      include: p.include,
      title: r.title ?? orig?.title ?? "",
      stack: (r.stack ?? orig?.stack ?? []).join(", "),
      bullets: (r.bullets ?? orig?.bullets ?? []).join("\n"),
      reason: p.reason,
    };
  });
}

function seedExperience(res: ExperienceResult): ExperienceTweaks {
  const bullets: Record<string, string> = {};
  const include: Record<string, boolean> = {};
  res.experience.forEach((e) => {
    bullets[e.id] = e.bullets.join("\n");
    include[e.id] = true;
  });
  return { bullets, include };
}

interface Props {
  profile: Profile;
  projects: ResumeProject[];
  draft: ResumeDraft;
  patch: Patch;
  model: string;
  wizard: WizardState;
  updateWizard: (recipe: (w: WizardState) => void) => void;
  onSaveProfile: (p: Profile) => void;
}

export default function Wizard({ profile, projects, draft, patch, model, wizard, updateWizard, onSaveProfile }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = wizard.step;
  const setStep = (s: number) => updateWizard((w) => void (w.step = Math.max(0, Math.min(STEPS.length - 1, s))));

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startCooldown = (secs: number) => {
    setCooldown(secs);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // `seed` rebuilds this step's tweaks from the new response, so a re-run always
  // starts from the AI's fresh output rather than the last run's edits.
  async function runCall<T>(
    key: keyof WizardState["raw"],
    fn: () => Promise<{ data: T }>,
    seed: (data: T, w: WizardState) => void
  ) {
    if (!wizard.jobDescription.trim()) {
      setError("Add a job description first (Step 1).");
      return;
    }
    const now = Date.now();
    const wait = secondsUntilAllowed(model, now);
    if (wait > 0) {
      setError(`Rate limit reached for this model. Available in ${wait}s.`);
      startCooldown(wait);
      return;
    }
    setLoading(key);
    setError("");
    try {
      recordCall(model, now);
      const res = await fn();
      updateWizard((w) => {
        w.raw[key] = res.data as never;
        seed(res.data, w);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setLoading(null);
    }
  }

  const busy = (key: string) => loading === key;
  const aiDisabled = cooldown > 0 || loading !== null;

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-1 flex-wrap text-xs">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`px-2 py-1 rounded-md transition-colors ${
              i === step ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70 text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="min-h-[200px]">
        {step === 0 && <StepJobDescription wizard={wizard} updateWizard={updateWizard} />}
        {step === 1 && (
          <StepSummarySkills
            profile={profile}
            draft={draft}
            patch={patch}
            wizard={wizard}
            updateWizard={updateWizard}
            busy={busy("summarySkills")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={() =>
              runCall(
                "summarySkills",
                () => generateSummarySkills(profile, wizard.jobDescription, model),
                (d, w) => void (w.tweaks.summarySkills = seedSummarySkills(d, profile, w.tweaks.summarySkills))
              )
            }
            onSaveProfile={onSaveProfile}
          />
        )}
        {step === 2 && (
          <StepProjects
            projects={projects}
            patch={patch}
            wizard={wizard}
            updateWizard={updateWizard}
            busy={busy("projects")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={(selected) =>
              runCall(
                "projects",
                () => generateProjects(selected, wizard.jobDescription, model),
                (d, w) => void (w.tweaks.projects = seedProjects(d, projects))
              )
            }
            onReset={() => {
              // Revert the preview's projects to the original saved list and drop
              // the suggestions so the step returns to the selection view.
              patch((d) => {
                d.projects = projects.map((p) => ({
                  id: p.id,
                  title: p.title,
                  liveUrl: p.liveUrl,
                  codeUrl: p.codeUrl,
                  stack: [...p.stack],
                  bullets: [...p.bullets],
                }));
              });
              updateWizard((w) => {
                w.raw.projects = null;
                w.tweaks.projects = null;
              });
            }}
          />
        )}
        {step === 3 && (
          <StepExperience
            profile={profile}
            patch={patch}
            wizard={wizard}
            updateWizard={updateWizard}
            busy={busy("experience")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={(selected) =>
              runCall(
                "experience",
                () => generateExperience(selected, wizard.jobDescription, model),
                (d, w) => void (w.tweaks.experience = seedExperience(d))
              )
            }
            onReset={() => {
              // Revert the preview's experience bullets to the profile originals
              // and drop the suggestions so the step returns to the selection view.
              patch((d) => {
                d.experience = profile.experience.map((e) => ({ ...e, bullets: [...e.bullets] }));
              });
              updateWizard((w) => {
                w.raw.experience = null;
                w.tweaks.experience = null;
              });
            }}
          />
        )}
        {step === 4 && (
          <StepCertifications
            profile={profile}
            patch={patch}
            wizard={wizard}
            updateWizard={updateWizard}
            busy={busy("certifications")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={() =>
              runCall(
                "certifications",
                () => generateCertifications(profile, wizard.jobDescription, model),
                (d, w) => void (w.tweaks.certifications = d.selected.map((s) => s.id))
              )
            }
          />
        )}
        {step === 5 && <StepReview />}
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-2 border-t">
        <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button variant="outline" size="sm" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ---- shared AI button ----
function AiButton({ busy, disabled, cooldown, onClick, label }: { busy: boolean; disabled: boolean; cooldown: number; onClick: () => void; label: string }) {
  return (
    <Button size="sm" onClick={onClick} disabled={disabled || busy}>
      {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
      {cooldown > 0 ? `Available in ${cooldown}s` : busy ? "Thinking…" : label}
    </Button>
  );
}

// Collapsed selection row: checkbox + title, original bullets hidden in a
// closed disclosure. Used to pick which items go to the AI before a call.
function SelectRow({
  checked,
  onToggle,
  title,
  subtitle,
  bullets,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  subtitle?: string;
  bullets: string[];
}) {
  return (
    <div className={`rounded-md border transition-opacity ${checked ? "" : "opacity-55"}`}>
      <div className="flex items-center gap-2 p-2">
        <input type="checkbox" className="shrink-0" checked={checked} onChange={onToggle} aria-label={`Send ${title} to AI`} />
        <details className="group flex-1 min-w-0">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm">
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
            <span className="truncate font-medium">{title}</span>
            {subtitle && <span className="truncate text-xs font-normal text-muted-foreground">· {subtitle}</span>}
          </summary>
          {bullets.length > 0 ? (
            <ul className="ml-5 mt-1 list-disc space-y-0.5 text-xs text-muted-foreground">
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="ml-5 mt-1 text-xs italic text-muted-foreground">No bullets yet.</p>
          )}
        </details>
      </div>
    </div>
  );
}

// ===== Step 0 =====
function StepJobDescription({ wizard, updateWizard }: { wizard: WizardState; updateWizard: Props["updateWizard"] }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Paste the job description</Label>
      <Textarea
        rows={12}
        placeholder="Paste the full job description here. Every AI step tailors your resume to this."
        value={wizard.jobDescription}
        onChange={(e) => updateWizard((w) => void (w.jobDescription = e.target.value))}
      />
      <p className="text-xs text-muted-foreground">
        Nothing here is sent anywhere until you ask for suggestions on a later step. The whole tool works without AI too —
        just edit the preview directly.
      </p>
    </div>
  );
}

// ===== Step 1: Summary & Skills =====
const skillKey = (c: string, i: string) => `${c}|||${i}`;

function StepSummarySkills({
  profile,
  draft,
  patch,
  wizard,
  updateWizard,
  busy,
  aiDisabled,
  cooldown,
  onRun,
  onSaveProfile,
}: {
  profile: Profile;
  draft: ResumeDraft;
  patch: Patch;
  wizard: WizardState;
  updateWizard: Props["updateWizard"];
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: () => void;
  onSaveProfile: (p: Profile) => void;
}) {
  const res = wizard.raw.summarySkills;
  // Tweaks live on the wizard so they survive this step unmounting; the seed
  // fallback covers responses cached before tweaks existed.
  const t = res ? wizard.tweaks.summarySkills ?? seedSummarySkills(res, profile) : null;

  const setT = (recipe: (t: SummarySkillsTweaks) => void) =>
    updateWizard((w) => {
      const r = w.raw.summarySkills;
      if (!r) return;
      const cur = w.tweaks.summarySkills ?? seedSummarySkills(r, profile);
      recipe(cur);
      w.tweaks.summarySkills = cur;
    });

  const toggleList = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  // Persist a suggested addition into the profile now (icon flips to a tick).
  const saveAddition = (a: { category: string; item: string }) => {
    const key = skillKey(a.category, a.item);
    if (t?.savedAdditions.includes(key)) return;
    const p: Profile = structuredClone(profile);
    let row = p.skills.find((s) => s.category === a.category);
    if (!row) {
      row = { category: a.category, items: [] };
      p.skills.push(row);
    }
    if (!row.items.includes(a.item)) row.items.push(a.item);
    onSaveProfile(p);
    setT((x) => void x.savedAdditions.push(key));
  };

  const apply = () => {
    if (!t) return;
    // Build draft.skills from the arranged categories, keeping only selected
    // skills, then fold in any checked suggested additions.
    const newSkills: SkillCategory[] = [];
    t.categories.forEach((row) => {
      const kept = row.items.filter((it) => t.checked.includes(it));
      if (kept.length) newSkills.push({ category: row.category, items: kept });
    });
    (res?.suggestedAdditions || []).forEach((a) => {
      if (!t.addChecked.includes(skillKey(a.category, a.item))) return;
      let row = newSkills.find((s) => s.category === a.category);
      if (!row) {
        row = { category: a.category, items: [] };
        newSkills.push(row);
      }
      if (!row.items.includes(a.item)) row.items.push(a.item);
    });
    patch((d) => {
      d.summary = t.summary;
      d.skills = newSkills;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">One AI call rewrites your summary and picks JD-relevant skills.</p>
        <AiButton busy={busy} disabled={aiDisabled} cooldown={cooldown} onClick={onRun} label="Get suggestions" />
      </div>

      {!res || !t ? (
        <p className="text-sm text-muted-foreground italic">No suggestions yet — or edit the preview / profile by hand.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tailored summary</Label>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setT((x) => void (x.summary = draft.summary))}
              >
                use current
              </button>
            </div>
            <Textarea rows={4} value={t.summary} onChange={(e) => setT((x) => void (x.summary = e.target.value))} />
          </div>

          <div>
            <Label className="text-xs">From your profile (AI pre-checked the relevant ones)</Label>
            <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
              Tap a skill to include or exclude it. Drag to reorder, drop onto another category to move it, or drag the
              grip to reorder categories. Rename a category by typing in its name. This arrangement is what lands on
              your resume.
            </p>
            <SkillsBadgeBoard
              mode="select"
              categories={t.categories}
              onChange={(next) => setT((x) => void (x.categories = next))}
              isSelected={(_c, i) => t.checked.includes(i)}
              onToggle={(_c, i) => setT((x) => void (x.checked = toggleList(x.checked, i)))}
            />
          </div>

          {res.suggestedAdditions.length > 0 && (
            <div>
              <Label className="text-xs">Suggested additions (not in your profile)</Label>
              <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
                Check to include on this resume. Click save to also keep it in your profile for next time.
              </p>
              <div className="space-y-2">
                {res.suggestedAdditions.map((a) => {
                  const key = skillKey(a.category, a.item);
                  const isSaved = t.savedAdditions.includes(key);
                  return (
                    <div key={key} className="rounded-md border p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={t.addChecked.includes(key)}
                          onChange={() => setT((x) => void (x.addChecked = toggleList(x.addChecked, key)))}
                        />
                        <span className="font-medium">{a.item}</span>
                        <span className="text-muted-foreground">· {a.category}</span>
                        <button
                          type="button"
                          onClick={() => saveAddition(a)}
                          disabled={isSaved}
                          title={isSaved ? "Saved to your profile" : "Save to your profile"}
                          className={`ml-auto inline-flex items-center gap-1 ${
                            isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {isSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                          {isSaved ? "Saved" : "Save"}
                        </button>
                      </div>
                      <p className="mt-1 ml-6 text-muted-foreground">{a.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button size="sm" variant="secondary" onClick={apply}>
            <Check className="w-4 h-4 mr-1.5" /> Apply to resume
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== Step 2: Projects =====
function StepProjects({
  projects,
  patch,
  wizard,
  updateWizard,
  busy,
  aiDisabled,
  cooldown,
  onRun,
  onReset,
}: {
  projects: ResumeProject[];
  patch: Patch;
  wizard: WizardState;
  updateWizard: Props["updateWizard"];
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: (selected: ResumeProject[]) => void;
  onReset: () => void;
}) {
  const res = wizard.raw.projects;
  const edits = res ? wizard.tweaks.projects ?? seedProjects(res, projects) : [];
  // Which saved projects get sent to the AI (defaults to all).
  const send = wizard.tweaks.sendProjects ?? projects.map((p) => p.id);

  const setEdits = (recipe: (prev: ProjectTweak[]) => ProjectTweak[]) =>
    updateWizard((w) => {
      const r = w.raw.projects;
      if (!r) return;
      w.tweaks.projects = recipe(w.tweaks.projects ?? seedProjects(r, projects));
    });

  const setEdit = (id: string, recipe: (e: ProjectTweak) => void) =>
    setEdits((prev) => prev.map((e) => (e.id === id ? (() => { const n = { ...e }; recipe(n); return n; })() : e)));

  // Reorder — the edits order is the order projects land in the resume on apply.
  const move = (id: string, dir: -1 | 1) =>
    setEdits((prev) => {
      const i = prev.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const apply = () => {
    const included = edits.filter((e) => e.include);
    patch((d) => {
      d.projects = included.map((e) => ({
        id: e.id,
        title: e.title,
        liveUrl: projects.find((p) => p.id === e.id)?.liveUrl || "",
        codeUrl: projects.find((p) => p.id === e.id)?.codeUrl || "",
        stack: e.stack.split(",").map((x) => x.trim()).filter(Boolean),
        bullets: e.bullets.split("\n").map((x) => x.trim()).filter(Boolean),
      }));
    });
  };

  const setSend = (ids: string[]) => updateWizard((w) => void (w.tweaks.sendProjects = ids));
  const toggleSend = (id: string) =>
    setSend(send.includes(id) ? send.filter((x) => x !== id) : [...send, id]);
  const selected = projects.filter((p) => send.includes(p.id));

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No saved projects yet — add some in My Profile.</p>;
  }

  return (
    <div className="space-y-4">
      {!res ? (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Pick projects to send.</span> Only checked projects (with
            their stack + bullets) are sent. The AI keeps the most relevant and rewrites them toward the job.
          </p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setSend(selected.length === projects.length ? [] : projects.map((p) => p.id))}
              >
                {selected.length === projects.length ? "Clear all" : "Select all"}
              </button>
              <span>
                · {selected.length} of {projects.length} selected
              </span>
            </div>
            <AiButton
              busy={busy}
              disabled={aiDisabled || selected.length === 0}
              cooldown={cooldown}
              onClick={() => onRun(selected)}
              label={`Get suggestions (${selected.length})`}
            />
          </div>
          {selected.length === 0 && (
            <p className="text-xs text-destructive">Select at least one project to get suggestions.</p>
          )}

          <div className="space-y-1.5">
            {projects.map((p) => (
              <SelectRow
                key={p.id}
                checked={send.includes(p.id)}
                onToggle={() => toggleSend(p.id)}
                title={p.title}
                subtitle={p.stack.join(" · ")}
                bullets={p.bullets}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Review &amp; apply.</span> The AI&apos;s picks — uncheck any
              to drop them, edit the text, reorder, then apply. Or reset to choose a different set.
            </p>
            <Button variant="outline" size="sm" className="shrink-0" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
            </Button>
          </div>
          {edits.map((e, idx) => {
            const orig = projects.find((p) => p.id === e.id);
            return (
              <div key={e.id} className={`rounded-lg border p-3 space-y-2 ${e.include ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={e.include} onChange={() => setEdit(e.id, (x) => void (x.include = !x.include))} />
                    Include
                    <span className="text-xs font-normal text-muted-foreground">· {e.reason}</span>
                  </label>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => move(e.id, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                      className="rounded border p-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(e.id, 1)}
                      disabled={idx === edits.length - 1}
                      aria-label="Move down"
                      className="rounded border p-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <input
                  className="w-full text-sm font-medium bg-transparent border rounded px-2 py-1"
                  value={e.title}
                  onChange={(ev) => setEdit(e.id, (x) => void (x.title = ev.target.value))}
                />
                <Textarea rows={1} className="text-xs min-h-[36px]" value={e.stack} onChange={(ev) => setEdit(e.id, (x) => void (x.stack = ev.target.value))} />
                <Textarea rows={3} className="text-xs" value={e.bullets} onChange={(ev) => setEdit(e.id, (x) => void (x.bullets = ev.target.value))} />
                {orig && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">original bullets</summary>
                    <ul className="list-disc ml-4 mt-1">
                      {orig.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
          <Button size="sm" variant="secondary" onClick={apply}>
            <Check className="w-4 h-4 mr-1.5" /> Apply included projects
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== Step 3: Experience =====
function StepExperience({
  profile,
  patch,
  wizard,
  updateWizard,
  busy,
  aiDisabled,
  cooldown,
  onRun,
  onReset,
}: {
  profile: Profile;
  patch: Patch;
  wizard: WizardState;
  updateWizard: Props["updateWizard"];
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: (selected: Experience[]) => void;
  onReset: () => void;
}) {
  const res = wizard.raw.experience;
  const t = res ? wizard.tweaks.experience ?? seedExperience(res) : null;
  // Which jobs get sent to the AI (defaults to all).
  const send = wizard.tweaks.sendExperience ?? profile.experience.map((e) => e.id);

  const setT = (recipe: (t: ExperienceTweaks) => void) =>
    updateWizard((w) => {
      const r = w.raw.experience;
      if (!r) return;
      const cur = w.tweaks.experience ?? seedExperience(r);
      recipe(cur);
      w.tweaks.experience = cur;
    });

  const setSend = (ids: string[]) => updateWizard((w) => void (w.tweaks.sendExperience = ids));
  const toggleSend = (id: string) =>
    setSend(send.includes(id) ? send.filter((x) => x !== id) : [...send, id]);
  const selected = profile.experience.filter((e) => send.includes(e.id));

  const apply = () => {
    if (!t) return;
    patch((d) => {
      // A job was reviewed this round iff it has a bullets entry (seeded from the
      // AI response). Reviewed + unticked → drop it from the resume. Reviewed +
      // ticked → apply the rewrite. Jobs never sent stay untouched.
      d.experience = d.experience
        .filter((job) => t.bullets[job.id] === undefined || (t.include[job.id] ?? true))
        .map((job) =>
          t.bullets[job.id] !== undefined
            ? { ...job, bullets: t.bullets[job.id].split("\n").map((x) => x.trim()).filter(Boolean) }
            : job
        );
    });
  };

  if (profile.experience.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No experience on your profile — add some in My Profile.</p>;
  }

  return (
    <div className="space-y-4">
      {!res ? (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Pick jobs to send.</span> Only checked jobs are sent. The AI
            rewrites each one&apos;s bullets toward the job description.
          </p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() =>
                  setSend(selected.length === profile.experience.length ? [] : profile.experience.map((e) => e.id))
                }
              >
                {selected.length === profile.experience.length ? "Clear all" : "Select all"}
              </button>
              <span>
                · {selected.length} of {profile.experience.length} selected
              </span>
            </div>
            <AiButton
              busy={busy}
              disabled={aiDisabled || selected.length === 0}
              cooldown={cooldown}
              onClick={() => onRun(selected)}
              label={`Get suggestions (${selected.length})`}
            />
          </div>
          {selected.length === 0 && (
            <p className="text-xs text-destructive">Select at least one job to get suggestions.</p>
          )}

          <div className="space-y-1.5">
            {profile.experience.map((job) => (
              <SelectRow
                key={job.id}
                checked={send.includes(job.id)}
                onToggle={() => toggleSend(job.id)}
                title={job.title}
                subtitle={job.company}
                bullets={job.bullets}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Review &amp; apply.</span> Untick a job to drop it from the
              resume, edit the rewrite, then apply. Or reset to start over.
            </p>
            <Button variant="outline" size="sm" className="shrink-0" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
            </Button>
          </div>
          {res.experience.map((r) => {
            const job = profile.experience.find((e) => e.id === r.id);
            if (!job || !t) return null;
            const on = t.include[r.id] ?? true;
            return (
              <div key={r.id} className={`rounded-lg border p-3 space-y-2 ${on ? "" : "opacity-60"}`}>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={on} onChange={() => setT((x) => void (x.include[r.id] = !on))} />
                  Include
                  <span className="text-xs font-normal text-muted-foreground">
                    · {job.title} · {job.company}
                  </span>
                </label>
                <Textarea
                  rows={4}
                  className="text-xs"
                  value={t.bullets[r.id] ?? job.bullets.join("\n")}
                  onChange={(e) => setT((x) => void (x.bullets[r.id] = e.target.value))}
                />
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">original bullets</summary>
                  <ul className="list-disc ml-4 mt-1">
                    {job.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}
          <Button size="sm" variant="secondary" onClick={apply}>
            <Check className="w-4 h-4 mr-1.5" /> Apply to resume
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== Step 4: Certifications =====
function StepCertifications({
  profile,
  patch,
  wizard,
  updateWizard,
  busy,
  aiDisabled,
  cooldown,
  onRun,
}: {
  profile: Profile;
  patch: Patch;
  wizard: WizardState;
  updateWizard: Props["updateWizard"];
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: () => void;
}) {
  const res = wizard.raw.certifications;
  const checked = wizard.tweaks.certifications ?? res?.selected.map((s) => s.id) ?? [];

  // Display/apply order — user-moved ids first, any certs added since appended in profile order.
  const order = wizard.tweaks.certOrder ?? [];
  const orderedCerts = [
    ...order.map((id) => profile.certifications.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    ...profile.certifications.filter((c) => !order.includes(c.id)),
  ];

  const toggle = (id: string) =>
    updateWizard(
      (w) => void (w.tweaks.certifications = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id])
    );

  const move = (id: string, dir: -1 | 1) => {
    const ids = orderedCerts.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    updateWizard((w) => void (w.tweaks.certOrder = ids));
  };

  const apply = () => {
    const keep = orderedCerts.filter((c) => checked.includes(c.id));
    patch((d) => void (d.certifications = keep.map((c) => ({ ...c }))));
  };

  const reasonFor = (id: string) => res?.selected.find((s) => s.id === id)?.reason;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">AI ranks your most JD-relevant certifications. Education is edit-only (preview / profile).</p>
        <AiButton busy={busy} disabled={aiDisabled} cooldown={cooldown} onClick={onRun} label="Get suggestions" />
      </div>

      {profile.certifications.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No certifications on your profile.</p>
      ) : (
        <div className="space-y-2">
          {orderedCerts.map((c, idx) => (
            <div key={c.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
              <label className="flex flex-1 items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={checked.includes(c.id)} onChange={() => toggle(c.id)} />
                <span>
                  <span className="font-medium">{c.name}</span>{" "}
                  {c.issuer && <span className="text-xs text-muted-foreground">· {c.issuer}</span>}{" "}
                  <span className="text-xs text-muted-foreground">· {c.year}</span>
                  {reasonFor(c.id) && <span className="block text-xs text-primary mt-0.5">{reasonFor(c.id)}</span>}
                </span>
              </label>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(c.id, -1)}
                  disabled={idx === 0}
                  aria-label="Move up"
                  className="rounded border p-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(c.id, 1)}
                  disabled={idx === orderedCerts.length - 1}
                  aria-label="Move down"
                  className="rounded border p-1 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={apply}>
            <Check className="w-4 h-4 mr-1.5" /> Apply selected
          </Button>
        </div>
      )}

      {res && res.worthGetting.length > 0 && (
        <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Lightbulb className="w-4 h-4" /> Worth getting (NOT added to resume)
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {res.worthGetting.map((w, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{w.name}</span> — {w.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ===== Step 5: Review =====
function StepReview() {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Final pass.</p>
      <p>The preview on the right is your live resume — click any field to edit it inline.</p>
      <p>
        When it looks right, hit <strong>Export PDF</strong> in the top bar. It uses the browser print pipeline with the
        template&apos;s A4 margins; choose &quot;Save as PDF&quot; and disable headers/footers in the print dialog.
      </p>
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mt-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Sparkles className="w-4 h-4 text-primary" /> Check it against the job
        </p>
        <p className="mt-1">
          Once you&apos;ve saved the PDF, run it through the{" "}
          <Link href="/tools/resume-analyzer" className="text-primary font-medium hover:underline">
            Resume Analyzer
          </Link>{" "}
          to score it against the job description and catch anything missing.
        </p>
      </div>
    </div>
  );
}
