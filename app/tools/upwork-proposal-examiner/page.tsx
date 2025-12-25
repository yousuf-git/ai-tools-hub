"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Loader2, Copy, CheckCircle, PenTool } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GEMINI_MODELS } from "@/lib/gemini";

interface EvaluationResult {
  scores: {
    hookStrength: number;
    painPointIdentification: number;
    solutionQuality: number;
    relevanceAlignment: number;
    structureFlow: number;
    supportSection: number;
    questionsUsage: number;
    ctaStrength: number;
    toneLanguage: number;
    conversionPotential: number;
  };
  overallScore: number;
  deficiencies: string[];
  improvements: string[];
  improvedExamples?: {
    openingHook?: string;
    weakParagraph?: string;
    cta?: string;
  };
  finalVerdict: string;
}

export default function UpworkProposalExaminer() {
  const [jobDescription, setJobDescription] = useState("");
  const [proposalText, setProposalText] = useState("");
  const [clientName, setClientName] = useState("");
  const [jobCategory, setJobCategory] = useState<string>("generic");
  const [clientExperience, setClientExperience] = useState<string>("unknown");
  const [budgetRange, setBudgetRange] = useState<string>("unknown");
  const [startWordRequired, setStartWordRequired] = useState("");
  const [immediateAvailability, setImmediateAvailability] = useState(false);
  const [experienceRequired, setExperienceRequired] = useState("");
  const [preferredModel, setPreferredModel] = useState<string>(GEMINI_MODELS[0].name);
  
  const [isExamining, setIsExamining] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExamine = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter the job description.");
      return;
    }
    if (!proposalText.trim()) {
      setError("Please enter the proposal text to examine.");
      return;
    }

    setIsExamining(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch('/api/examine-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          proposalText: proposalText.trim(),
          clientName: clientName.trim(),
          jobCategory,
          clientExperience,
          budgetRange,
          startWordRequired: startWordRequired.trim(),
          immediateAvailability,
          experienceRequired: experienceRequired.trim(),
          preferredModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to examine proposal');
      }

      const data = await response.json();
      setResult(data.evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while examining the proposal.");
      console.error(err);
    } finally {
      setIsExamining(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReset = () => {
    setJobDescription("");
    setProposalText("");
    setClientName("");
    setJobCategory("generic");
    setClientExperience("unknown");
    setBudgetRange("unknown");
    setStartWordRequired("");
    setImmediateAvailability(false);
    setExperienceRequired("");
    setResult(null);
    setError("");
    setCopied(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getOverallScoreColor = (score: number) => {
    if (score >= 8) return "from-green-500 to-emerald-500";
    if (score >= 6) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
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
          <Link href="/tools/upwork-proposal-writer">
            <Button variant="outline" size="sm" className="gap-2">
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">Proposal Writer</span>
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Search className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Upwork Proposal Examiner
            </h1>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            Get professional evaluation and actionable feedback to transform your proposal into a high-converting masterpiece.
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
                <CardTitle className="text-lg sm:text-xl">Proposal Details</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Enter your proposal and job context for evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-5">
                {/* Job Description */}
                <div className="space-y-2">
                  <Label htmlFor="job-desc" className="text-sm sm:text-base flex items-center gap-2">
                    Job Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="job-desc"
                    placeholder="Paste the Upwork job description here..."
                    rows={6}
                    className="text-xs sm:text-sm resize-none"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>

                {/* Proposal Text */}
                <div className="space-y-2">
                  <Label htmlFor="proposal" className="text-sm sm:text-base flex items-center gap-2">
                    Your Proposal <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="proposal"
                    placeholder="Paste your proposal text here for examination..."
                    rows={8}
                    className="text-xs sm:text-sm resize-none"
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                  />
                </div>

                {/* Optional Context Fields */}
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium text-primary">Optional Context (improves accuracy)</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Client Name */}
                    <div className="space-y-2">
                      <Label htmlFor="client-name-exam" className="text-xs sm:text-sm">Client Name</Label>
                      <Input
                        id="client-name-exam"
                        placeholder="e.g., John"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    {/* Job Category */}
                    <div className="space-y-2">
                      <Label htmlFor="job-category" className="text-xs sm:text-sm">Job Category</Label>
                      <Select value={jobCategory} onValueChange={setJobCategory}>
                        <SelectTrigger className="text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="generic">Generic</SelectItem>
                          <SelectItem value="skill-based">Skill-Based</SelectItem>
                          <SelectItem value="problem-specific">Problem-Specific</SelectItem>
                          <SelectItem value="team-position">Team Position</SelectItem>
                          <SelectItem value="non-technical">Non-Technical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Client Experience */}
                    <div className="space-y-2">
                      <Label htmlFor="client-exp-exam" className="text-xs sm:text-sm">Client Experience</Label>
                      <Select value={clientExperience} onValueChange={setClientExperience}>
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

                    {/* Budget Range */}
                    <div className="space-y-2">
                      <Label htmlFor="budget-exam" className="text-xs sm:text-sm">Budget Range</Label>
                      <Select value={budgetRange} onValueChange={setBudgetRange}>
                        <SelectTrigger className="text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unknown">Unknown</SelectItem>
                          <SelectItem value="<500">Under $500</SelectItem>
                          <SelectItem value="500+">$500 or more</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Additional Fields */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="start-word-exam" className="text-xs sm:text-sm">Required Start Word</Label>
                      <Input
                        id="start-word-exam"
                        placeholder="If job requires specific start"
                        value={startWordRequired}
                        onChange={(e) => setStartWordRequired(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exp-required-exam" className="text-xs sm:text-sm">Experience Level Required</Label>
                      <Input
                        id="exp-required-exam"
                        placeholder="e.g., expert, senior"
                        value={experienceRequired}
                        onChange={(e) => setExperienceRequired(e.target.value)}
                        className="text-xs sm:text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="immediate-avail-exam"
                        checked={immediateAvailability}
                        onChange={(e) => setImmediateAvailability(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="immediate-avail-exam" className="text-xs sm:text-sm cursor-pointer">
                        Immediate availability required
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Model Selector */}
                <div className="space-y-2">
                  <Label htmlFor="model-select-exam" className="text-sm sm:text-base">AI Model</Label>
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

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleExamine}
                    disabled={isExamining || !jobDescription.trim() || !proposalText.trim()}
                    className="flex-1"
                    size="lg"
                  >
                    {isExamining ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Examining...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Examine Proposal
                      </>
                    )}
                  </Button>
                  {result && (
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="lg"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Evaluation Results</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Detailed analysis and improvement suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isExamining ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Search className="w-16 h-16 text-blue-500 mb-4" />
                    </motion.div>
                    <p className="text-base sm:text-lg font-medium text-foreground mb-2">
                      Examining your proposal...
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Analyzing against professional standards
                    </p>
                  </div>
                ) : result ? (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center p-6 rounded-lg border bg-gradient-to-br from-muted/50 to-muted/30">
                      <p className="text-sm text-muted-foreground mb-2">Overall Score</p>
                      <p className={`text-5xl font-bold bg-gradient-to-r ${getOverallScoreColor(result.overallScore)} bg-clip-text text-transparent`}>
                        {result.overallScore.toFixed(1)}/10
                      </p>
                    </div>

                    {/* Detailed Scores */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-base">Detailed Scores</h3>
                      <div className="space-y-2">
                        {Object.entries(result.scores).map(([key, score]) => (
                          <div key={key} className="flex justify-between items-center p-2 rounded bg-muted/30">
                            <span className="text-xs sm:text-sm capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`font-bold ${getScoreColor(score)}`}>
                              {score}/10
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Deficiencies */}
                    {result.deficiencies.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base text-red-600 dark:text-red-400">
                          Key Deficiencies
                        </h3>
                        <ul className="space-y-2">
                          {result.deficiencies.map((def, idx) => (
                            <li key={idx} className="text-xs sm:text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              • {def}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {result.improvements.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base text-green-600 dark:text-green-400">
                          Improvement Suggestions
                        </h3>
                        <ul className="space-y-2">
                          {result.improvements.map((imp, idx) => (
                            <li key={idx} className="text-xs sm:text-sm p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              • {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improved Examples */}
                    {result.improvedExamples && (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base text-blue-600 dark:text-blue-400">
                          Improved Examples
                        </h3>
                        {result.improvedExamples.openingHook && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Opening Hook:</p>
                            <div className="relative p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs sm:text-sm font-mono">{result.improvedExamples.openingHook}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => handleCopy(result.improvedExamples!.openingHook!)}
                              >
                                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        )}
                        {result.improvedExamples.weakParagraph && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Improved Paragraph:</p>
                            <div className="relative p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs sm:text-sm font-mono">{result.improvedExamples.weakParagraph}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => handleCopy(result.improvedExamples!.weakParagraph!)}
                              >
                                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        )}
                        {result.improvedExamples.cta && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Improved CTA:</p>
                            <div className="relative p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs sm:text-sm font-mono">{result.improvedExamples.cta}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => handleCopy(result.improvedExamples!.cta!)}
                              >
                                {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Final Verdict */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-base">Final Verdict</h3>
                      <p className="text-xs sm:text-sm p-4 rounded-lg bg-muted/50 border leading-relaxed">
                        {result.finalVerdict}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
                    <Search className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground mb-2">
                      Your evaluation results will appear here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enter your proposal details and click &quot;Examine Proposal&quot;
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
