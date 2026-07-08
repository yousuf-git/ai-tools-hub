"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Download, Upload, Save, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile, ResumeProject } from "@/lib/resume/types";

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
  onImportProjects: (ps: ResumeProject[]) => void;
}

export default function ProfileManager({
  profile,
  onProfileChange,
  projects,
  onSaveProject,
  onDeleteProject,
  onImportProjects,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (recipe: (p: Profile) => void) => {
    const next: Profile = structuredClone(profile);
    recipe(next);
    onProfileChange(next);
  };

  // ---- profile JSON import/export ----
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

  return (
    <div className="space-y-8">
      {/* Import / Export */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportProfile}>
          <Download className="w-4 h-4 mr-1.5" /> Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1.5" /> Import JSON
        </Button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importProfile} className="hidden" />
      </div>

      {/* ===== Basics ===== */}
      <Section title="Basics">
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
              <Input
                value={profile.basics[key]}
                onChange={(e) => update((p) => void (p.basics[key] = e.target.value))}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ===== Summary ===== */}
      <Section title="Summary">
        <Textarea
          rows={4}
          value={profile.summary}
          onChange={(e) => update((p) => void (p.summary = e.target.value))}
          placeholder="Generic professional summary…"
        />
      </Section>

      {/* ===== Skills ===== */}
      <Section
        title="Skills"
        action={
          <AddButton onClick={() => update((p) => p.skills.push({ category: "", items: [] }))} label="Add category" />
        }
      >
        <div className="space-y-3">
          {profile.skills.map((row, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                className="w-40 shrink-0"
                placeholder="Category"
                value={row.category}
                onChange={(e) => update((p) => void (p.skills[i].category = e.target.value))}
              />
              <Textarea
                rows={1}
                className="flex-1 min-h-[40px]"
                placeholder="comma, separated, skills"
                value={row.items.join(", ")}
                onChange={(e) => update((p) => void (p.skills[i].items = csvToArr(e.target.value)))}
              />
              <RemoveButton onClick={() => update((p) => p.skills.splice(i, 1))} />
            </div>
          ))}
          {profile.skills.length === 0 && <Empty>No skill categories yet.</Empty>}
        </div>
      </Section>

      {/* ===== Experience ===== */}
      <Section
        title="Experience"
        action={
          <AddButton
            onClick={() =>
              update((p) =>
                p.experience.push({ id: uid(), title: "", company: "", location: "", start: "", end: "", bullets: [] })
              )
            }
            label="Add job"
          />
        }
      >
        <div className="space-y-4">
          {profile.experience.map((exp, i) => (
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
          {profile.experience.length === 0 && <Empty>No experience entries yet.</Empty>}
        </div>
      </Section>

      {/* ===== Projects (separate store) ===== */}
      <Section
        title={
          <span className="flex items-center gap-1.5">
            <FolderGit2 className="w-4 h-4" /> Saved Projects
          </span>
        }
        action={
          <AddButton
            onClick={() =>
              onSaveProject({ id: uid(), title: "New Project", liveUrl: "", codeUrl: "", stack: [], bullets: [], caseStudy: "" })
            }
            label="Add project"
          />
        }
      >
        <p className="text-xs text-muted-foreground mb-3">
          These are isolated from the Upwork Proposal Writer&apos;s projects. The <strong>case study</strong> is raw
          material the AI draws on; it never appears on the resume.
        </p>
        <div className="space-y-4">
          {projects.map((proj) => (
            <ProjectCard key={proj.id} project={proj} onSave={onSaveProject} onDelete={onDeleteProject} />
          ))}
          {projects.length === 0 && <Empty>No saved projects yet.</Empty>}
        </div>
      </Section>

      {/* ===== Certifications ===== */}
      <Section
        title="Certifications"
        action={
          <AddButton
            onClick={() => update((p) => p.certifications.push({ id: uid(), name: "", issuer: "", year: "" }))}
            label="Add certification"
          />
        }
      >
        <div className="space-y-2">
          {profile.certifications.map((c, i) => (
            <div key={c.id} className="flex gap-2">
              <Input className="flex-1" placeholder="Name" value={c.name} onChange={(e) => update((p) => void (p.certifications[i].name = e.target.value))} />
              <Input className="w-40" placeholder="Issuer" value={c.issuer} onChange={(e) => update((p) => void (p.certifications[i].issuer = e.target.value))} />
              <Input className="w-20" placeholder="Year" value={c.year} onChange={(e) => update((p) => void (p.certifications[i].year = e.target.value))} />
              <RemoveButton onClick={() => update((p) => p.certifications.splice(i, 1))} />
            </div>
          ))}
          {profile.certifications.length === 0 && <Empty>No certifications yet.</Empty>}
        </div>
      </Section>

      {/* ===== Education ===== */}
      <Section
        title="Education"
        action={
          <AddButton
            onClick={() => update((p) => p.education.push({ id: uid(), degree: "", institution: "", detail: "", start: "", end: "" }))}
            label="Add education"
          />
        }
      >
        <div className="space-y-4">
          {profile.education.map((e, i) => (
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
          {profile.education.length === 0 && <Empty>No education entries yet.</Empty>}
        </div>
      </Section>
    </div>
  );
}

// ---- A project card with its own local editing state, committed on Save ----
function ProjectCard({
  project,
  onSave,
  onDelete,
}: {
  project: ResumeProject;
  onSave: (p: ResumeProject) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState(project);
  const [dirty, setDirty] = useState(false);

  const set = (recipe: (p: ResumeProject) => void) => {
    const next = structuredClone(draft);
    recipe(next);
    setDraft(next);
    setDirty(true);
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <Input placeholder="Project title" value={draft.title} onChange={(e) => set((p) => void (p.title = e.target.value))} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input placeholder="Live URL" value={draft.liveUrl} onChange={(e) => set((p) => void (p.liveUrl = e.target.value))} />
        <Input placeholder="Code URL" value={draft.codeUrl} onChange={(e) => set((p) => void (p.codeUrl = e.target.value))} />
      </div>
      <Input placeholder="Tech stack (comma separated)" value={draft.stack.join(", ")} onChange={(e) => set((p) => void (p.stack = csvToArr(e.target.value)))} />
      <div className="space-y-1">
        <Label className="text-xs">Resume bullets (one per line)</Label>
        <Textarea rows={3} value={draft.bullets.join("\n")} onChange={(e) => set((p) => void (p.bullets = linesToArr(e.target.value)))} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Case study (long-form raw material for the AI)</Label>
        <Textarea rows={4} value={draft.caseStudy} onChange={(e) => set((p) => void (p.caseStudy = e.target.value))} />
      </div>
      <div className="flex gap-2">
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
        <RemoveButton label="Delete" onClick={() => onDelete(project.id)} />
      </div>
    </div>
  );
}

// ---- small presentational helpers ----
function Section({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
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
