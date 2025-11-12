"use client";

import { motion } from "framer-motion";
import { FileText, Github, Linkedin, Mail, ArrowRight, Brain, PenTool } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const tools = [
  {
    id: "resume-analyzer",
    name: "Resume & Job Fit Analyzer",
    description:
      "Upload your resume and job description to get AI-powered insights, match scores, and ATS optimization suggestions.",
    icon: FileText,
    href: "/tools/resume-analyzer",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "upwork-proposal-writer",
    name: "Upwork Proposal Writer",
    description:
      "Generate professional, concise, and effective Upwork proposals tailored to job descriptions with AI-powered writing assistance.",
    icon: PenTool,
    href: "/tools/upwork-proposal-writer",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "examiner-ai",
    name: "Examiner AI",
    description:
      "Upload a PDF document to analyze its content, then get evaluated with relevant AI-generated questions to test your understanding.",
    icon: Brain,
    href: "https://examinerai.yousuf-dev.com",
    color: "from-purple-500 to-pink-500",
    isExternal: true,
  },
  // More tools will be added here in the future
];

const socialLinks = [
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/yousuf-git",
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    href: "https://linkedin.com/in/muhammad-yousuf952",
  },
  {
    name: "Email",
    icon: Mail,
    href: "mailto:yousuf.work09@gmail.com",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"
        >
          AI Tools Hub
        </motion.h1>
        <ThemeToggle />
      </header>

      {/* Hero Section - Personal Intro */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary via-blue-600 to-cyan-500 bg-clip-text text-transparent leading-tight">
            Welcome to My AI Tools Hub
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-8">
            Hi, I'm <span className="font-semibold text-foreground">M. Yousuf</span>
          </p>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed px-2">
            A passionate <b>backend developer</b> creating AI-powered tools to solve real-world problems.
            This platform brings together multiple AI tools in one place, each designed to
            make your life easier and more productive. Explore the tools below and let AI
            assist you in your daily tasks.
          </p>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-3 sm:gap-4 mb-8 sm:mb-12"
          >
            {socialLinks.map((link, index) => (
              <motion.a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 sm:p-3 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <link.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="sr-only">{link.name}</span>
              </motion.a>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Tools Section */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Available Tools</h3>
          <p className="text-sm sm:text-base text-muted-foreground px-2">
            Choose a tool to get started. More tools coming soon!
          </p>
        </motion.div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -8 }}
              className="h-full"
            >
              {tool.isExternal ? (
                <a 
                  href={tool.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block h-full"
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 group relative overflow-hidden">
                    {/* Gradient Background Effect */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    <CardHeader className="pb-3 sm:pb-6">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${tool.color} p-2 sm:p-2.5 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <tool.icon className="w-full h-full text-white" />
                      </div>
                      <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">
                        {tool.name}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm leading-relaxed">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button
                        variant="ghost"
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-sm"
                      >
                        Open Tool
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                </a>
              ) : (
                <Link href={tool.href} className="block h-full">
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 group relative overflow-hidden">
                    {/* Gradient Background Effect */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    <CardHeader className="pb-3 sm:pb-6">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br ${tool.color} p-2 sm:p-2.5 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <tool.icon className="w-full h-full text-white" />
                      </div>
                      <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">
                        {tool.name}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm leading-relaxed">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button
                        variant="ghost"
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-sm"
                      >
                        Open Tool
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              )}
            </motion.div>
          ))}

          {/* Placeholder for future tools */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="h-full"
          >
            <Card className="h-full border-dashed border-2 flex items-center justify-center min-h-[240px] sm:min-h-[280px]">
              <CardContent className="text-center pt-6 px-4">
                <p className="text-sm sm:text-base text-muted-foreground font-medium mb-2">
                  More Tools Coming Soon
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Stay tuned for exciting new AI-powered tools!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 mt-12 sm:mt-20 border-t">
        <p className="text-center text-xs sm:text-sm text-muted-foreground">
          Built with ❤️ using Next.js, TypeScript, and AI
        </p>
      </footer>
    </div>
  );
}
