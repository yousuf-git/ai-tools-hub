"use client";

import Editable from "./Editable";
import type { Basics, ResumeDraft } from "@/lib/resume/types";

export type Patch = (recipe: (draft: ResumeDraft) => void) => void;
export type PatchBasics = (recipe: (basics: Basics) => void) => void;

interface Props {
  draft: ResumeDraft;
  patch: Patch;
  /** Identity (name/role/contact) lives on the profile, not the draft, so it is
   *  entered once and always shown. The header edits it through `patchBasics`. */
  basics: Basics;
  patchBasics: PatchBasics;
}

const splitCsv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// Turn a raw field value into an href for the exported PDF. Empty → undefined
// so the field renders as plain editable text (no dangling link).
const httpHref = (v: string) => {
  const t = v.trim();
  if (!t) return undefined;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};
const mailHref = (v: string) => {
  const t = v.trim();
  return t ? `mailto:${t}` : undefined;
};

/**
 * Pure preview of the resume `draft`. Replicates docs/resume-template.html.
 * Every visible field is inline-editable; edits mutate the draft via `patch`.
 */
export default function ResumePreview({ draft, patch, basics, patchBasics }: Props) {
  return (
    <>
      {/* Template fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div className="resume-sheet resume-print-area">
        {/* ===== Header ===== */}
        <header>
          <Editable
            tag="div"
            className="name"
            value={basics.name}
            placeholder="Your Name"
            onCommit={(v) => patchBasics((b) => void (b.name = v))}
          />
          <Editable
            tag="div"
            className="role"
            value={basics.role}
            placeholder="Your Role"
            onCommit={(v) => patchBasics((b) => void (b.role = v))}
          />
          <div className="contact">
            <Editable
              value={basics.email}
              href={mailHref(basics.email)}
              placeholder="email"
              onCommit={(v) => patchBasics((b) => void (b.email = v))}
            />
            <Editable
              value={basics.phone}
              placeholder="phone"
              onCommit={(v) => patchBasics((b) => void (b.phone = v))}
            />
            <Editable
              value={basics.location}
              placeholder="location"
              onCommit={(v) => patchBasics((b) => void (b.location = v))}
            />
            <span>
              <Editable
                value={basics.portfolio}
                href={httpHref(basics.portfolio)}
                placeholder="portfolio"
                onCommit={(v) => patchBasics((b) => void (b.portfolio = v))}
              />
            </span>
            <span>
              <Editable
                value={basics.github}
                href={httpHref(basics.github)}
                placeholder="github"
                onCommit={(v) => patchBasics((b) => void (b.github = v))}
              />
            </span>
            <span>
              <Editable
                value={basics.linkedin}
                href={httpHref(basics.linkedin)}
                placeholder="linkedin"
                onCommit={(v) => patchBasics((b) => void (b.linkedin = v))}
              />
            </span>
          </div>
        </header>

        {/* ===== Summary ===== */}
        <section>
          <h2>Summary</h2>
          <Editable
            tag="p"
            multiline
            value={draft.summary}
            placeholder="Professional summary…"
            onCommit={(v) => patch((d) => void (d.summary = v))}
          />
        </section>

        {/* ===== Technical Skills ===== */}
        {draft.skills.length > 0 && (
          <section>
            <h2>Technical Skills</h2>
            {draft.skills.map((row, i) => (
              <div className="skill-row" key={`${row.category}-${i}`}>
                <Editable
                  className="skill-label"
                  value={row.category}
                  placeholder="Category"
                  onCommit={(v) => patch((d) => void (d.skills[i].category = v))}
                />
                <Editable
                  className="skill-items"
                  value={row.items.join(", ")}
                  placeholder="comma, separated, skills"
                  onCommit={(v) => patch((d) => void (d.skills[i].items = splitCsv(v)))}
                />
              </div>
            ))}
          </section>
        )}

        {/* ===== Experience ===== */}
        {draft.experience.length > 0 && (
          <section>
            <h2>Experience</h2>
            {draft.experience.map((exp, i) => (
              <div className="entry" key={exp.id}>
                <div className="entry-head">
                  <Editable
                    className="entry-title"
                    value={exp.title}
                    placeholder="Job Title"
                    onCommit={(v) => patch((d) => void (d.experience[i].title = v))}
                  />
                  <div className="entry-meta">
                    <Editable
                      value={exp.start}
                      placeholder="Start"
                      onCommit={(v) => patch((d) => void (d.experience[i].start = v))}
                    />
                    {" – "}
                    <Editable
                      value={exp.end}
                      placeholder="End"
                      onCommit={(v) => patch((d) => void (d.experience[i].end = v))}
                    />
                  </div>
                </div>
                <div className="entry-sub">
                  <Editable
                    value={exp.company}
                    placeholder="Company"
                    onCommit={(v) => patch((d) => void (d.experience[i].company = v))}
                  />
                  {" — "}
                  <Editable
                    value={exp.location}
                    placeholder="Location"
                    onCommit={(v) => patch((d) => void (d.experience[i].location = v))}
                  />
                </div>
                <ul>
                  {exp.bullets.map((b, j) => (
                    <Editable
                      key={j}
                      tag="li"
                      multiline
                      value={b}
                      placeholder="Achievement…"
                      onCommit={(v) =>
                        patch((d) => {
                          if (v) d.experience[i].bullets[j] = v;
                          else d.experience[i].bullets.splice(j, 1);
                        })
                      }
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* ===== Projects ===== */}
        {draft.projects.length > 0 && (
          <section>
            <h2>Projects</h2>
            {draft.projects.map((proj, i) => (
              <div className="entry" key={proj.id}>
                <div className="entry-head">
                  <div className="entry-title">
                    <Editable
                      value={proj.title}
                      placeholder="Project Title"
                      onCommit={(v) => patch((d) => void (d.projects[i].title = v))}
                    />
                    {(proj.liveUrl || proj.codeUrl) && (
                      <span className="ext">
                        ↗{" "}
                        {proj.liveUrl && (
                          <a href={httpHref(proj.liveUrl)} target="_blank" rel="noopener noreferrer">
                            live
                          </a>
                        )}
                        {proj.liveUrl && proj.codeUrl && " · "}
                        {proj.codeUrl && (
                          <a href={httpHref(proj.codeUrl)} target="_blank" rel="noopener noreferrer">
                            code
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <Editable
                  className="stack mono"
                  value={proj.stack.join(" · ")}
                  placeholder="Tech · stack"
                  onCommit={(v) =>
                    patch(
                      (d) =>
                        void (d.projects[i].stack = v
                          .split("·")
                          .map((x) => x.trim())
                          .filter(Boolean))
                    )
                  }
                />
                <ul>
                  {proj.bullets.map((b, j) => (
                    <Editable
                      key={j}
                      tag="li"
                      multiline
                      value={b}
                      placeholder="Detail…"
                      onCommit={(v) =>
                        patch((d) => {
                          if (v) d.projects[i].bullets[j] = v;
                          else d.projects[i].bullets.splice(j, 1);
                        })
                      }
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {/* ===== Certifications ===== */}
        {draft.certifications.length > 0 && (
          <section>
            <h2>Certifications</h2>
            {draft.certifications.map((c, i) => (
              <div className="line-item" key={c.id}>
                <Editable
                  tag="strong"
                  value={c.name}
                  placeholder="Certification name"
                  onCommit={(v) => patch((d) => void (d.certifications[i].name = v))}
                />
                <Editable
                  className="entry-meta"
                  value={c.year}
                  placeholder="Year"
                  onCommit={(v) => patch((d) => void (d.certifications[i].year = v))}
                />
              </div>
            ))}
          </section>
        )}

        {/* ===== Education ===== */}
        {draft.education.length > 0 && (
          <section>
            <h2>Education</h2>
            {draft.education.map((e, i) => (
              <div className="edu-item" key={e.id}>
                <div className="edu-head">
                  <div className="edu-line">
                    <Editable
                      tag="strong"
                      value={e.degree}
                      placeholder="Degree"
                      onCommit={(v) => patch((d) => void (d.education[i].degree = v))}
                    />
                    <span className="where">
                      {" — "}
                      <Editable
                        value={e.institution}
                        placeholder="Institution"
                        onCommit={(v) => patch((d) => void (d.education[i].institution = v))}
                      />
                    </span>
                  </div>
                  <div className="entry-meta">
                    <Editable
                      value={e.start}
                      placeholder="Start"
                      onCommit={(v) => patch((d) => void (d.education[i].start = v))}
                    />
                    {" – "}
                    <Editable
                      value={e.end}
                      placeholder="End"
                      onCommit={(v) => patch((d) => void (d.education[i].end = v))}
                    />
                  </div>
                </div>
                {e.detail !== undefined && (
                  <div className="edu-detail">
                    <Editable
                      value={e.detail}
                      placeholder="detail"
                      onCommit={(v) => patch((d) => void (d.education[i].detail = v))}
                    />
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
