"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Download,
  Upload,
  FileDown,
  FolderOpen,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CatalogueError,
  buildSnapshot,
  createCatalogueEntry,
  deleteCatalogueEntry,
  downloadEntryJson,
  getCatalogueEntry,
  listCatalogue,
  parseEntryJson,
  updateCatalogueEntry,
} from "@/lib/resume/catalogue";
import type {
  CatalogueEntry,
  CatalogueMeta,
  CatalogueSummary,
  Profile,
  ResumeDraft,
  WizardState,
} from "@/lib/resume/types";

const SIGN_IN_HREF = "/login?redirect=/tools/resume-builder";

/** <input type="datetime-local"> wants local wall-clock time, not an ISO string. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : new Date().toISOString());

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

type FormState = CatalogueMeta & { appliedAtLocal: string };

// "new" saves the resume on screen; "copy" saves it as a second entry while one
// is already open; "meta" edits an existing entry's details without touching its
// stored resume; "import" creates an entry from an exported JSON file.
type DialogMode = "new" | "copy" | "meta" | "import";

interface Props {
  profile: Profile;
  draft: ResumeDraft;
  wizard: WizardState;
  openEntry: CatalogueSummary | null;
  onOpenEntry: (entry: CatalogueEntry) => void;
  onCloseEntry: () => void;
  onEntryUpdated: (entry: CatalogueSummary) => void;
  /** Set by the preview toolbar's Catalogue button to pop the save dialog open. */
  pendingSave: boolean;
  onPendingSaveHandled: () => void;
}

export default function Catalogue({
  profile,
  draft,
  wizard,
  openEntry,
  onOpenEntry,
  onCloseEntry,
  onEntryUpdated,
  pendingSave,
  onPendingSaveHandled,
}: Props) {
  const [entries, setEntries] = useState<CatalogueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [dialog, setDialog] = useState<{ mode: DialogMode; entryId?: string; form: FormState } | null>(() =>
    pendingSave
      ? {
          mode: openEntry ? "copy" : "new",
          form: {
            resumeTitle: "",
            company: "",
            jobTitle: "",
            jobDescription: wizard.jobDescription,
            note: "",
            appliedAt: new Date().toISOString(),
            appliedAtLocal: toLocalInput(new Date().toISOString()),
          },
        }
      : null
  );
  const importedSnapshot = useRef<CatalogueEntry["snapshot"] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof CatalogueError && err.unauthorized) {
      setNeedsSignIn(true);
      setError("");
      return;
    }
    setError(err instanceof Error ? err.message : "Something went wrong.");
  }, []);

  const received = useCallback(
    (list: CatalogueSummary[]) => {
      setEntries(list);
      setNeedsSignIn(false);
      setError("");
    },
    []
  );

  const refresh = useCallback(() => {
    setLoading(true);
    listCatalogue().then(received).catch(handleError).finally(() => setLoading(false));
  }, [handleError, received]);

  useEffect(() => {
    listCatalogue().then(received).catch(handleError).finally(() => setLoading(false));
  }, [handleError, received]);

  const blankForm = useCallback(
    (): FormState => ({
      resumeTitle: "",
      company: "",
      jobTitle: "",
      jobDescription: wizard.jobDescription,
      note: "",
      appliedAt: new Date().toISOString(),
      appliedAtLocal: toLocalInput(new Date().toISOString()),
    }),
    [wizard.jobDescription]
  );

  // Saving from the preview toolbar switches to this tab, which mounts this
  // component — so the request arrives as a flag on the first render, and is
  // acknowledged once so returning to the tab later doesn't reopen the dialog.
  useEffect(() => {
    if (pendingSave) onPendingSaveHandled();
  }, [pendingSave, onPendingSaveHandled]);

  const openSaveDialog = useCallback(() => {
    if (needsSignIn) return;
    // Re-saving the resume that is already open updates it in place, so the
    // dialog offers a second entry rather than overwriting.
    setDialog({ mode: openEntry ? "copy" : "new", form: blankForm() });
  }, [blankForm, needsSignIn, openEntry]);

  const setField = (patch: Partial<FormState>) =>
    setDialog((d) => (d ? { ...d, form: { ...d.form, ...patch } } : d));

  const metaFromForm = (f: FormState): CatalogueMeta => ({
    resumeTitle: f.resumeTitle.trim(),
    company: f.company.trim(),
    jobTitle: f.jobTitle.trim(),
    jobDescription: f.jobDescription,
    note: f.note,
    appliedAt: fromLocalInput(f.appliedAtLocal),
  });

  const submitDialog = async () => {
    if (!dialog) return;
    const meta = metaFromForm(dialog.form);
    if (!meta.resumeTitle) {
      setError("Give this resume a title so you can find it later.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (dialog.mode === "meta" && dialog.entryId) {
        const updated = await updateCatalogueEntry(dialog.entryId, meta);
        setEntries((prev) => prev.map((e) => (e.id === updated.id ? stripSnapshot(updated) : e)));
        if (openEntry?.id === updated.id) onEntryUpdated(stripSnapshot(updated));
      } else {
        const snapshot =
          dialog.mode === "import" && importedSnapshot.current
            ? importedSnapshot.current
            : buildSnapshot(profile, draft, wizard);
        const created = await createCatalogueEntry(meta, snapshot);
        setEntries((prev) => [stripSnapshot(created), ...prev]);
        // Saving the resume on screen makes that entry the one being edited;
        // an imported file is filed away without disturbing the current work.
        if (dialog.mode !== "import") onEntryUpdated(stripSnapshot(created));
      }
      importedSnapshot.current = null;
      setDialog(null);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  /** Writes the resume on screen over the entry that is currently open. */
  const updateOpenEntry = async () => {
    if (!openEntry) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateCatalogueEntry(
        openEntry.id,
        {
          resumeTitle: openEntry.resumeTitle,
          company: openEntry.company,
          jobTitle: openEntry.jobTitle,
          jobDescription: openEntry.jobDescription,
          note: openEntry.note,
          appliedAt: openEntry.appliedAt,
        },
        buildSnapshot(profile, draft, wizard)
      );
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? stripSnapshot(updated) : e)));
      onEntryUpdated(stripSnapshot(updated));
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const open = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      onOpenEntry(await getCatalogueEntry(id));
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const download = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      downloadEntryJson(await getCatalogueEntry(id));
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (entry: CatalogueSummary) => {
    if (!confirm(`Delete “${entry.resumeTitle}”? This cannot be undone.`)) return;
    setBusyId(entry.id);
    setError("");
    try {
      await deleteCatalogueEntry(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      if (openEntry?.id === entry.id) onCloseEntry();
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const importFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { meta, snapshot } = parseEntryJson(String(reader.result));
        importedSnapshot.current = snapshot;
        setError("");
        setDialog({
          mode: "import",
          form: { ...meta, appliedAtLocal: toLocalInput(meta.appliedAt) },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that file.");
      }
    };
    reader.readAsText(file);
  };

  if (needsSignIn) {
    return (
      <div className="rounded-lg border bg-background/50 p-6 text-center">
        <Archive className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Sign in to use the catalogue</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Saved resumes belong to your account, so the catalogue keeps every version you sent — which company, which
          role, when, and your notes — across devices.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href={SIGN_IN_HREF}>
            <LogIn className="mr-1.5 h-4 w-4" /> Sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={openSaveDialog}>
          <Plus className="mr-1.5 h-4 w-4" /> Save current resume
        </Button>
        {openEntry && (
          <Button size="sm" variant="secondary" disabled={saving} onClick={updateOpenEntry}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            Update open entry
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <FileDown className="mr-1.5 h-4 w-4" /> Import JSON
        </Button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importFile} className="hidden" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {openEntry && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
          <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              Editing “{openEntry.resumeTitle}”
              {subtitleOf(openEntry) && <span className="font-normal text-muted-foreground"> · {subtitleOf(openEntry)}</span>}
            </p>
            <p className="text-muted-foreground">
              Edits go to the preview only until you press <strong>Update open entry</strong>. Use{" "}
              <strong>Export PDF</strong> in the top bar to download it.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCloseEntry} title="Stop editing this entry">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {loading && entries.length === 0 ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your catalogue…
        </p>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">No saved resumes yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Generate a resume for a job, then save it here with the company, role, job description and a note. The next
            generation starts fresh without overwriting it.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const busy = busyId === entry.id;
            return (
              <li
                key={entry.id}
                className={`rounded-lg border p-3 ${openEntry?.id === entry.id ? "border-primary/50 bg-primary/5" : "bg-background/50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{entry.resumeTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {subtitleOf(entry) && `${subtitleOf(entry)} · `}sent {formatDate(entry.appliedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => open(entry.id)} title="Load this resume into the editor">
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                      <span className="ml-1.5">Open</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit details"
                      onClick={() =>
                        setDialog({
                          mode: "meta",
                          entryId: entry.id,
                          form: { ...entry, appliedAtLocal: toLocalInput(entry.appliedAt) },
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy} title="Download as JSON" onClick={() => download(entry.id)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      disabled={busy}
                      title="Delete"
                      onClick={() => remove(entry)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {entry.note && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{entry.note}</p>}

                {entry.jobDescription && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Job description
                    </summary>
                    <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border bg-muted/40 p-2 text-xs">
                      {entry.jobDescription}
                    </p>
                  </details>
                )}

                <p className="mt-2 text-[11px] text-muted-foreground">
                  Saved {formatDate(entry.createdAt)}
                  {entry.updatedAt !== entry.createdAt && ` · updated ${formatDate(entry.updatedAt)}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null);
            importedSnapshot.current = null;
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "meta"
                ? "Edit details"
                : dialog?.mode === "import"
                  ? "Import resume"
                  : dialog?.mode === "copy"
                    ? "Save as a new entry"
                    : "Save resume to catalogue"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.mode === "meta"
                ? "Only the details change — the saved resume itself stays as it is."
                : "The resume currently in the preview is stored with these details."}
            </DialogDescription>
          </DialogHeader>

          {dialog && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cat-resume-title">Resume title</Label>
                <Input
                  id="cat-resume-title"
                  value={dialog.form.resumeTitle}
                  onChange={(e) => setField({ resumeTitle: e.target.value })}
                  placeholder="Frontend — React heavy, metrics-led"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="cat-company">Company (optional)</Label>
                  <Input
                    id="cat-company"
                    value={dialog.form.company}
                    onChange={(e) => setField({ company: e.target.value })}
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cat-title">Job title (optional)</Label>
                  <Input
                    id="cat-title"
                    value={dialog.form.jobTitle}
                    onChange={(e) => setField({ jobTitle: e.target.value })}
                    placeholder="Senior Frontend Engineer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cat-date">Sent on</Label>
                <Input
                  id="cat-date"
                  type="datetime-local"
                  value={dialog.form.appliedAtLocal}
                  onChange={(e) => setField({ appliedAtLocal: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cat-note">Note (optional)</Label>
                <Textarea
                  id="cat-note"
                  rows={3}
                  value={dialog.form.note}
                  onChange={(e) => setField({ note: e.target.value })}
                  placeholder="Referred by Sam · asked for a portfolio link · follow up in two weeks"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cat-jd">Job description (optional)</Label>
                <Textarea
                  id="cat-jd"
                  rows={5}
                  value={dialog.form.jobDescription}
                  onChange={(e) => setField({ jobDescription: e.target.value })}
                  placeholder="Prefilled from the wizard — edit or paste the posting you applied to."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialog(null)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitDialog} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {dialog?.mode === "meta" ? "Save details" : "Save to catalogue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** "Job title at Company" — either half may be missing, so build it defensively. */
const subtitleOf = (entry: CatalogueSummary) =>
  [entry.jobTitle, entry.company].filter(Boolean).join(" at ");

const stripSnapshot = (entry: CatalogueEntry): CatalogueSummary => {
  const { snapshot: _snapshot, ...summary } = entry;
  return summary;
};
