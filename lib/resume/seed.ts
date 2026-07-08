// Seed data ported from docs/resume-template.html so the preview is never empty on first load.
import type { Profile, ResumeProject, ResumeDraft, DraftProject } from "./types";

export function seedProfile(): Profile {
  return {
    basics: {
      name: "Arsalan Khan",
      role: "Full Stack Developer",
      email: "arsalan.dev@email.com",
      phone: "+92 300 1234567",
      location: "Multan, PK",
      portfolio: "arsalankhan.dev",
      github: "github.com/arsalan-dev",
      linkedin: "linkedin.com/in/arsalan-dev",
    },
    summary:
      "Full stack developer with 3+ years building and shipping production web applications across the MERN and Next.js ecosystems. Strong focus on API design, performance, and end-to-end ownership — from database schema to deployed, monitored infrastructure. Comfortable taking ambiguous requirements to a measurable release.",
    skills: [
      { category: "Languages", items: ["TypeScript", "JavaScript (ES2023)", "Python", "SQL"] },
      { category: "Frontend", items: ["React", "Next.js (App Router)", "Redux Toolkit", "TanStack Query", "Tailwind CSS"] },
      { category: "Backend", items: ["Node.js", "Express", "NestJS", "REST", "GraphQL", "WebSockets", "JWT/OAuth 2.0"] },
      { category: "Databases", items: ["PostgreSQL", "MongoDB", "Redis", "Prisma", "Mongoose"] },
      { category: "DevOps", items: ["Docker", "GitHub Actions", "AWS (EC2, S3, Lambda)", "Nginx", "Vercel"] },
      { category: "Practices", items: ["CI/CD", "Jest/Playwright testing", "code review", "Agile/Scrum"] },
    ],
    experience: [
      {
        id: "exp-techvista",
        title: "Full Stack Developer",
        company: "TechVista Solutions",
        location: "Remote",
        start: "Mar 2024",
        end: "Present",
        bullets: [
          "Own end-to-end delivery of a multi-tenant SaaS dashboard serving 12k monthly active users (Next.js, NestJS, PostgreSQL).",
          "Cut median API response time from 480ms to 110ms by introducing Redis caching and rewriting N+1 Prisma queries.",
          "Designed and documented a versioned REST API consumed by web, mobile, and two third-party integrators.",
          "Set up GitHub Actions CI with Playwright e2e suites, reducing post-release hotfixes by ~60%.",
          "Mentor two junior developers through structured code reviews and pairing sessions.",
        ],
      },
      {
        id: "exp-pixelforge",
        title: "Junior Web Developer",
        company: "Pixel Forge",
        location: "Lahore, PK",
        start: "Jun 2022",
        end: "Feb 2024",
        bullets: [
          "Built and maintained 8 client-facing React applications; migrated legacy class components to hooks across a 40k-LOC codebase.",
          "Integrated Stripe payments and webhook reconciliation for two e-commerce clients processing $30k+/month.",
          "Reduced bundle size by 45% through route-level code splitting and dependency audits.",
          "Wrote internal CLI tooling in Node.js that automated client project scaffolding, saving ~3 hours per project kickoff.",
        ],
      },
    ],
    certifications: [
      { id: "cert-aws", name: "AWS Certified Developer — Associate", issuer: "Amazon Web Services", year: "2025" },
      { id: "cert-meta", name: "Meta Back-End Developer Professional Certificate", issuer: "Meta", year: "2024" },
      { id: "cert-mongo", name: "MongoDB Associate Developer Certification", issuer: "MongoDB", year: "2024" },
      { id: "cert-docker", name: "Docker Certified Associate", issuer: "Docker", year: "2023" },
    ],
    education: [
      {
        id: "edu-bzu",
        degree: "BS Computer Science",
        institution: "Bahauddin Zakariya University, Multan",
        detail: "CGPA 3.6/4.0",
        start: "2019",
        end: "2023",
      },
      {
        id: "edu-pgc",
        degree: "HSSC Pre-Engineering",
        institution: "Punjab Group of Colleges, Multan",
        detail: "",
        start: "2017",
        end: "2019",
      },
    ],
  };
}

export function seedProjects(): ResumeProject[] {
  return [
    {
      id: "proj-devsync",
      title: "DevSync — Real-time Code Collaboration",
      liveUrl: "https://devsync.example.com",
      codeUrl: "https://github.com/arsalan-dev/devsync",
      stack: ["Next.js", "NestJS", "WebSockets", "Redis", "PostgreSQL", "Docker"],
      bullets: [
        "Built CRDT-based collaborative editor supporting 50+ concurrent users per room with sub-100ms sync latency.",
        "Designed presence and permission system with role-based access; deployed with Docker on AWS EC2 behind Nginx.",
        "Instrumented with Prometheus + Grafana; alerting on socket disconnect spikes and memory pressure.",
      ],
      caseStudy:
        "DevSync is a real-time collaborative code editor. The core challenge was conflict-free concurrent editing, solved with a CRDT model. It supports 50+ concurrent users per room with sub-100ms sync latency over WebSockets. Includes a presence and role-based permission system. Deployed with Docker on AWS EC2 behind Nginx, instrumented with Prometheus and Grafana for socket-disconnect and memory alerting.",
    },
    {
      id: "proj-shoplane",
      title: "ShopLane — Headless E-commerce Platform",
      liveUrl: "https://shoplane.example.com",
      codeUrl: "https://github.com/arsalan-dev/shoplane",
      stack: ["React", "Express", "MongoDB", "Stripe", "GitHub Actions"],
      bullets: [
        "Implemented full checkout flow with Stripe, idempotent order processing, and admin inventory dashboard.",
        "Achieved 98 Lighthouse performance score via image optimization, code splitting, and CDN caching.",
        "Covered checkout and refund paths with Jest integration tests running on every PR.",
      ],
      caseStudy:
        "ShopLane is a headless e-commerce platform with a React storefront and an Express/MongoDB backend. Implemented a full Stripe checkout flow with idempotent order processing to prevent double charges, plus an admin inventory dashboard. Optimized to a 98 Lighthouse performance score via image optimization, code splitting, and CDN caching. Checkout and refund paths covered with Jest integration tests in CI.",
    },
    {
      id: "proj-insightboard",
      title: "InsightBoard — Analytics & Reporting Dashboard",
      liveUrl: "https://insightboard.example.com",
      codeUrl: "https://github.com/arsalan-dev/insightboard",
      stack: ["Next.js", "GraphQL", "PostgreSQL", "Recharts", "AWS Lambda"],
      bullets: [
        "Built multi-tenant analytics dashboard aggregating 1M+ daily events into materialized views for sub-second chart loads.",
        "Implemented scheduled PDF report generation with AWS Lambda and S3 pre-signed delivery links.",
        "Added row-level security in PostgreSQL so tenants can never query across accounts.",
      ],
      caseStudy:
        "InsightBoard is a multi-tenant analytics and reporting dashboard. It aggregates 1M+ daily events into PostgreSQL materialized views for sub-second chart loads, served via GraphQL and rendered with Recharts. Scheduled PDF reports are generated by AWS Lambda and delivered via S3 pre-signed links. Tenant isolation is enforced with PostgreSQL row-level security.",
    },
    {
      id: "proj-jobpilot",
      title: "JobPilot — Job Application Tracker API",
      liveUrl: "",
      codeUrl: "https://github.com/arsalan-dev/jobpilot",
      stack: ["NestJS", "Prisma", "PostgreSQL", "Redis", "Swagger"],
      bullets: [
        "Designed a fully documented REST API (OpenAPI/Swagger) with JWT auth, refresh-token rotation, and rate limiting.",
        "Built background email-reminder jobs with BullMQ and Redis; 100% unit-test coverage on service layer.",
      ],
      caseStudy:
        "JobPilot is a job application tracker REST API built with NestJS and Prisma over PostgreSQL. Fully documented with OpenAPI/Swagger. Auth uses JWT with refresh-token rotation and per-route rate limiting. Background email-reminder jobs run on BullMQ + Redis. The service layer has 100% unit-test coverage.",
    },
  ];
}

// Build a fresh draft from a profile + the selected projects (all included by default).
export function draftFromProfile(profile: Profile, projects: ResumeProject[]): ResumeDraft {
  const draftProjects: DraftProject[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    liveUrl: p.liveUrl,
    codeUrl: p.codeUrl,
    stack: [...p.stack],
    bullets: [...p.bullets],
  }));
  return {
    basics: { ...profile.basics },
    summary: profile.summary,
    skills: profile.skills.map((s) => ({ category: s.category, items: [...s.items] })),
    experience: profile.experience.map((e) => ({ ...e, bullets: [...e.bullets] })),
    projects: draftProjects,
    certifications: profile.certifications.map((c) => ({ ...c })),
    education: profile.education.map((e) => ({ ...e })),
  };
}
