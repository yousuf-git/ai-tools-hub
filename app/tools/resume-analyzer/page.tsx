"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle, XCircle, Info, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { extractTextFromPDF, validatePDFFile } from "@/lib/pdf-parser";
import { type AnalysisResult, GEMINI_MODELS } from "@/lib/gemini";

// Rate limiting state management
interface RateLimit {
  count: number;
  resetTime: number;
}

export default function ResumeAnalyzer() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescFile, setJobDescFile] = useState<File | null>(null);
  const [jobDescText, setJobDescText] = useState("");
  const [preferredModel, setPreferredModel] = useState<string>(GEMINI_MODELS[0].name);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>("");
  const [rateLimits, setRateLimits] = useState<Record<string, RateLimit>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Rate limiting functions
  const checkRateLimit = (modelName: string): { canProceed: boolean; waitTime: number } => {
    const model = GEMINI_MODELS.find(m => m.name === modelName);
    if (!model) return { canProceed: true, waitTime: 0 };

    const limit = rateLimits[modelName];
    if (!limit) return { canProceed: true, waitTime: 0 };

    const now = Date.now();
    if (now >= limit.resetTime) {
      // Reset the count after 1 minute
      setRateLimits(prev => ({ ...prev, [modelName]: { count: 0, resetTime: now + 60000 } }));
      return { canProceed: true, waitTime: 0 };
    }

    if (limit.count >= model.rateLimit) {
      const waitTime = Math.ceil((limit.resetTime - now) / 1000);
      return { canProceed: false, waitTime };
    }

    return { canProceed: true, waitTime: 0 };
  };

  const updateRateLimit = (modelName: string) => {
    const now = Date.now();
    setRateLimits(prev => {
      const current = prev[modelName] || { count: 0, resetTime: now + 60000 };
      return {
        ...prev,
        [modelName]: {
          count: current.count + 1,
          resetTime: current.resetTime
        }
      };
    });
  };

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const selectedModelLimit = rateLimits[preferredModel];
      if (selectedModelLimit) {
        const now = Date.now();
        const timeLeftSeconds = Math.max(0, Math.ceil((selectedModelLimit.resetTime - now) / 1000));
        setTimeLeft(timeLeftSeconds);
      } else {
        setTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [preferredModel, rateLimits]);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePDFFile(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid PDF file");
        setResumeFile(null);
        return;
      }
      setResumeFile(file);
      setError("");
    }
  };

  const handleJobDescUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        const validation = validatePDFFile(file);
        if (!validation.valid) {
          setError(validation.error || "Invalid PDF file");
          setJobDescFile(null);
          return;
        }
      } else if (file.type !== "text/plain") {
        setError("Please upload a PDF or TXT file for the job description.");
        setJobDescFile(null);
        return;
      }
      setJobDescFile(file);
      setJobDescText("");
      setError("");
    }
  };

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError("Please upload a resume PDF.");
      return;
    }

    if (!jobDescText && !jobDescFile) {
      setError("Please provide a job description (text or file).");
      return;
    }

    // Check rate limit for preferred model
    const { canProceed, waitTime } = checkRateLimit(preferredModel);
    if (!canProceed) {
      setError(`Rate limit exceeded for ${preferredModel}. Please wait ${waitTime} seconds or select a different model.`);
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setAnalysisResult(null);

    try {
      // Extract resume text
      const resumeText = await extractTextFromPDF(resumeFile);

      // Get job description text
      let jobDescription = jobDescText;
      if (jobDescFile) {
        if (jobDescFile.type === "application/pdf") {
          jobDescription = await extractTextFromPDF(jobDescFile);
        } else {
          jobDescription = await jobDescFile.text();
        }
      }

      if (!resumeText || !jobDescription) {
        throw new Error("Failed to extract text from files. Please ensure files are valid.");
      }

      // Update rate limit count
      updateRateLimit(preferredModel);

      // Call API route with preferred model
      const response = await fetch('/api/analyze-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          preferredModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze resume');
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during analysis.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResumeFile(null);
    setJobDescFile(null);
    setJobDescText("");
    setAnalysisResult(null);
    setError("");
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
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent px-2">
            Resume & Job Fit Analyzer
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            Upload your resume and job description to get AI-powered insights on how well your resume
            matches the job requirements, identify skill gaps, and receive ATS optimization suggestions.
          </p>
        </motion.div>

        {!analysisResult ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="max-w-3xl mx-auto">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Upload Your Documents</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Provide your resume and the job description you want to analyze
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label htmlFor="resume" className="text-sm sm:text-base">Resume (PDF) *</Label>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf"
                      onChange={handleResumeUpload}
                      className="cursor-pointer text-xs sm:text-sm"
                    />
                    {resumeFile && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  {resumeFile && (
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{resumeFile.name}</span>
                    </p>
                  )}
                </div>

                {/* Job Description Upload */}
                <div className="space-y-2">
                  <Label htmlFor="jobdesc-file" className="text-sm sm:text-base">Job Description (PDF or TXT)</Label>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <Input
                      id="jobdesc-file"
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleJobDescUpload}
                      className="cursor-pointer text-xs sm:text-sm"
                    />
                    {jobDescFile && (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  {jobDescFile && (
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{jobDescFile.name}</span>
                    </p>
                  )}
                </div>

                {/* Job Description Text */}
                <div className="space-y-2">
                  <Label htmlFor="jobdesc-text" className="text-sm sm:text-base">Or Paste Job Description *</Label>
                  <Textarea
                    id="jobdesc-text"
                    placeholder="Paste the job description here..."
                    rows={6}
                    className="text-xs sm:text-sm resize-none"
                    value={jobDescText}
                    onChange={(e) => setJobDescText(e.target.value)}
                    disabled={!!jobDescFile}
                  />
                  <p className="text-xs text-muted-foreground">
                    {jobDescFile ? "Remove the file to enable text input" : "You can paste the job description directly"}
                  </p>
                </div>

                {/* Model Selector */}
                <div className="space-y-2">
                  <Label htmlFor="model-select">AI Model</Label>
                  <Select value={preferredModel} onValueChange={setPreferredModel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {GEMINI_MODELS.map((model) => {
                        const limit = rateLimits[model.name];
                        const isAtLimit = limit && limit.count >= model.rateLimit && Date.now() < limit.resetTime;
                        const usageCount = limit?.count || 0;
                        
                        return (
                          <SelectItem 
                            key={model.name} 
                            value={model.name}
                            disabled={isAtLimit}
                          >
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{model.label}</span>
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {usageCount}/{model.rateLimit} RPM
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">{model.description}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>
                      {(() => {
                        const selectedModel = GEMINI_MODELS.find(m => m.name === preferredModel);
                        const limit = rateLimits[preferredModel];
                        const usageCount = limit?.count || 0;
                        const remaining = (selectedModel?.rateLimit || 0) - usageCount;
                        
                        if (timeLeft > 0 && remaining <= 0) {
                          return `Rate limit reached. Resets in ${timeLeft}s`;
                        }
                        return `${remaining} requests remaining this minute`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive"
                  >
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Analyze Button */}
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Analyze Resume
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Fallback Model Notification */}
              {analysisResult.wasFallback && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-medium">Fallback model used:</span> Your preferred model was unavailable, so we used{' '}
                    <span className="font-mono">{analysisResult.modelUsed}</span> instead for faster processing.
                  </p>
                </motion.div>
              )}

              {/* Match Score Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Match Score</span>
                    <span className="text-4xl font-bold text-primary">
                      {analysisResult.matchScore}%
                    </span>
                  </CardTitle>
                  <CardDescription>
                    How well your resume matches the job requirements
                    {analysisResult.modelUsed && !analysisResult.wasFallback && (
                      <span className="block text-xs mt-1 opacity-75">
                        Analyzed using {GEMINI_MODELS.find(m => m.name === analysisResult.modelUsed)?.label || analysisResult.modelUsed}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={analysisResult.matchScore} className="h-3" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {analysisResult.overallFeedback}
                  </p>
                </CardContent>
              </Card>

              {/* Missing & Weak Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl">Missing Skills</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Skills mentioned in the job but not in your resume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analysisResult.missingSkills.length > 0 ? (
                      <ul className="space-y-2">
                        {analysisResult.missingSkills.map((skill, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5"
                          >
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-destructive mt-0.5 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">{skill}</span>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground">No missing skills identified! 🎉</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl">Weak Skills</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Skills present but not well-demonstrated</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analysisResult.weakSkills.length > 0 ? (
                      <ul className="space-y-2">
                        {analysisResult.weakSkills.map((skill, index) => (
                          <motion.li
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5"
                          >
                            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-500/20 mt-0.5 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">{skill}</span>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground">All skills well-demonstrated! 💪</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Suggested Improvements */}
              {analysisResult.suggestedImprovements.length > 0 && (
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl">Suggested Improvements</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Rewritten sections to better match the job requirements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-6">
                    {analysisResult.suggestedImprovements.map((improvement, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 sm:p-4 rounded-lg border bg-card"
                      >
                        <h4 className="font-semibold mb-2 text-sm sm:text-base text-primary">{improvement.section}</h4>
                        <div className="space-y-2 sm:space-y-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Original:</p>
                            <p className="text-xs sm:text-sm bg-muted/50 p-2 sm:p-3 rounded leading-relaxed">{improvement.original}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                              Improved:
                            </p>
                            <p className="text-xs sm:text-sm bg-green-500/10 p-2 sm:p-3 rounded border border-green-500/20 leading-relaxed">
                              {improvement.improved}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Why:</p>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{improvement.reason}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* ATS Optimizations */}
              {analysisResult.atsOptimizations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl">ATS Optimization Tips</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      General tips to make your resume more ATS-friendly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.atsOptimizations.map((tip, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-primary/5"
                        >
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-xs sm:text-sm leading-relaxed">{tip}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <Button onClick={handleReset} variant="outline" size="lg" className="w-full sm:w-auto">
                  Analyze Another Resume
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
