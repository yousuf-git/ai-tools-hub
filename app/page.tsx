"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  FileText,
  FileEdit,
  PenTool,
  Search,
  Brain,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

/* ================================================================== *
 *  AI FORGE — Swiss / International Typographic landing.
 *  The platform presented as an editorial INDEX: type does the work,
 *  one signal accent, and the tool directory grows by adding a row.
 * ================================================================== */

/* ------------------------------------------------------------------ */
/*  Data — the single source of truth. Add a tool = add an entry.      */
/* ------------------------------------------------------------------ */
type Tool = {
  id: string;
  order: number;
  name: string;
  tag: string;
  description: string;
  icon: typeof FileText;
  href: string;
  isExternal?: boolean;
};

/* Display order is driven by `order`, not array position — change the
   number to move a tool in the Index; ties keep declaration order. */
const tools: Tool[] = [
  {
    id: "resume-analyzer",
    order: 1,
    name: "Résumé & Job-Fit Analyzer",
    tag: "Analyze",
    description:
      "Score a résumé against any job description — match percentage, missing keywords, and ATS fixes you can act on.",
    icon: FileText,
    href: "/tools/resume-analyzer",
  },
  {
    id: "resume-builder",
    order: 2,
    name: "JD-Tailored Résumé Builder",
    tag: "Build",
    description:
      "Build a developer résumé tuned to one JD. AI suggests, you control every field, one-click PDF export.",
    icon: FileEdit,
    href: "/tools/resume-builder",
  },
  {
    id: "upwork-proposal-writer",
    order: 3,
    name: "Upwork Proposal Writer",
    tag: "Write",
    description:
      "Turn a job post into a concise, tailored proposal in seconds — with revision passes until it reads the way you want.",
    icon: PenTool,
    href: "/tools/upwork-proposal-writer",
  },
  {
    id: "upwork-proposal-examiner",
    order: 4,
    name: "Upwork Proposal Examiner",
    tag: "Grade",
    description:
      "Paste a draft and get scored on hook, relevance, and clarity — plus line-level feedback before you hit send.",
    icon: Search,
    href: "/tools/upwork-proposal-examiner",
  },
  {
    id: "examiner-ai",
    order: 5,
    name: "Examiner AI",
    tag: "Quiz",
    description:
      "Upload a PDF and get quizzed on it with AI-generated questions that test whether you actually understood the material.",
    icon: Brain,
    href: "https://huggingface.co/spaces/yousuf-dev/mumtahinGpt",
    isExternal: true,
  },
].sort((a, b) => a.order - b.order);

/* Real, contextual platform facts — presented big, never fabricated. */
const stats = [
  { value: tools.length, label: "Tools live in the hub, each its own route" },
  { value: 4, label: "Model fallback chain: 3-flash → 2.5 → 2.0 → pro" },
  { value: 0, label: "Accounts or sign-ups required to use them" },
  { value: 1, label: "Hub — bring your material, get a result" },
];

const platform = [
  {
    k: "01",
    title: "Keys never touch the browser",
    body: "Every Gemini call runs server-side through a Next.js API route. Your key stays on the server, not in the client bundle.",
  },
  {
    k: "02",
    title: "Degrades, never dies",
    body: "A four-model fallback chain rides out a rate limit or an unavailable model instead of failing the request.",
  },
  {
    k: "03",
    title: "Your files stay local",
    body: "Résumé and document text is extracted from PDFs in your browser. Only the text is ever sent onward.",
  },
  {
    k: "04",
    title: "Built to extend",
    body: "Each tool is a self-contained route. Adding the next one doesn't touch the tools already shipped.",
  },
];

const steps = [
  {
    n: "01",
    title: "Drop in your material",
    body: "Paste a job description, upload a résumé PDF, or bring a proposal draft. Text is extracted right in the browser.",
  },
  {
    n: "02",
    title: "Gemini goes to work",
    body: "Each tool runs a purpose-built prompt through the model fallback chain, so a rate limit degrades gracefully.",
  },
  {
    n: "03",
    title: "Ship the result",
    body: "Scores, rewrites, and export-ready output you control. Edit inline, iterate, export to PDF when it's right.",
  },
];

/* ------------------------------------------------------------------ */
/*  Count-up — animates a number once when scrolled into view.         */
/* ------------------------------------------------------------------ */
function CountUp({ to }: { to: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce || to === 0) {
      setValue(to);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const dur = 900;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / dur, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {String(value).padStart(2, "0")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Small Swiss furniture                                              */
/* ------------------------------------------------------------------ */
function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/favicon.png"
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:rotate-12"
      />
      <span className="font-mono text-[0.95rem] font-semibold uppercase tracking-tight text-foreground">
        AI&nbsp;Forge
      </span>
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </span>
  );
}

/* ================================================================== */
/*  Page                                                              */
/* ================================================================== */
export default function Home() {
  const year = new Date().getFullYear();
  const reduce = useReducedMotion();

  // Footer wordmark parallax — drifts as the footer scrolls through the viewport.
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: wordmarkRef, offset: ["start end", "end start"] });
  const wordmarkDrift = useTransform(scrollYProgress, [0, 1], ["7%", "-7%"]);

  const rise = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* ============ Masthead ============ */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
          <Wordmark />
          <nav className="hidden items-center gap-8 font-mono text-[0.72rem] uppercase tracking-[0.15em] text-muted-foreground md:flex">
            <a href="#index" className="transition-colors hover:text-foreground">Index</a>
            <a href="#platform" className="transition-colors hover:text-foreground">Platform</a>
            <a href="#how" className="transition-colors hover:text-foreground">Method</a>
            <a
              href="https://github.com/yousuf-git/ai-tools-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Source
            </a>
          </nav>
          <div className="flex items-center gap-1.5">
            <a
              href="#index"
              className="hidden font-mono text-[0.72rem] uppercase tracking-[0.15em] text-foreground underline decoration-primary decoration-2 underline-offset-[5px] transition-opacity hover:opacity-70 sm:inline"
            >
              Open the tools →
            </a>
            <Link
              href="/account"
              className="font-mono text-[0.72rem] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ============ Hero — editorial monolith ============ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          {/* meta rule */}
          <motion.div
            {...rise(0)}
            className="flex items-center justify-between border-b border-border py-3"
          >
            <Eyebrow>A platform for freelance developers</Eyebrow>
            <Eyebrow>
              <span className="text-primary">●</span>&nbsp;{tools.length} tools live · Gemini
            </Eyebrow>
          </motion.div>

          {/* headline */}
          <div className="py-12 sm:py-16 lg:py-24">
            <motion.h1
              {...rise(0.05)}
              className="max-w-[15ch] font-display text-[3.25rem] font-extrabold uppercase leading-[0.92] tracking-[-0.03em] text-foreground sm:text-8xl lg:text-[8.5rem]"
            >
              Sharpen every{" "}
              <span className="text-primary">application</span> you send.
            </motion.h1>

            <div className="mt-10 grid gap-8 border-t border-border pt-8 lg:grid-cols-[1.4fr_1fr]">
              <motion.p
                {...rise(0.12)}
                className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
              >
                An AI workbench for the way freelance developers actually win work.
                Score a résumé against any job description, build one tailored to it,
                and write or grade the proposals that land the contract —{" "}
                <span className="text-foreground">all in one hub.</span>
              </motion.p>

              <motion.div {...rise(0.18)} className="flex flex-col items-start gap-4 lg:items-end">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-none px-7 text-sm font-semibold uppercase tracking-wide"
                >
                  <a href="#index">
                    Browse the tools
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <a
                  href="#how"
                  className="font-mono text-[0.72rem] uppercase tracking-[0.15em] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                >
                  See how it works ↓
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Numbers band — real facts, oversized ============ */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`border-border px-5 py-8 sm:px-8 sm:py-10 ${
                i % 2 === 0 ? "border-r" : ""
              } ${i < 2 ? "border-b lg:border-b-0" : ""} ${
                i === 1 || i === 3 ? "lg:border-r" : ""
              } ${i === 3 ? "lg:border-r-0" : ""}`}
            >
              <div className="font-display text-6xl font-extrabold leading-none tracking-tight text-foreground sm:text-7xl">
                <CountUp to={s.value} />
              </div>
              <p className="mt-4 max-w-[22ch] font-mono text-[0.7rem] uppercase leading-relaxed tracking-[0.12em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ The Index — signature moment ============ */}
      <section id="index" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 py-10">
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-5xl">
              The Index
            </h2>
            <Eyebrow>Every tool does one job well — pick one, get a result</Eyebrow>
          </div>

          <div className="border-b border-border">
            {tools.map((tool, i) => {
              const Row = (
                <div className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-1 border-t border-border py-6 transition-colors duration-200 hover:bg-foreground hover:text-background sm:grid-cols-[4rem_1fr_10rem_2.5rem] sm:py-8">
                  <span className="font-mono text-sm text-primary transition-colors group-hover:text-background">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight sm:text-3xl lg:text-4xl">
                      {tool.name}
                    </h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground transition-colors group-hover:text-background/70 sm:hidden lg:block">
                      {tool.description}
                    </p>
                  </div>

                  <span className="hidden font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-background/70 sm:block">
                    {tool.tag}
                    {tool.isExternal ? " ↗" : ""}
                  </span>

                  <ArrowUpRight className="col-start-3 row-start-1 h-6 w-6 shrink-0 justify-self-end transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 sm:col-start-4" />
                </div>
              );

              return tool.isExternal ? (
                <a key={tool.id} href={tool.href} target="_blank" rel="noopener noreferrer" className="block">
                  {Row}
                </a>
              ) : (
                <Link key={tool.id} href={tool.href} className="block">
                  {Row}
                </Link>
              );
            })}

            {/* growth row — reinforces "platform, more coming" */}
            <a
              href="https://github.com/yousuf-git/ai-tools-hub/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="group grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-x-4 border-t border-border py-6 sm:grid-cols-[4rem_1fr_2.5rem] sm:py-8"
            >
              <span className="font-mono text-sm text-muted-foreground">
                {String(tools.length + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-3xl lg:text-4xl">
                  More tools in progress
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  The hub is built to grow — request the next one on GitHub.
                </p>
              </div>
              <ArrowUpRight className="h-6 w-6 shrink-0 justify-self-end text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-foreground" />
            </a>
          </div>
        </div>
      </section>

      {/* ============ Platform — market big ============ */}
      <section id="platform" className="scroll-mt-16 border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="max-w-3xl py-14 sm:py-20">
            <Eyebrow>The platform</Eyebrow>
            <h2 className="mt-5 font-display text-3xl font-extrabold uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl">
              Built like a platform,
              <br />
              not a landing page.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              One codebase, one design language, one place to work. The plumbing that
              makes the first five tools reliable is the same plumbing every future
              tool inherits on day one.
            </p>
          </div>

          <div className="grid border-t border-border sm:grid-cols-2">
            {platform.map((p, i) => (
              <div
                key={p.k}
                className={`border-border px-1 py-8 sm:px-8 ${
                  i % 2 === 0 ? "sm:border-r" : ""
                } ${i < platform.length - (platform.length % 2 === 0 ? 2 : 1) ? "border-b" : ""}`}
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-sm text-primary">{p.k}</span>
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight text-foreground sm:text-2xl">
                      {p.title}
                    </h3>
                    <p className="mt-2.5 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
                      {p.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Method — spec sheet ============ */}
      <section id="how" className="scroll-mt-16 border-b border-border">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4 py-10">
            <h2 className="max-w-2xl font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-5xl">
              Raw input to a result you can ship
            </h2>
            <Eyebrow>Same three moves across every tool</Eyebrow>
          </div>

          <div className="grid border-t border-border md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className={`border-border px-1 py-8 sm:px-8 sm:py-12 ${
                  i < steps.length - 1 ? "border-b md:border-b-0 md:border-r" : ""
                }`}
              >
                <span className="font-mono text-sm text-primary">STEP {step.n}</span>
                <h3 className="mt-5 font-display text-2xl font-bold uppercase tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Closing ask ============ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="max-w-[16ch] font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-foreground sm:text-7xl">
            Pick a tool. Send something{" "}
            <span className="text-primary">sharper.</span>
          </h2>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-none px-7 text-sm font-semibold uppercase tracking-wide"
            >
              <Link href="/tools/resume-analyzer">
                Analyze my résumé
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-none px-7 text-sm font-semibold uppercase tracking-wide"
            >
              <Link href="/tools/upwork-proposal-writer">Write a proposal</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============ Footer — bordered column frame + full-bleed wordmark ============ */}
      <footer className="overflow-hidden bg-background">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          

          {/* bracketed column frame — edges broken at corners, L-marker brackets, vertical dividers */}
          <div className="relative grid divide-y divide-foreground/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {/* edges — stop short of the corners to leave a diagonal gap */}
            <span aria-hidden className="pointer-events-none absolute inset-x-4 top-0 h-px bg-foreground/20" />
            <span aria-hidden className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-foreground/20" />
            <span aria-hidden className="pointer-events-none absolute inset-y-4 left-0 w-px bg-foreground/20" />
            <span aria-hidden className="pointer-events-none absolute inset-y-4 right-0 w-px bg-foreground/20" />
            {/* corner markers — cropped L brackets */}
            <span aria-hidden className="pointer-events-none absolute left-[3px] top-[3px] h-4 w-4 border-l border-t border-foreground/70" />
            <span aria-hidden className="pointer-events-none absolute right-[3px] top-[3px] h-4 w-4 border-r border-t border-foreground/70" />
            <span aria-hidden className="pointer-events-none absolute bottom-[3px] left-[3px] h-4 w-4 border-l border-b border-foreground/70" />
            <span aria-hidden className="pointer-events-none absolute bottom-[3px] right-[3px] h-4 w-4 border-r border-b border-foreground/70" />
            {/* Contact */}
            <div className="flex min-h-[240px] flex-col justify-between gap-16 p-6 sm:min-h-[360px] sm:p-10">
              <h4 className="font-mono text-sm uppercase tracking-[0.18em] text-foreground">Contact</h4>
              <div className="space-y-2">
                <a href="mailto:yousuf.work09@gmail.com" className="block text-base text-foreground transition-colors hover:text-primary">
                  yousuf.work09@gmail.com
                </a>
                <a href="mailto:yousuf.work09@gmail.com" className="inline-flex items-center gap-1 text-base text-muted-foreground transition-colors hover:text-foreground">
                  Get in touch <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Connect */}
            <div className="flex min-h-[240px] flex-col justify-between gap-16 p-6 sm:min-h-[360px] sm:p-10">
              <h4 className="font-mono text-sm uppercase tracking-[0.18em] text-foreground">Connect</h4>
              <div className="space-y-2">
                {[
                  { t: "GitHub", h: "https://github.com/yousuf-git" },
                  { t: "LinkedIn", h: "https://linkedin.com/in/muhammad-yousuf952" },
                ].map((s) => (
                  <a
                    key={s.t}
                    href={s.h}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-base text-foreground transition-colors hover:text-primary"
                  >
                    {s.t} <ArrowUpRight className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Explore */}
            <div className="flex min-h-[240px] flex-col justify-between gap-16 p-6 sm:min-h-[360px] sm:p-10">
              <h4 className="font-mono text-sm uppercase tracking-[0.18em] text-foreground">Explore</h4>
              <div className="space-y-2">
                {tools.map((t) =>
                  t.isExternal ? (
                    <a key={t.id} href={t.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-base text-muted-foreground transition-colors hover:text-foreground">
                      {t.name} <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </a>
                  ) : (
                    <Link key={t.id} href={t.href} className="block text-base text-muted-foreground transition-colors hover:text-foreground">
                      {t.name}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* full-bleed signature wordmark — accent, bleeds off the bottom edge; parallax on scroll */}
        <div ref={wordmarkRef} className="-mb-[1.2vw] px-5 pt-8 sm:px-8">
          <motion.div style={reduce ? undefined : { y: wordmarkDrift }}>
            <svg
              viewBox="0 0 1000 132"
              preserveAspectRatio="xMinYMin meet"
              role="img"
              aria-label="AI Forge"
              className="block w-full select-none text-primary"
            >
              <text
                x="0"
                y="120"
                textLength="1000"
                lengthAdjust="spacingAndGlyphs"
                fontSize="150"
                fontWeight="500"
                letterSpacing="0"
                fill="currentColor"
                className="font-mono uppercase"
              >
                AI F<tspan fill="none" stroke="currentColor" strokeWidth="2" paintOrder="stroke">O</tspan>RGE
              </text>
            </svg>
          </motion.div>
        </div>

        {/* legal + colophon */}
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-3 border-t border-border py-6 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground sm:flex-row sm:items-center">
            <p>
              © {year} AI Forge — MIT Licensed · Built by{" "}
              <a
                href="https://yousuf-dev.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:opacity-70"
              >
                M. Yousuf
              </a>
            </p>
            <p>AI Forged for real use</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
