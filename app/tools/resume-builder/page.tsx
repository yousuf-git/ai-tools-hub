"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Printer, ZoomIn, ZoomOut, RotateCcw, Save, CheckCircle2, XCircle, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { GEMINI_MODELS } from "@/lib/gemini";
import type { CatalogueEntry, CatalogueSummary, Profile, ResumeProject, ResumeDraft, WizardState } from "@/lib/resume/types";
import { seedProfile, seedProjects, draftFromProfile, emptyProfile, isEmptyDraft } from "@/lib/resume/seed";
import * as store from "@/lib/resume/storage";
import ResumePreview, { type Patch } from "./components/ResumePreview";
import ProfileManager from "./components/ProfileManager";
import Wizard from "./components/Wizard";
import Catalogue from "./components/Catalogue";
import "./resume-preview.css";

const DEFAULT_MODEL = GEMINI_MODELS.find((m) => m.name === "gemini-3-flash-preview")?.name ?? GEMINI_MODELS[0].name;

const emptyWizard: WizardState = { jobDescription: "", step: 0, raw: {}, tweaks: {} };

export default function ResumeBuilderPage() {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile>(seedProfile());
  const [projects, setProjects] = useState<ResumeProject[]>([]);
  const [draft, setDraftState] = useState<ResumeDraft>(() => draftFromProfile(seedProfile(), []));
  const [wizard, setWizardState] = useState<WizardState>(emptyWizard);

  // The catalogue entry the draft on screen came from, if any.
  const [openEntry, setOpenEntryState] = useState<CatalogueSummary | null>(null);
  // Set when the preview toolbar asks the Catalogue tab to open its save dialog.
  const [pendingSave, setPendingSave] = useState(false);

  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<"profile" | "generate" | "catalogue">("generate");

  // Key lives server-side only; ask the API whether it's configured.
  const [apiKeySet, setApiKeySet] = useState(false);
  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => setApiKeySet(Boolean(d.configured)))
      .catch(() => setApiKeySet(false));
  }, []);

  // ---- Load from IndexedDB (seed on first run) ----
  useEffect(() => {
    (async () => {
      let p = await store.getProfile();
      let projs = await store.listProjects();
      let d = await store.getDraft();
      const w = await store.getWizard();
      const entry = await store.getOpenEntry();
      const seeded = await store.getSeeded();

      // The examples are a first-run convenience only. Once they have been
      // offered, an empty profile or project list is a deliberate state — most
      // likely a reset — so nothing is put back.
      if (!p && !seeded) {
        p = seedProfile();
        await store.setProfile(p);
      }
      if (projs.length === 0 && !seeded) {
        projs = seedProjects();
        await store.bulkPutProjects(projs);
      }
      if (!p) p = emptyProfile();
      if (!seeded) await store.setSeeded();
      if (!d) {
        d = draftFromProfile(p, projs);
        await store.setDraft(d);
      }

      // The header now reads identity from the profile. Older drafts may hold
      // basics the user typed inline before this change — pull any value the
      // profile is missing back in so nothing they entered disappears.
      let basicsChanged = false;
      (Object.keys(p.basics) as (keyof Profile["basics"])[]).forEach((k) => {
        if (!p!.basics[k] && d!.basics[k]) {
          p!.basics[k] = d!.basics[k];
          basicsChanged = true;
        }
      });
      if (basicsChanged) await store.setProfile(p);

      setProfileState(p);
      setProjects(projs);
      setDraftState(d);
      // Wizards saved before per-step tweaks existed have no `tweaks` — the steps
      // reseed them from the cached AI responses on first render.
      if (w) setWizardState({ ...emptyWizard, ...w, tweaks: w.tweaks ?? {} });
      setOpenEntryState(entry);
      setReady(true);
    })();
  }, []);

  // ---- Persist on change (after initial load) ----
  useEffect(() => {
    if (ready) store.setProfile(profile);
  }, [profile, ready]);
  useEffect(() => {
    if (ready) store.setDraft(draft);
  }, [draft, ready]);
  useEffect(() => {
    if (ready) store.setWizard(wizard);
  }, [wizard, ready]);
  useEffect(() => {
    if (ready) store.setOpenEntry(openEntry);
  }, [openEntry, ready]);

  // ---- Mutators ----
  const patch: Patch = useCallback((recipe) => {
    setDraftState((prev) => {
      const next = structuredClone(prev);
      recipe(next);
      return next;
    });
  }, []);

  // Basics = identity. They live on the profile so the header reflects whatever
  // was entered in "My Profile", and inline header edits persist to the profile.
  const patchBasics = useCallback((recipe: (b: Profile["basics"]) => void) => {
    setProfileState((prev) => {
      const next = structuredClone(prev);
      recipe(next.basics);
      return next;
    });
  }, []);

  const updateWizard = useCallback((recipe: (w: WizardState) => void) => {
    setWizardState((prev) => {
      const next = structuredClone(prev);
      recipe(next);
      return next;
    });
  }, []);

  // The preview renders the draft, never the profile. While the draft still has
  // nothing in it — a fresh reset, or a first-ever visit — profile edits flow
  // straight through, so building from scratch shows up immediately instead of
  // waiting for an explicit "reset draft". Once the draft holds anything, it is
  // the user's document and is left alone.
  const syncEmptyDraft = useCallback((p: Profile, ps: ResumeProject[]) => {
    setDraftState((prev) => (isEmptyDraft(prev) ? draftFromProfile(p, ps) : prev));
  }, []);

  const onProfileChange = useCallback(
    (p: Profile) => {
      setProfileState(p);
      syncEmptyDraft(p, projects);
    },
    [projects, syncEmptyDraft]
  );

  const onSaveProject = useCallback(
    (p: ResumeProject) => {
      const i = projects.findIndex((x) => x.id === p.id);
      let next: ResumeProject[];
      if (i === -1) {
        // New projects land at the top for faster editing.
        next = [{ ...p, order: (projects[0]?.order ?? 1) - 1 }, ...projects];
        store.putProject(next[0]);
      } else {
        next = [...projects];
        next[i] = { ...p, order: projects[i].order ?? i };
        store.putProject(next[i]);
      }
      setProjects(next);
      syncEmptyDraft(profile, next);
    },
    [profile, projects, syncEmptyDraft]
  );

  const onDeleteProject = useCallback((id: string) => {
    store.deleteProject(id);
    setProjects((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const onReorderProjects = useCallback((ids: string[]) => {
    setProjects((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      const next: ResumeProject[] = [];
      ids.forEach((id, order) => {
        const p = byId.get(id);
        if (p) next.push({ ...p, order });
      });
      prev.forEach((p) => {
        if (!ids.includes(p.id)) next.push({ ...p, order: next.length });
      });
      store.bulkPutProjects(next);
      return next;
    });
  }, []);

  // An import is a restore, not a merge: the file's projects become the whole
  // list, so importing into a populated profile can't leave strays behind. The
  // draft is rebuilt in the same pass — the preview reads the draft, so without
  // this an import would show as a header with an empty page under it.
  const onImportProfile = useCallback(
    async (imported: Profile | null, ps: ResumeProject[]) => {
      const nextProfile = imported ? structuredClone(imported) : profile;
      await store.clearProjects();
      await store.bulkPutProjects(ps.map((p, i) => ({ ...p, order: p.order ?? i })));
      const nextProjects = await store.listProjects();

      setProfileState(nextProfile);
      setProjects(nextProjects);
      setDraftState(draftFromProfile(nextProfile, nextProjects));
    },
    [profile]
  );

  // Wipes everything held locally for this tool. The catalogue is untouched —
  // those resumes live on the account, not in this browser.
  const onResetProfile = useCallback(async () => {
    const blank = emptyProfile();
    await store.clearProjects();
    await store.setSeeded();
    setProfileState(blank);
    setProjects([]);
    setDraftState(draftFromProfile(blank, []));
    setWizardState(emptyWizard);
    setOpenEntryState(null);
  }, []);

  // Opening a catalogue entry replaces the resume on screen and the wizard run
  // behind it. Basics stay on the profile — they are the same person either way.
  const onOpenEntry = useCallback((entry: CatalogueEntry) => {
    setDraftState(structuredClone(entry.snapshot.draft));
    setWizardState({ ...emptyWizard, ...entry.snapshot.wizard, tweaks: entry.snapshot.wizard.tweaks ?? {} });
    const { snapshot: _snapshot, ...summary } = entry;
    setOpenEntryState(summary);
  }, []);

  const resetDraft = () => {
    if (!confirm("Reset the resume draft to your profile + all saved projects? Inline edits will be lost.")) return;
    setDraftState(draftFromProfile(profile, projects));
  };

  const saveDraftToProfile = () => {
    if (!confirm("Copy the current resume (summary, skills, experience, certs, education) back into your profile?")) return;
    setProfileState((prev) => ({
      ...prev,
      // basics are edited directly on the profile via the header, so they are
      // already current — don't overwrite them with the draft's stale copy.
      summary: draft.summary,
      skills: draft.skills.map((s) => ({ category: s.category, items: [...s.items] })),
      experience: prev.experience.map((job) => {
        const dj = draft.experience.find((x) => x.id === job.id);
        return dj ? { ...job, bullets: [...dj.bullets], title: dj.title, company: dj.company, location: dj.location, start: dj.start, end: dj.end } : job;
      }),
      certifications: draft.certifications.map((c) => ({ ...c })),
      education: draft.education.map((e) => ({ ...e })),
    }));
  };

  return (
    <div className="rb-root min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col">
      {/* ===== Top bar ===== */}
      <header className="rb-no-print border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="px-3 sm:px-5 py-2.5 flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Hub
          </Link>
          <div className="flex items-center gap-2 font-semibold">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal-500 to-cyan-500 p-1.5">
              <FileText className="w-full h-full text-white" />
            </div>
            <span className="hidden sm:inline">Resume Builder</span>
          </div>

          <div className="flex-1" />

          {/* API key status */}
          <span className={`hidden md:flex items-center gap-1 text-xs ${apiKeySet ? "text-green-600" : "text-destructive"}`}>
            {apiKeySet ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            API key
          </span>

          {/* Model selector */}
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GEMINI_MODELS.map((m) => (
                <SelectItem key={m.name} value={m.name} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Export PDF
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* ===== Two panes ===== */}
      <div className="rb-main flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: editor */}
        <div className="rb-no-print lg:w-[45%] lg:max-w-[640px] border-b lg:border-b-0 lg:border-r overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <Button variant={tab === "generate" ? "default" : "outline"} size="sm" onClick={() => setTab("generate")}>
                Generate
              </Button>
              <Button variant={tab === "profile" ? "default" : "outline"} size="sm" onClick={() => setTab("profile")}>
                My Profile
              </Button>
              <Button variant={tab === "catalogue" ? "default" : "outline"} size="sm" onClick={() => setTab("catalogue")}>
                Catalogue
              </Button>
            </div>

            {tab === "generate" ? (
              <Wizard
                profile={profile}
                projects={projects}
                draft={draft}
                patch={patch}
                model={model}
                wizard={wizard}
                updateWizard={updateWizard}
                onSaveProfile={onProfileChange}
              />
            ) : tab === "catalogue" ? (
              <Catalogue
                profile={profile}
                draft={draft}
                wizard={wizard}
                openEntry={openEntry}
                onOpenEntry={onOpenEntry}
                onCloseEntry={() => setOpenEntryState(null)}
                onEntryUpdated={setOpenEntryState}
                pendingSave={pendingSave}
                onPendingSaveHandled={() => setPendingSave(false)}
              />
            ) : (
              <ProfileManager
                profile={profile}
                onProfileChange={onProfileChange}
                projects={projects}
                onSaveProject={onSaveProject}
                onDeleteProject={onDeleteProject}
                onReorderProjects={onReorderProjects}
                onImportProfile={onImportProfile}
                onResetProfile={onResetProfile}
              />
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="rb-preview-pane flex-1 bg-[#e9eaee] dark:bg-neutral-900 overflow-auto">
          {/* preview toolbar */}
          <div className="rb-no-print sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 bg-background/70 backdrop-blur border-b text-xs">
            <span className="text-muted-foreground">Preview</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => {
                setTab("catalogue");
                setPendingSave(true);
              }}
              title="Save this resume to your catalogue"
            >
              <Archive className="w-3.5 h-3.5 mr-1" /> Catalogue
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={saveDraftToProfile} title="Copy resume back to profile">
              <Save className="w-3.5 h-3.5 mr-1" /> Save → profile
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={resetDraft} title="Reset draft from profile">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.05).toFixed(2)))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.05).toFixed(2)))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="rb-preview-center flex justify-center py-6">
            <div className="resume-scale-wrap" style={{ zoom }}>
              <ResumePreview draft={draft} patch={patch} basics={profile.basics} patchBasics={patchBasics} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
