"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, PenTool, Loader2, Copy, CheckCircle, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GEMINI_MODELS } from "@/lib/gemini";

interface ProposalVersion {
  id: number;
  content: string;
  timestamp: Date;
  improvisationNotes?: string;
}

export default function UpworkProposalWriter() {
  const [jobDescription, setJobDescription] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [preferredModel, setPreferredModel] = useState<string>(GEMINI_MODELS[0].name);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
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

  const currentProposal = currentVersionIndex >= 0 ? versions[currentVersionIndex]?.content : "";

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          additionalDetails: additionalDetails.trim(),
          preferredModel,
        }),
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
      const response = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          additionalDetails: additionalDetails.trim(),
          preferredModel,
          previousProposal: currentProposal,
          improvisationNotes: improvisationNotes.trim(),
          isRevision: true,
        }),
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
        <ThemeToggle />
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
                    E.g., "Mention my 5 years experience in React" or "Keep it under 150 words"
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
                            placeholder="E.g., 'Make it more technical', 'Add emphasis on my React expertise', 'Shorten to 150 words', 'Sound more enthusiastic'..."
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
                          <li>Use "Improvise" to refine specific aspects</li>
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
                        Enter a job description and click "Generate Proposal" to get started
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
                  <li>Click "Load Current Version" to fetch the selected proposal</li>
                  <li>Edit the text directly in the editor</li>
                  <li>Add personal touches, portfolio links, or specific details</li>
                  <li>Click "Copy Edited Proposal" when you're ready</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
