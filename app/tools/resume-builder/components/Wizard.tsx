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

  async function runCall<T>(key: keyof WizardState["raw"], fn: () => Promise<{ data: T }>) {
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
      updateWizard((w) => void (w.raw[key] = res.data as never));
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
            busy={busy("summarySkills")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={() => runCall("summarySkills", () => generateSummarySkills(profile, wizard.jobDescription, model))}
            onSaveProfile={onSaveProfile}
          />
        )}
        {step === 2 && (
          <StepProjects
            projects={projects}
            patch={patch}
            wizard={wizard}
            busy={busy("projects")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={(selected) => runCall("projects", () => generateProjects(selected, wizard.jobDescription, model))}
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
              updateWizard((w) => void (w.raw.projects = null));
            }}
          />
        )}
        {step === 3 && (
          <StepExperience
            profile={profile}
            patch={patch}
            wizard={wizard}
            busy={busy("experience")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={(selected) => runCall("experience", () => generateExperience(selected, wizard.jobDescription, model))}
            onReset={() => {
              // Revert the preview's experience bullets to the profile originals
              // and drop the suggestions so the step returns to the selection view.
              patch((d) => {
                d.experience = profile.experience.map((e) => ({ ...e, bullets: [...e.bullets] }));
              });
              updateWizard((w) => void (w.raw.experience = null));
            }}
          />
        )}
        {step === 4 && (
          <StepCertifications
            profile={profile}
            patch={patch}
            wizard={wizard}
            busy={busy("certifications")}
            aiDisabled={aiDisabled}
            cooldown={cooldown}
            onRun={() => runCall("certifications", () => generateCertifications(profile, wizard.jobDescription, model))}
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
function StepSummarySkills({
  profile,
  draft,
  patch,
  wizard,
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
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: () => void;
  onSaveProfile: (p: Profile) => void;
}) {
  const res = wizard.raw.summarySkills;
  const [summary, setSummary] = useState("");
  // Selection is keyed by skill label so it survives a cross-category drag.
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [addChecked, setAddChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  // Local, reorderable working copy of the profile's skills (seeded once).
  const [cats, setCats] = useState<SkillCategory[]>([]);
  const seeded = useRef(false);

  const skillKey = (c: string, i: string) => `${c}|||${i}`;

  useEffect(() => {
    if (!seeded.current && profile.skills.length) {
      setCats(profile.skills.map((c) => ({ category: c.category, items: [...c.items] })));
      seeded.current = true;
    }
  }, [profile.skills]);

  // Seed summary + selection when a fresh AI response arrives.
  useEffect(() => {
    if (!res) return;
    setSummary(res.summary || "");
    setChecked(new Set(res.selectedSkills.map((s) => s.item)));
    setAddChecked(new Set());
  }, [res]);

  const toggleChecked = (item: string) =>
    setChecked((prev) => {
      const n = new Set(prev);
      n.has(item) ? n.delete(item) : n.add(item);
      return n;
    });
  const toggleAdd = (key: string) =>
    setAddChecked((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  // Persist a suggested addition into the profile now (icon flips to a tick).
  const saveAddition = (a: { category: string; item: string }) => {
    const key = skillKey(a.category, a.item);
    if (saved.has(key)) return;
    const p: Profile = structuredClone(profile);
    let row = p.skills.find((s) => s.category === a.category);
    if (!row) {
      row = { category: a.category, items: [] };
      p.skills.push(row);
    }
    if (!row.items.includes(a.item)) row.items.push(a.item);
    onSaveProfile(p);
    setSaved((prev) => new Set(prev).add(key));
  };

  const apply = () => {
    // Build draft.skills from the arranged categories, keeping only selected
    // skills, then fold in any checked suggested additions.
    const newSkills: SkillCategory[] = [];
    cats.forEach((row) => {
      const kept = row.items.filter((it) => checked.has(it));
      if (kept.length) newSkills.push({ category: row.category, items: kept });
    });
    (res?.suggestedAdditions || []).forEach((a) => {
      if (!addChecked.has(skillKey(a.category, a.item))) return;
      let row = newSkills.find((s) => s.category === a.category);
      if (!row) {
        row = { category: a.category, items: [] };
        newSkills.push(row);
      }
      if (!row.items.includes(a.item)) row.items.push(a.item);
    });
    patch((d) => {
      d.summary = summary;
      d.skills = newSkills;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">One AI call rewrites your summary and picks JD-relevant skills.</p>
        <AiButton busy={busy} disabled={aiDisabled} cooldown={cooldown} onClick={onRun} label="Get suggestions" />
      </div>

      {!res ? (
        <p className="text-sm text-muted-foreground italic">No suggestions yet — or edit the preview / profile by hand.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tailored summary</Label>
              <button className="text-xs text-primary hover:underline" onClick={() => setSummary(draft.summary)}>
                use current
              </button>
            </div>
            <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">From your profile (AI pre-checked the relevant ones)</Label>
            <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
              Tap a skill to include or exclude it. Drag to reorder, drop onto another category to move it, or drag the
              grip to reorder categories. This arrangement is what lands on your resume.
            </p>
            <SkillsBadgeBoard
              mode="select"
              categories={cats}
              onChange={setCats}
              isSelected={(_c, i) => checked.has(i)}
              onToggle={(_c, i) => toggleChecked(i)}
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
                  const isSaved = saved.has(key);
                  return (
                    <div key={key} className="rounded-md border p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={addChecked.has(key)} onChange={() => toggleAdd(key)} />
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
interface ProjEdit {
  id: string;
  include: boolean;
  title: string;
  stack: string;
  bullets: string;
  reason: string;
}

function StepProjects({
  projects,
  patch,
  wizard,
  busy,
  aiDisabled,
  cooldown,
  onRun,
  onReset,
}: {
  projects: ResumeProject[];
  patch: Patch;
  wizard: WizardState;
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: (selected: ResumeProject[]) => void;
  onReset: () => void;
}) {
  const res = wizard.raw.projects;
  const [edits, setEdits] = useState<ProjEdit[]>([]);
  // Which saved projects get sent to the AI (defaults to all once loaded).
  const [send, setSend] = useState<Set<string>>(new Set());
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && projects.length) {
      setSend(new Set(projects.map((p) => p.id)));
      seeded.current = true;
    }
  }, [projects]);

  useEffect(() => {
    if (!res) return;
    setEdits(
      // The model sometimes omits `refactored` (or fields within it) for projects
      // it marks as not-included — fall back to the original project so the map
      // never dereferences undefined.
      res.projects.map((p) => {
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
      })
    );
  }, [res, projects]);

  const setEdit = (id: string, recipe: (e: ProjEdit) => void) =>
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

  const toggleSend = (id: string) =>
    setSend((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selected = projects.filter((p) => send.has(p.id));

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
                onClick={() => setSend(new Set(selected.length === projects.length ? [] : projects.map((p) => p.id)))}
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
                checked={send.has(p.id)}
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
  busy,
  aiDisabled,
  cooldown,
  onRun,
  onReset,
}: {
  profile: Profile;
  patch: Patch;
  wizard: WizardState;
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: (selected: Experience[]) => void;
  onReset: () => void;
}) {
  const res = wizard.raw.experience;
  const [edits, setEdits] = useState<Record<string, string>>({});
  // Include/exclude for the AI's returned rewrites (defaults to include).
  const [include, setInclude] = useState<Record<string, boolean>>({});
  // Which jobs get sent to the AI (defaults to all once loaded).
  const [send, setSend] = useState<Set<string>>(new Set());
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && profile.experience.length) {
      setSend(new Set(profile.experience.map((e) => e.id)));
      seeded.current = true;
    }
  }, [profile.experience]);

  useEffect(() => {
    if (!res) return;
    const map: Record<string, string> = {};
    const inc: Record<string, boolean> = {};
    res.experience.forEach((e) => {
      map[e.id] = e.bullets.join("\n");
      inc[e.id] = true;
    });
    setEdits(map);
    setInclude(inc);
  }, [res]);

  const toggleSend = (id: string) =>
    setSend((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selected = profile.experience.filter((e) => send.has(e.id));

  const apply = () => {
    patch((d) => {
      // A job was reviewed this round iff it has an edits entry (seeded from the
      // AI response). Reviewed + unticked → drop it from the resume. Reviewed +
      // ticked → apply the rewrite. Jobs never sent stay untouched.
      d.experience = d.experience
        .filter((job) => edits[job.id] === undefined || (include[job.id] ?? true))
        .map((job) =>
          edits[job.id] !== undefined
            ? { ...job, bullets: edits[job.id].split("\n").map((x) => x.trim()).filter(Boolean) }
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
                  setSend(
                    new Set(selected.length === profile.experience.length ? [] : profile.experience.map((e) => e.id))
                  )
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
                checked={send.has(job.id)}
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
            if (!job) return null;
            const on = include[r.id] ?? true;
            return (
              <div key={r.id} className={`rounded-lg border p-3 space-y-2 ${on ? "" : "opacity-60"}`}>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={on} onChange={() => setInclude((prev) => ({ ...prev, [r.id]: !on }))} />
                  Include
                  <span className="text-xs font-normal text-muted-foreground">
                    · {job.title} · {job.company}
                  </span>
                </label>
                <Textarea
                  rows={4}
                  className="text-xs"
                  value={edits[r.id] ?? job.bullets.join("\n")}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
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
  busy,
  aiDisabled,
  cooldown,
  onRun,
}: {
  profile: Profile;
  patch: Patch;
  wizard: WizardState;
  busy: boolean;
  aiDisabled: boolean;
  cooldown: number;
  onRun: () => void;
}) {
  const res = wizard.raw.certifications;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!res) return;
    setChecked(new Set(res.selected.map((s) => s.id)));
  }, [res]);

  const toggle = (id: string) => {
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    setChecked(next);
  };

  const apply = () => {
    const keep = profile.certifications.filter((c) => checked.has(c.id));
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
          {profile.certifications.map((c) => (
            <label key={c.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={checked.has(c.id)} onChange={() => toggle(c.id)} />
              <span>
                <span className="font-medium">{c.name}</span>{" "}
                <span className="text-xs text-muted-foreground">· {c.year}</span>
                {reasonFor(c.id) && <span className="block text-xs text-primary mt-0.5">{reasonFor(c.id)}</span>}
              </span>
            </label>
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
