"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Save,
  FolderGit2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile, ResumeProject } from "@/lib/resume/types";
import SkillsBadgeBoard from "./SkillsBadgeBoard";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

const linesToArr = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const csvToArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

interface Props {
  profile: Profile;
  onProfileChange: (p: Profile) => void;
  projects: ResumeProject[];
  onSaveProject: (p: ResumeProject) => void;
  onDeleteProject: (id: string) => void;
  onReorderProjects: (ids: string[]) => void;
  onImportProjects: (ps: ResumeProject[]) => void;
}

// Sections that use the buffered save/reset flow (Projects has its own per-card save).
type SectionKey = "basics" | "summary" | "skills" | "experience" | "certifications" | "education" | "projects";
const SECTION_KEYS: Array<Exclude<SectionKey, "projects">> = [
  "basics",
  "summary",
  "skills",
  "experience",
  "certifications",
  "education",
];

export default function ProfileManager({
  profile,
  onProfileChange,
  projects,
  onSaveProject,
  onDeleteProject,
  onReorderProjects,
  onImportProjects,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Profile>(profile);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    basics: false,
    summary: false,
    skills: false,
    experience: false,
    certifications: false,
    education: false,
    projects: false,
  });
  /** Newly added cards open once so the form is immediately editable. */
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const isItemOpen = (id: string) => openItems[id] ?? false;
  const toggleItem = (id: string) => setOpenItems((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  const openItem = (id: string) => setOpenItems((prev) => ({ ...prev, [id]: true }));

  const prevProfile = useRef(profile);
  useEffect(() => {
    const prev = prevProfile.current;
    prevProfile.current = profile;
    if (prev === profile) return;
    setDraft((d) => {
      const next = structuredClone(profile);
      SECTION_KEYS.forEach((k) => {
        if (JSON.stringify(d[k]) !== JSON.stringify(prev[k])) next[k] = structuredClone(d[k]) as never;
      });
      return next;
    });
  }, [profile]);

  const update = (recipe: (p: Profile) => void) => {
    setDraft((prev) => {
      const next: Profile = structuredClone(prev);
      recipe(next);
      return next;
    });
  };

  const isDirty = (key: Exclude<SectionKey, "projects">) =>
    JSON.stringify(draft[key]) !== JSON.stringify(profile[key]);
  const saveSection = (key: Exclude<SectionKey, "projects">) =>
    onProfileChange({ ...profile, [key]: structuredClone(draft[key]) });
  const resetSection = (key: Exclude<SectionKey, "projects">) =>
    setDraft((prev) => ({ ...prev, [key]: structuredClone(profile[key]) }));

  const toggleSection = (key: SectionKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const moveCert = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= draft.certifications.length) return;
    update((p) => {
      const arr = p.certifications;
      [arr[index], arr[j]] = [arr[j], arr[index]];
    });
  };

  const moveProject = (id: string, dir: -1 | 1) => {
    const ids = projects.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorderProjects(ids);
  };

  const exportProfile = () => {
    const blob = new Blob([JSON.stringify({ profile, projects }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.profile) onProfileChange(parsed.profile as Profile);
        if (Array.isArray(parsed.projects)) onImportProjects(parsed.projects as ResumeProject[]);
      } catch {
        alert("Invalid profile JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const sectionProps = (key: Exclude<SectionKey, "projects">) => ({
    sectionKey: key as SectionKey,
    open: open[key],
    onToggle: () => toggleSection(key),
    dirty: isDirty(key),
    onSave: () => saveSection(key),
    onReset: () => resetSection(key),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportProfile}>
          <Download className="w-4 h-4 mr-1.5" /> Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1.5" /> Import JSON
        </Button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importProfile} className="hidden" />
      </div>

      <Section title="Basics" {...sectionProps("basics")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ["name", "Full name"],
              ["role", "Role / title"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["portfolio", "Portfolio URL"],
              ["github", "GitHub"],
              ["linkedin", "LinkedIn"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input value={draft.basics[key]} onChange={(e) => update((p) => void (p.basics[key] = e.target.value))} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Summary" {...sectionProps("summary")}>
        <Textarea
          rows={4}
          value={draft.summary}
          onChange={(e) => update((p) => void (p.summary = e.target.value))}
          placeholder="Generic professional summary…"
        />
      </Section>

      <Section title="Skills" {...sectionProps("skills")}>
        <p className="mb-2 text-xs text-muted-foreground">
          Add skills as badges, drag to reorder, drop onto another category to move, or drag the grip to reorder
          categories. Categories start collapsed — expand to edit.
        </p>
        <SkillsBadgeBoard mode="edit" categories={draft.skills} onChange={(next) => update((p) => void (p.skills = next))} />
        {draft.skills.length === 0 && (
          <p className="mt-2 text-sm italic text-muted-foreground">No skill categories yet — add one above.</p>
        )}
      </Section>

      <Section
        title="Experience"
        {...sectionProps("experience")}
        action={
          <AddButton
            onClick={() => {
              setOpen((o) => ({ ...o, experience: true }));
              update((p) =>
                void p.experience.unshift({
                  id: uid(),
                  title: "",
                  company: "",
                  location: "",
                  start: "",
                  end: "",
                  bullets: [],
                })
              );
            }}
            label="Add job"
          />
        }
      >
        <div className="space-y-4">
          {draft.experience.map((exp, i) => (
            <div key={exp.id} className="rounded-lg border p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Title" value={exp.title} onChange={(e) => update((p) => void (p.experience[i].title = e.target.value))} />
                <Input placeholder="Company" value={exp.company} onChange={(e) => update((p) => void (p.experience[i].company = e.target.value))} />
                <Input placeholder="Location" value={exp.location} onChange={(e) => update((p) => void (p.experience[i].location = e.target.value))} />
                <div className="flex gap-2">
                  <Input placeholder="Start" value={exp.start} onChange={(e) => update((p) => void (p.experience[i].start = e.target.value))} />
                  <Input placeholder="End" value={exp.end} onChange={(e) => update((p) => void (p.experience[i].end = e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bullets (one per line)</Label>
                <Textarea
                  rows={4}
                  value={exp.bullets.join("\n")}
                  onChange={(e) => update((p) => void (p.experience[i].bullets = linesToArr(e.target.value)))}
                />
              </div>
              <RemoveButton label="Remove job" onClick={() => update((p) => p.experience.splice(i, 1))} />
            </div>
          ))}
          {draft.experience.length === 0 && <Empty>No experience entries yet.</Empty>}
        </div>
      </Section>

      <Section
        title={
          <span className="flex items-center gap-1.5">
            <FolderGit2 className="w-4 h-4" /> Saved Projects
          </span>
        }
        sectionKey="projects"
        open={open.projects}
        onToggle={() => toggleSection("projects")}
        action={
          <AddButton
            onClick={() => {
              const id = uid();
              setOpen((o) => ({ ...o, projects: true }));
              openItem(id);
              onSaveProject({
                id,
                title: "New Project",
                liveUrl: "",
                codeUrl: "",
                stack: [],
                bullets: [],
                caseStudy: "",
              });
            }}
            label="Add project"
          />
        }
      >
        <p className="text-xs text-muted-foreground mb-3">
          Isolated from the Upwork Proposal Writer&apos;s projects. The <strong>case study</strong> is raw material the
          AI draws on; it never appears on the resume. Use arrows to reorder.
        </p>
        <div className="space-y-2">
          {projects.map((proj, idx) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              open={isItemOpen(proj.id)}
              onToggle={() => toggleItem(proj.id)}
              onSave={onSaveProject}
              onDelete={onDeleteProject}
              onMoveUp={() => moveProject(proj.id, -1)}
              onMoveDown={() => moveProject(proj.id, 1)}
              canUp={idx > 0}
              canDown={idx < projects.length - 1}
            />
          ))}
          {projects.length === 0 && <Empty>No saved projects yet.</Empty>}
        </div>
      </Section>

      <Section
        title="Certifications"
        {...sectionProps("certifications")}
        action={
          <AddButton
            onClick={() => {
              const id = uid();
              setOpen((o) => ({ ...o, certifications: true }));
              openItem(id);
              update((p) => void p.certifications.unshift({ id, name: "", issuer: "", year: "" }));
            }}
            label="Add certification"
          />
        }
      >
        <div className="space-y-2">
          {draft.certifications.map((c, i) => {
            const expanded = isItemOpen(c.id);
            return (
              <div key={c.id} className="rounded-md border">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveCert(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="rounded border p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCert(i, 1)}
                      disabled={i === draft.certifications.length - 1}
                      aria-label="Move down"
                      className="rounded border p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItem(c.id)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-medium">{c.name || "Untitled certification"}</span>
                    {(c.issuer || c.year) && (
                      <span className="truncate text-xs text-muted-foreground">
                        {[c.issuer, c.year].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                  <RemoveButton onClick={() => update((p) => p.certifications.splice(i, 1))} />
                </div>
                {expanded && (
                  <div className="space-y-2 border-t px-2 py-2">
                    <div className="flex gap-2 flex-wrap">
                      <Input
                        className="flex-1 min-w-[8rem]"
                        placeholder="Name"
                        value={c.name}
                        onChange={(e) => update((p) => void (p.certifications[i].name = e.target.value))}
                      />
                      <Input
                        className="w-36"
                        placeholder="Issuer"
                        value={c.issuer}
                        onChange={(e) => update((p) => void (p.certifications[i].issuer = e.target.value))}
                      />
                      <Input
                        className="w-20"
                        placeholder="Year"
                        value={c.year}
                        onChange={(e) => update((p) => void (p.certifications[i].year = e.target.value))}
                      />
                    </div>
                    <Input
                      placeholder="Verification link (optional)"
                      value={c.link ?? ""}
                      onChange={(e) => update((p) => void (p.certifications[i].link = e.target.value))}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {draft.certifications.length === 0 && <Empty>No certifications yet.</Empty>}
        </div>
      </Section>

      <Section
        title="Education"
        {...sectionProps("education")}
        action={
          <AddButton
            onClick={() => {
              setOpen((o) => ({ ...o, education: true }));
              update((p) =>
                void p.education.unshift({ id: uid(), degree: "", institution: "", detail: "", start: "", end: "" })
              );
            }}
            label="Add education"
          />
        }
      >
        <div className="space-y-4">
          {draft.education.map((e, i) => (
            <div key={e.id} className="rounded-lg border p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Degree" value={e.degree} onChange={(ev) => update((p) => void (p.education[i].degree = ev.target.value))} />
                <Input placeholder="Institution" value={e.institution} onChange={(ev) => update((p) => void (p.education[i].institution = ev.target.value))} />
                <Input placeholder="Detail (e.g. CGPA)" value={e.detail} onChange={(ev) => update((p) => void (p.education[i].detail = ev.target.value))} />
                <div className="flex gap-2">
                  <Input placeholder="Start" value={e.start} onChange={(ev) => update((p) => void (p.education[i].start = ev.target.value))} />
                  <Input placeholder="End" value={e.end} onChange={(ev) => update((p) => void (p.education[i].end = ev.target.value))} />
                </div>
              </div>
              <RemoveButton label="Remove" onClick={() => update((p) => p.education.splice(i, 1))} />
            </div>
          ))}
          {draft.education.length === 0 && <Empty>No education entries yet.</Empty>}
        </div>
      </Section>
    </div>
  );
}

function ProjectCard({
  project,
  open,
  onToggle,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
}: {
  project: ResumeProject;
  open: boolean;
  onToggle: () => void;
  onSave: (p: ResumeProject) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const [draft, setDraft] = useState(project);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(project);
    setDirty(false);
  }, [project]);

  const set = (recipe: (p: ResumeProject) => void) => {
    const next = structuredClone(draft);
    recipe(next);
    setDraft(next);
    setDirty(true);
  };

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canUp}
            aria-label="Move up"
            className="rounded border p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canDown}
            aria-label="Move down"
            className="rounded border p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-medium">{draft.title || "Untitled project"}</span>
          {dirty && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Unsaved
            </span>
          )}
          {draft.stack.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">{draft.stack.slice(0, 3).join(" · ")}</span>
          )}
        </button>
        <RemoveButton label="Delete" onClick={() => onDelete(project.id)} />
      </div>
      {open && (
        <div className="space-y-2 border-t px-3 py-2">
          <Input placeholder="Project title" value={draft.title} onChange={(e) => set((p) => void (p.title = e.target.value))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Live URL" value={draft.liveUrl} onChange={(e) => set((p) => void (p.liveUrl = e.target.value))} />
            <Input placeholder="Code URL" value={draft.codeUrl} onChange={(e) => set((p) => void (p.codeUrl = e.target.value))} />
          </div>
          <Input
            placeholder="Tech stack (comma separated)"
            value={draft.stack.join(", ")}
            onChange={(e) => set((p) => void (p.stack = csvToArr(e.target.value)))}
          />
          <div className="space-y-1">
            <Label className="text-xs">Resume bullets (one per line)</Label>
            <Textarea rows={3} value={draft.bullets.join("\n")} onChange={(e) => set((p) => void (p.bullets = linesToArr(e.target.value)))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Case study (long-form raw material for the AI)</Label>
            <Textarea rows={4} value={draft.caseStudy} onChange={(e) => set((p) => void (p.caseStudy = e.target.value))} />
          </div>
          <Button
            size="sm"
            disabled={!dirty}
            onClick={() => {
              onSave(draft);
              setDirty(false);
            }}
          >
            <Save className="w-4 h-4 mr-1.5" /> {dirty ? "Save" : "Saved"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  action,
  dirty,
  onSave,
  onReset,
  open,
  onToggle,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  dirty?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  open: boolean;
  onToggle: () => void;
  sectionKey?: SectionKey;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background/50">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
            {dirty && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium normal-case text-amber-600 dark:text-amber-400">
                Unsaved
              </span>
            )}
          </h3>
        </button>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {action}
          {dirty && onReset && (
            <Button variant="ghost" size="sm" onClick={onReset} title="Discard changes to this section">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          {dirty && onSave && (
            <Button size="sm" onClick={onSave}>
              <Save className="w-4 h-4 mr-1.5" /> Save
            </Button>
          )}
        </div>
      </div>
      {open && <div className="border-t px-3 py-3">{children}</div>}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      <Plus className="w-4 h-4 mr-1" /> {label}
    </Button>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive shrink-0" onClick={onClick}>
      <Trash2 className="w-4 h-4" /> {label ? <span className="ml-1">{label}</span> : null}
    </Button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground italic">{children}</p>;
}
