"use client";

import Editable from "./Editable";
import type { ResumeDraft } from "@/lib/resume/types";

export type Patch = (recipe: (draft: ResumeDraft) => void) => void;

interface Props {
  draft: ResumeDraft;
  patch: Patch;
}

const splitCsv = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * Pure preview of the resume `draft`. Replicates docs/resume-template.html.
 * Every visible field is inline-editable; edits mutate the draft via `patch`.
 */
export default function ResumePreview({ draft, patch }: Props) {
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
            value={draft.basics.name}
            placeholder="Your Name"
            onCommit={(v) => patch((d) => void (d.basics.name = v))}
          />
          <Editable
            tag="div"
            className="role"
            value={draft.basics.role}
            placeholder="Your Role"
            onCommit={(v) => patch((d) => void (d.basics.role = v))}
          />
          <div className="contact">
            <Editable
              value={draft.basics.email}
              placeholder="email"
              onCommit={(v) => patch((d) => void (d.basics.email = v))}
            />
            <Editable
              value={draft.basics.phone}
              placeholder="phone"
              onCommit={(v) => patch((d) => void (d.basics.phone = v))}
            />
            <Editable
              value={draft.basics.location}
              placeholder="location"
              onCommit={(v) => patch((d) => void (d.basics.location = v))}
            />
            <span>
              <Editable
                value={draft.basics.portfolio}
                placeholder="portfolio"
                onCommit={(v) => patch((d) => void (d.basics.portfolio = v))}
              />
            </span>
            <span>
              <Editable
                value={draft.basics.github}
                placeholder="github"
                onCommit={(v) => patch((d) => void (d.basics.github = v))}
              />
            </span>
            <span>
              <Editable
                value={draft.basics.linkedin}
                placeholder="linkedin"
                onCommit={(v) => patch((d) => void (d.basics.linkedin = v))}
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
                        ↗ {[proj.liveUrl && "live", proj.codeUrl && "code"].filter(Boolean).join(" · ")}
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
              <div className="line-item" key={e.id}>
                <div>
                  <Editable
                    tag="strong"
                    value={e.degree}
                    placeholder="Degree"
                    onCommit={(v) => patch((d) => void (d.education[i].degree = v))}
                  />{" "}
                  <span className="where">
                    {"— "}
                    <Editable
                      value={e.institution}
                      placeholder="Institution"
                      onCommit={(v) => patch((d) => void (d.education[i].institution = v))}
                    />
                    {e.detail !== undefined && (
                      <>
                        {" · "}
                        <Editable
                          value={e.detail}
                          placeholder="detail"
                          onCommit={(v) => patch((d) => void (d.education[i].detail = v))}
                        />
                      </>
                    )}
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
            ))}
          </section>
        )}
      </div>
    </>
  );
}
