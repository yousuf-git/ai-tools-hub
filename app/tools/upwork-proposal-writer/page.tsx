"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, PenTool, Loader2, Copy, CheckCircle, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Search, Settings, Plus, Trash2, ExternalLink, FolderOpen, X, Download, Upload, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GEMINI_MODELS } from "@/lib/gemini";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ProposalVersion {
  id: number;
  content: string;
  timestamp: Date;
  improvisationNotes?: string;
}

interface SavedProject {
  id: string;
  title: string;
  description: string;
  url: string;
}

const PROJECTS_STORAGE_KEY = "upwork-proposal-writer-projects";

function loadProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: SavedProject[]) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export default function UpworkProposalWriter() {
  // Version control
  const [proposalVersion, setProposalVersion] = useState<"v1" | "v2">("v2");
  
  // Common fields
  const [jobDescription, setJobDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [preferredModel, setPreferredModel] = useState<string>(
    GEMINI_MODELS.find(m => m.name === 'gemini-3-flash-preview')?.name ?? GEMINI_MODELS[0].name
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  // V2 specific fields
  const [clientName, setClientName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [budgetType, setBudgetType] = useState<"fixed" | "hourly" | "unknown">("unknown");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [hourlyMin, setHourlyMin] = useState("");
  const [hourlyMax, setHourlyMax] = useState("");
  const [clientExperience, setClientExperience] = useState<"naive" | "experienced" | "unknown">("unknown");
  const [immediateAvailability, setImmediateAvailability] = useState(false);
  const [experienceRequired, setExperienceRequired] = useState("");
  const [startWord, setStartWord] = useState("");
  const [relevantProject, setRelevantProject] = useState("");
  const [relevantWorkLink, setRelevantWorkLink] = useState("");
  const [freelancerName, setFreelancerName] = useState("");
  
  // Version management
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(-1);
  
  // Improvisation
  const [showImprovisation, setShowImprovisation] = useState(false);
  const [improvisationNotes, setImprovisationNotes] = useState("");
  const [isRevising, setIsRevising] = useState(false);

  // Manual Editor
  const [manualEdit, setManualEdit] = useState("");
  const [editorCopied, setEditorCopied] = useState(false);

  // Projects management
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [editingProject, setEditingProject] = useState<SavedProject | null>(null);
  const [projectForm, setProjectForm] = useState({ title: "", description: "", url: "" });

  // Load projects and freelancer name from localStorage on mount
  useEffect(() => {
    setSavedProjects(loadProjects());
    const savedName = localStorage.getItem("upwork-freelancer-name");
    if (savedName) setFreelancerName(savedName);
  }, []);

  // Sync selected projects to relevant fields
  const syncProjectsToFields = useCallback((projectIds: string[], projects: SavedProject[]) => {
    const selected = projects.filter(p => projectIds.includes(p.id));
    if (selected.length === 0) {
      setRelevantProject("");
      setRelevantWorkLink("");
      return;
    }
    const descriptions = selected.map(p => `${p.title}: ${p.description}`).join("\n\n");
    const links = selected.map(p => p.url).filter(Boolean).join(", ");
    setRelevantProject(descriptions);
    setRelevantWorkLink(links);
  }, []);

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      syncProjectsToFields(next, savedProjects);
      return next;
    });
  };

  const handleSaveProject = () => {
    if (!projectForm.title.trim()) return;
    let updated: SavedProject[];
    if (editingProject) {
      updated = savedProjects.map(p =>
        p.id === editingProject.id
          ? { ...p, title: projectForm.title.trim(), description: projectForm.description.trim(), url: projectForm.url.trim() }
          : p
      );
    } else {
      const newProject: SavedProject = {
        id: crypto.randomUUID(),
        title: projectForm.title.trim(),
        description: projectForm.description.trim(),
        url: projectForm.url.trim(),
      };
      updated = [...savedProjects, newProject];
    }
    setSavedProjects(updated);
    saveProjects(updated);
    setEditingProject(null);
    setProjectForm({ title: "", description: "", url: "" });
  };

  const handleEditProject = (project: SavedProject) => {
    setEditingProject(project);
    setProjectForm({ title: project.title, description: project.description, url: project.url });
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = savedProjects.filter(p => p.id !== projectId);
    setSavedProjects(updated);
    saveProjects(updated);
    setSelectedProjectIds(prev => prev.filter(id => id !== projectId));
  };

  const handleCancelProjectEdit = () => {
    setEditingProject(null);
    setProjectForm({ title: "", description: "", url: "" });
  };

  const currentProposal = currentVersionIndex >= 0 ? versions[currentVersionIndex]?.content : "";

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const requestBody: any = {
        jobDescription: jobDescription.trim(),
        additionalDetails: additionalDetails.trim(),
        preferredModel,
        proposalVersion,
      };
      
      // Add v2 specific fields
      if (proposalVersion === "v2") {
        // Save freelancer name for future sessions
        if (freelancerName.trim()) {
          localStorage.setItem("upwork-freelancer-name", freelancerName.trim());
        }
        requestBody.v2Fields = {
          clientName: clientName.trim(),
          jobTitle: jobTitle.trim(),
          budgetType,
          budgetAmount: budgetAmount.trim(),
          hourlyMin: hourlyMin.trim(),
          hourlyMax: hourlyMax.trim(),
          clientExperience,
          immediateAvailability,
          experienceRequired: experienceRequired.trim(),
          startWord: startWord.trim(),
          relevantProject: relevantProject.trim(),
          relevantWorkLink: relevantWorkLink.trim(),
          freelancerName: freelancerName.trim(),
        };
      }

      const response = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate proposal');
      }

      const result = await response.json();

      // Add new version
      const newVersion: ProposalVersion = {
        id: versions.length + 1,
        content: result.proposal,
        timestamp: new Date(),
      };

      setVersions([...versions, newVersion]);
      setCurrentVersionIndex(versions.length);
      setShowImprovisation(false);
      setImprovisationNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while generating the proposal.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImprovise = async () => {
    if (!improvisationNotes.trim()) {
      setError("Please enter improvisation notes.");
      return;
    }

    if (currentVersionIndex < 0) {
      setError("Generate a proposal first before improvising.");
      return;
    }

    setIsRevising(true);
    setError("");

    try {
      const requestBody: any = {
        jobDescription: jobDescription.trim(),
        additionalDetails: additionalDetails.trim(),
        preferredModel,
        previousProposal: currentProposal,
        improvisationNotes: improvisationNotes.trim(),
        isRevision: true,
        proposalVersion,
      };
      
      // Add v2 specific fields
      if (proposalVersion === "v2") {
        requestBody.v2Fields = {
          clientName: clientName.trim(),
          jobTitle: jobTitle.trim(),
          budgetType,
          budgetAmount: budgetAmount.trim(),
          hourlyMin: hourlyMin.trim(),
          hourlyMax: hourlyMax.trim(),
          clientExperience,
          immediateAvailability,
          experienceRequired: experienceRequired.trim(),
          startWord: startWord.trim(),
          relevantProject: relevantProject.trim(),
          relevantWorkLink: relevantWorkLink.trim(),
          freelancerName: freelancerName.trim(),
        };
      }

      const response = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate revised proposal');
      }

      const result = await response.json();
      
      // Add new version with improvisation notes
      const newVersion: ProposalVersion = {
        id: versions.length + 1,
        content: result.proposal,
        timestamp: new Date(),
        improvisationNotes: improvisationNotes.trim(),
      };
      
      setVersions([...versions, newVersion]);
      setCurrentVersionIndex(versions.length);
      setShowImprovisation(false);
      setImprovisationNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while revising the proposal.");
      console.error(err);
    } finally {
      setIsRevising(false);
    }
  };

  const navigateVersion = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentVersionIndex > 0) {
      setCurrentVersionIndex(currentVersionIndex - 1);
    } else if (direction === 'next' && currentVersionIndex < versions.length - 1) {
      setCurrentVersionIndex(currentVersionIndex + 1);
    }
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentProposal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReset = () => {
    setJobDescription("");
    setAdditionalDetails("");
    setVersions([]);
    setCurrentVersionIndex(-1);
    setError("");
    setCopied(false);
    setShowImprovisation(false);
    setImprovisationNotes("");
    setManualEdit("");
    setEditorCopied(false);
  };

  const handleLoadToEditor = () => {
    if (currentProposal) {
      setManualEdit(currentProposal);
    }
  };

  const handleCopyFromEditor = async () => {
    try {
      await navigator.clipboard.writeText(manualEdit);
      setEditorCopied(true);
      setTimeout(() => setEditorCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy from editor:', err);
    }
  };

  const handleClearEditor = () => {
    setManualEdit("");
    setEditorCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center">
        <Link href="/">
          <Button variant="ghost" className="gap-1 sm:gap-2 text-sm sm:text-base px-2 sm:px-4">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Back to</span> Home
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Projects</span>
          </Button>
          <Link href="/tools/upwork-proposal-examiner">
            <Button variant="outline" size="sm" className="gap-2">
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Proposal Examiner</span>
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <PenTool className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
              Upwork Proposal Writer
            </h1>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            Generate professional, concise, and effective Upwork proposals tailored to job descriptions.
            AI-powered writing that sounds natural and human.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Input Details</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Provide the job description and any additional context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5">
                {/* Version Toggle */}
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Proposal Version</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={proposalVersion === "v1" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProposalVersion("v1")}
                      className="flex-1"
                    >
                      V1 (Simple)
                    </Button>
                    <Button
                      type="button"
                      variant={proposalVersion === "v2" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProposalVersion("v2")}
                      className="flex-1"
                    >
                      V2 (Advanced)
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {proposalVersion === "v1" ? "Quick and simple proposal generation" : "Structured, high-converting proposals with custom inputs"}
                  </p>
                </div>
                {/* Job Description */}
                <div className="space-y-2">
                  <Label htmlFor="job-description" className="text-sm sm:text-base flex items-center gap-2">
                    Job Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="job-description"
                    placeholder="Paste the Upwork job description here..."
                    rows={8}
                    className="text-xs sm:text-sm resize-none"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Copy the full job description from Upwork
                  </p>
                </div>

                {/* V2 Specific Fields */}
                {proposalVersion === "v2" && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium text-primary">Advanced Options</p>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Client Name */}
                      <div className="space-y-2">
                        <Label htmlFor="client-name" className="text-xs sm:text-sm">Client Name</Label>
                        <Input
                          id="client-name"
                          placeholder="e.g., John"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      {/* Freelancer Name */}
                      <div className="space-y-2">
                        <Label htmlFor="freelancer-name" className="text-xs sm:text-sm">Your Name (Signature)</Label>
                        <Input
                          id="freelancer-name"
                          placeholder="e.g., M. Yousuf"
                          value={freelancerName}
                          onChange={(e) => setFreelancerName(e.target.value)}
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      {/* Your Role */}
                      <div className="space-y-2">
                        <Label htmlFor="job-title" className="text-xs sm:text-sm">Your Role</Label>
                        <Input
                          id="job-title"
                          placeholder="e.g., Full Stack Developer"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          className="text-xs sm:text-sm"
                        />
                      </div>

                      {/* Client Experience */}
                      <div className="space-y-2">
                        <Label htmlFor="client-exp" className="text-xs sm:text-sm">Client Experience</Label>
                        <Select value={clientExperience} onValueChange={(v: any) => setClientExperience(v)}>
                          <SelectTrigger className="text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unknown">Unknown</SelectItem>
                            <SelectItem value="naive">Naive/New</SelectItem>
                            <SelectItem value="experienced">Experienced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Budget Section */}
                    <div className="space-y-3">
                      <Label className="text-xs sm:text-sm">Client Budget</Label>
                      <div className="flex gap-2">
                        {(["unknown", "fixed", "hourly"] as const).map((type) => (
                          <Button
                            key={type}
                            type="button"
                            variant={budgetType === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setBudgetType(type)}
                            className="flex-1 text-xs"
                          >
                            {type === "unknown" ? "Unknown" : type === "fixed" ? "Fixed" : "Hourly"}
                          </Button>
                        ))}
                      </div>
                      {budgetType === "fixed" && (
                        <Input
                          placeholder="Fixed budget amount (e.g., 500)"
                          value={budgetAmount}
                          onChange={(e) => setBudgetAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                          className="text-xs sm:text-sm"
                          type="text"
                          inputMode="decimal"
                        />
                      )}
                      {budgetType === "hourly" && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Min $/hr (e.g., 15)"
                            value={hourlyMin}
                            onChange={(e) => setHourlyMin(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="text-xs sm:text-sm"
                            type="text"
                            inputMode="decimal"
                          />
                          <Input
                            placeholder="Max $/hr (e.g., 40)"
                            value={hourlyMax}
                            onChange={(e) => setHourlyMax(e.target.value.replace(/[^0-9.]/g, ''))}
                            className="text-xs sm:text-sm"
                            type="text"
                            inputMode="decimal"
                          />
                        </div>
                      )}
                    </div>

                    {/* Hourly Rate Suggestion */}
                    {budgetType === "hourly" && hourlyMin && hourlyMax && (
                      <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          <p className="text-xs font-medium text-green-700 dark:text-green-400">Suggested Bid Rate</p>
                        </div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                          ${Math.round((parseFloat(hourlyMin) + parseFloat(hourlyMax)) * 0.45)}&ndash;${Math.round((parseFloat(hourlyMin) + parseFloat(hourlyMax)) * 0.55)}/hr
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on the midpoint of ${hourlyMin}&ndash;${hourlyMax}/hr range. Adjust based on complexity and your experience.
                        </p>
                      </div>
                    )}

                    {/* Experience Required */}
                    <div className="space-y-2">
                      <Label htmlFor="exp-required" className="text-xs sm:text-sm">Experience Level Required</Label>
                      <Input
                        id="exp-required"
                        placeholder="e.g., expert, senior (leave empty if not specified)"
                        value={experienceRequired}
                        onChange={(e) => setExperienceRequired(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    {/* Saved Projects Selector */}
                    {savedProjects.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs sm:text-sm flex items-center gap-2">
                          <FolderOpen className="w-3 h-3" />
                          Select Relevant Projects
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {savedProjects.map(project => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => handleToggleProject(project.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                selectedProjectIds.includes(project.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted border-border"
                              }`}
                            >
                              {project.title}
                              {selectedProjectIds.includes(project.id) && (
                                <X className="w-3 h-3" />
                              )}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select projects to auto-fill fields below. Manage in Settings.
                        </p>
                      </div>
                    )}

                    {/* Relevant Project */}
                    <div className="space-y-2">
                      <Label htmlFor="relevant-project" className="text-xs sm:text-sm">Relevant Project Description</Label>
                      <Textarea
                        id="relevant-project"
                        placeholder="Brief description of relevant past work..."
                        rows={3}
                        value={relevantProject}
                        onChange={(e) => setRelevantProject(e.target.value)}
                        className="text-xs sm:text-sm resize-none"
                      />
                    </div>

                    {/* Work Link */}
                    <div className="space-y-2">
                      <Label htmlFor="work-link" className="text-xs sm:text-sm">Relevant Work Links</Label>
                      <Input
                        id="work-link"
                        placeholder="Portfolio or project URLs (comma-separated)"
                        value={relevantWorkLink}
                        onChange={(e) => setRelevantWorkLink(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    {/* Immediate Availability + Start Word row */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="immediate-availability"
                        checked={immediateAvailability}
                        onChange={(e) => setImmediateAvailability(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="immediate-availability" className="text-xs sm:text-sm cursor-pointer">
                        Immediate availability required
                      </Label>
                    </div>

                    {/* Start Word */}
                    <div className="space-y-2">
                      <Label htmlFor="start-word" className="text-xs sm:text-sm">Required Start Word</Label>
                      <Input
                        id="start-word"
                        placeholder="If job asks to start with specific word"
                        value={startWord}
                        onChange={(e) => setStartWord(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="space-y-2">
                  <Label htmlFor="additional-details" className="text-sm sm:text-base">
                    Additional Details <span className="text-xs text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="additional-details"
                    placeholder="Add any specific points, tone adjustments, or requirements..."
                    rows={4}
                    className="text-xs sm:text-sm resize-none"
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    E.g., &quot;Mention my 5 years experience in React&quot; or &quot;Keep it under 150 words&quot;
                  </p>
                </div>

                {/* Model Selector */}
                <div className="space-y-2">
                  <Label htmlFor="model-select" className="text-sm sm:text-base">AI Model</Label>
                  <Select value={preferredModel} onValueChange={setPreferredModel}>
                    <SelectTrigger className="w-full text-xs sm:text-sm">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {GEMINI_MODELS.map((model) => (
                        <SelectItem key={model.name} value={model.name}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-xs sm:text-sm">{model.label}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !jobDescription.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Proposal
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Output Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                      Generated Proposal
                      {versions.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          (v{currentVersionIndex + 1} of {versions.length})
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Your AI-generated Upwork proposal
                    </CardDescription>
                  </div>
                  {currentProposal && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-2"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                          <span className="hidden sm:inline">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {isGenerating || isRevising ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-center p-6"
                    >
                      {/* Animated Pen Writing */}
                      <div className="relative w-32 h-32 mb-6">
                        {/* Paper/Document Background */}
                        <motion.div
                          className="absolute inset-0 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/20"
                          animate={{
                            scale: [1, 1.02, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          {/* Writing Lines Animation */}
                          <div className="absolute inset-4 space-y-2">
                            {[0, 1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                className="h-1 bg-gradient-to-r from-green-500/40 to-emerald-500/40 rounded"
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{
                                  duration: 1.5,
                                  delay: i * 0.3,
                                  repeat: Infinity,
                                  repeatDelay: 0.5,
                                }}
                              />
                            ))}
                          </div>
                        </motion.div>

                        {/* Animated Pen */}
                        <motion.div
                          className="absolute -right-2 -top-2"
                          animate={{
                            rotate: [-15, -20, -15],
                            x: [0, 5, 0],
                            y: [0, 3, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <PenTool className="w-12 h-12 text-green-500 drop-shadow-lg" />
                          
                          {/* Sparkles around pen */}
                          <motion.div
                            className="absolute -top-1 -right-1"
                            animate={{
                              scale: [0, 1, 0],
                              opacity: [0, 1, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              repeatDelay: 0.5,
                            }}
                          >
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                          </motion.div>
                        </motion.div>
                      </div>

                      {/* Loading Text */}
                      <motion.div
                        animate={{
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <p className="text-base sm:text-lg font-medium text-foreground mb-2">
                          {isRevising ? "Crafting your revision..." : "Crafting your proposal..."}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          AI is writing a compelling proposal for you
                        </p>
                      </motion.div>

                      {/* Progress Dots */}
                      <div className="flex gap-2 mt-6">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-green-500"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.3, 1, 0.3],
                            }}
                            transition={{
                              duration: 1.5,
                              delay: i * 0.2,
                              repeat: Infinity,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ) : currentProposal ? (
                    <motion.div
                      key={`proposal-${currentVersionIndex}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-4"
                    >
                      {/* Version Navigation */}
                      {versions.length > 1 && (
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateVersion('prev')}
                            disabled={currentVersionIndex === 0}
                            className="gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Previous</span>
                          </Button>
                          
                          <div className="text-xs sm:text-sm font-medium text-center">
                            <div>Version {currentVersionIndex + 1}</div>
                            {versions[currentVersionIndex]?.improvisationNotes && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Revised
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateVersion('next')}
                            disabled={currentVersionIndex === versions.length - 1}
                            className="gap-1"
                          >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* Improvisation Notes Display */}
                      {versions[currentVersionIndex]?.improvisationNotes && (
                        <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/20">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                            📝 Improvement Notes:
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {versions[currentVersionIndex].improvisationNotes}
                          </p>
                        </div>
                      )}

                      {/* Proposal Content */}
                      <div className="p-4 sm:p-5 rounded-lg border bg-card min-h-[250px] sm:min-h-[300px]">
                        <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-foreground">
                          {currentProposal}
                        </pre>
                      </div>

                      {/* Improvisation Section */}
                      {!showImprovisation ? (
                        <Button
                          onClick={() => setShowImprovisation(true)}
                          variant="outline"
                          className="w-full"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Improvise / Revise This Version
                        </Button>
                      ) : (
                        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                          <Label htmlFor="improvisation-notes" className="text-sm font-medium">
                            What would you like to improve?
                          </Label>
                          <Textarea
                            id="improvisation-notes"
                            placeholder="E.g., &apos;Make it more technical&apos;, &apos;Add emphasis on my React expertise&apos;, &apos;Shorten to 150 words&apos;, &apos;Sound more enthusiastic&apos;..."
                            rows={4}
                            className="text-xs sm:text-sm resize-none"
                            value={improvisationNotes}
                            onChange={(e) => setImprovisationNotes(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleImprovise}
                              disabled={isRevising || !improvisationNotes.trim()}
                              className="flex-1"
                            >
                              {isRevising ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Revising...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Generate Revision
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowImprovisation(false);
                                setImprovisationNotes("");
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={handleCopy}
                          variant="default"
                          className="flex-1"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy to Clipboard
                        </Button>
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="flex-1"
                        >
                          Generate New Proposal
                        </Button>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        <p className="font-medium mb-1">💡 Tips:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>Review and personalize the proposal before sending</li>
                          <li>Use &quot;Improvise&quot; to refine specific aspects</li>
                          <li>Navigate between versions to compare improvements</li>
                        </ul>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] text-center p-6"
                    >
                      <PenTool className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30 mb-4" />
                      <p className="text-sm sm:text-base text-muted-foreground mb-2">
                        Your generated proposal will appear here
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enter a job description and click &quot;Generate Proposal&quot; to get started
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Manual Editor Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Manual Editor</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Load a version, edit manually, and copy your customized proposal
                  </CardDescription>
                </div>
                {currentProposal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadToEditor}
                    disabled={!currentProposal}
                  >
                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span className="hidden sm:inline">Load Current Version</span>
                    <span className="sm:hidden">Load</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Editor Textarea */}
              <div className="space-y-2">
                <Label htmlFor="manual-editor" className="text-sm sm:text-base">
                  Edit Your Proposal
                </Label>
                <Textarea
                  id="manual-editor"
                  placeholder="Load a proposal version from above or type your own proposal here..."
                  rows={12}
                  className="text-xs sm:text-sm font-sans resize-y min-h-[250px]"
                  value={manualEdit}
                  onChange={(e) => setManualEdit(e.target.value)}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{manualEdit.length} characters</span>
                  <span>{manualEdit.split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCopyFromEditor}
                  disabled={!manualEdit.trim()}
                  variant="default"
                  className="flex-1"
                >
                  {editorCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Edited Proposal
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleClearEditor}
                  disabled={!manualEdit}
                  variant="outline"
                  className="flex-1"
                >
                  Clear Editor
                </Button>
              </div>

              {/* Info Box */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  ℹ️ How to use:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Click &quot;Load Current Version&quot; to fetch the selected proposal</li>
                  <li>Edit the text directly in the editor</li>
                  <li>Add personal touches, portfolio links, or specific details</li>
                  <li>Click &quot;Copy Edited Proposal&quot; when you&apos;re ready</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Projects Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Saved Projects
            </DialogTitle>
            <DialogDescription>
              Add your past projects here. Select them when generating proposals to auto-fill relevant work fields.
            </DialogDescription>
          </DialogHeader>

          {/* Import / Export */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1"
              onClick={() => {
                const json = JSON.stringify(savedProjects, null, 2);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "upwork-projects.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={savedProjects.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".json";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    try {
                      const imported = JSON.parse(ev.target?.result as string);
                      if (!Array.isArray(imported)) throw new Error("Invalid format");
                      const validated: SavedProject[] = imported.map((p: any) => ({
                        id: p.id || crypto.randomUUID(),
                        title: String(p.title || ""),
                        description: String(p.description || ""),
                        url: String(p.url || ""),
                      })).filter((p: SavedProject) => p.title);
                      const merged = [...savedProjects];
                      for (const imp of validated) {
                        if (!merged.some(m => m.title === imp.title && m.url === imp.url)) {
                          merged.push(imp);
                        }
                      }
                      setSavedProjects(merged);
                      saveProjects(merged);
                    } catch {
                      alert("Invalid JSON file. Expected an array of project objects.");
                    }
                  };
                  reader.readAsText(file);
                };
                input.click();
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              Import JSON
            </Button>
          </div>

          {/* Add / Edit Project Form */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium">
              {editingProject ? "Edit Project" : "Add New Project"}
            </p>
            <div className="space-y-2">
              <Input
                placeholder="Project title (e.g., E-commerce Platform)"
                value={projectForm.title}
                onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                className="text-sm"
              />
              <Textarea
                placeholder="Brief description of the project..."
                rows={3}
                value={projectForm.description}
                onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                className="text-sm resize-none"
              />
              <Input
                placeholder="Project URL (optional)"
                value={projectForm.url}
                onChange={e => setProjectForm(prev => ({ ...prev, url: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveProject}
                disabled={!projectForm.title.trim()}
                size="sm"
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                {editingProject ? "Update" : "Add Project"}
              </Button>
              {editingProject && (
                <Button onClick={handleCancelProjectEdit} variant="outline" size="sm">
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Project List */}
          {savedProjects.length > 0 ? (
            <div className="space-y-2">
              {savedProjects.map(project => (
                <div
                  key={project.id}
                  className="p-3 rounded-lg border bg-card flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {project.description}
                    </p>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {project.url.length > 40 ? project.url.slice(0, 40) + "..." : project.url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditProject(project)}
                      className="h-7 w-7 p-0"
                    >
                      <PenTool className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No projects saved yet.</p>
              <p className="text-xs mt-1">Add your past projects to quickly reference them in proposals.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
