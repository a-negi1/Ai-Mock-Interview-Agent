import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { resumeAPI, interviewAPI } from "../services/api";

const STEPS = ["Resume", "Job details", "Review"];

function StepDot({ index, current }) {
  const done = index < current;
  const active = index === current;
  return (
    <div
      className={`step-dot ${active ? "active" : done ? "done" : ""}`}
      aria-current={active ? "step" : undefined}
    >
      {done ? "✓" : index + 1}
    </div>
  );
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [resumeText, setResumeText] = useState("");
  const [resumeFilename, setResumeFilename] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await resumeAPI.upload(formData);
      setResumeText(res.data.resumeText);
      setResumeFilename(res.data.filename);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Try a PDF, DOCX, or TXT file.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeAndReview = async () => {
    if (!jobTitle.trim()) return setError("Please enter a job title to continue.");
    setLoading(true);
    setError(null);
    try {
      if (jobDescription.trim()) {
        const res = await resumeAPI.analyze({ resumeText, jobDescription, jobTitle });
        setAnalysis(res.data);
      }
      setStep(2);
    } catch {
      setError("Analysis ran into an issue — proceeding anyway.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await interviewAPI.start({ jobTitle, jobDescription, resumeText });
      navigate(`/interview/${res.data.sessionId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create session. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="page-narrow fade-up" style={{ paddingTop: 48 }}>
      {}
      <a
        href="/dashboard"
        onClick={e => { e.preventDefault(); navigate("/dashboard"); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 13, color: "var(--text-2)", fontWeight: 500,
          marginBottom: 32, textDecoration: "none",
        }}
      >
        ← Back to dashboard
      </a>

      {}
      <div className="stepper" style={{ marginBottom: 40 }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <StepDot index={i} current={step} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: i === step ? "var(--brand)" : i < step ? "var(--green)" : "var(--text-3)",
                letterSpacing: "0.3px",
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 64, height: 1,
                background: i < step ? "var(--green)" : "var(--border)",
                margin: "0 8px", marginBottom: 22,
                transition: "background 0.3s ease",
              }} />
            )}
          </div>
        ))}
      </div>

      {}
      {error && (
        <div className="alert alert-danger fade-in" style={{ marginBottom: 20 }}>
          <span>⚠</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16, padding: 0 }}
          >✕</button>
        </div>
      )}

      {}
      {step === 0 && (
        <div className="card fade-up">
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Upload your resume</h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 28 }}>
            PDF, DOCX, or TXT · up to 10 MB
          </p>

          {}
          <div
            onClick={() => !loading && fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            style={{
              border: `2px dashed ${dragOver ? "var(--brand)" : "var(--border-strong)"}`,
              borderRadius: 16,
              padding: "48px 24px",
              textAlign: "center",
              cursor: loading ? "default" : "pointer",
              background: dragOver ? "var(--brand-light)" : "var(--surface-2)",
              transition: "all 0.2s ease",
              marginBottom: 28,
            }}
          >
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40,
                  border: "3px solid var(--border)", borderTopColor: "var(--brand)",
                  borderRadius: "50%", animation: "spin 0.7s linear infinite"
                }} />
                <span style={{ fontSize: 15, color: "var(--text-2)", fontWeight: 500 }}>
                  Parsing resume…
                </span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-1)", marginBottom: 8 }}>
                  Drop your resume here, or click to browse
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {["PDF", "DOCX", "TXT"].map(t => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])}
          />

          {}
          <div className="divider-text" style={{ marginBottom: 24, fontSize: 13, color: "var(--text-3)" }}>
            or paste text directly
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label>Resume text</label>
            <textarea
              placeholder="Paste your resume content here…"
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              rows={7}
              style={{ fontSize: 13, lineHeight: 1.7 }}
            />
          </div>

          {resumeText.length > 100 && (
            <button
              onClick={() => setStep(1)}
              className="btn btn-primary btn-lg fade-in"
              style={{ width: "100%" }}
            >
              Continue →
            </button>
          )}
        </div>
      )}

      {}
      {step === 1 && (
        <div className="card fade-up">
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Job details</h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>
            Tell us about the role — we'll tailor every question to it.
          </p>

          {}
          {resumeFilename && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--brand-light)", color: "var(--brand-hover)",
              borderRadius: 10, padding: "7px 14px",
              fontSize: 13, fontWeight: 600, marginBottom: 24
            }}>
              📄 {resumeFilename}
              <button
                onClick={() => { setStep(0); setResumeFilename(""); setResumeText(""); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "inherit", fontSize: 14, padding: 0, lineHeight: 1, marginLeft: 4
                }}
                title="Change resume"
              >✕</button>
            </div>
          )}

          <div className="field" style={{ marginBottom: 18 }}>
            <label>Job title *</label>
            <input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              autoFocus
            />
          </div>

          <div className="field" style={{ marginBottom: 28 }}>
            <label>
              Job description
              <span style={{ color: "var(--text-3)", fontWeight: 400, marginLeft: 6 }}>
                (optional · enables AI match + keyword ATS scoring)
              </span>
            </label>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the full job description for personalised questions and ATS match scoring…"
              rows={9}
              style={{ fontSize: 13, lineHeight: 1.7 }}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={() => setStep(0)} className="btn btn-secondary" style={{ flex: "0 0 auto" }}>
              ← Back
            </button>
            <button
              onClick={analyzeAndReview}
              disabled={loading || !jobTitle.trim()}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin 0.7s linear infinite", display: "inline-block"
                  }} />
                  Analysing…
                </span>
              ) : "Review & start →"}
            </button>
          </div>
        </div>
      )}

      {}
      {step === 2 && (
        <div className="card fade-up">
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Ready to start</h2>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 28 }}>
            Review your setup, then launch the interview.
          </p>

          {}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10, marginBottom: 24
          }}>
            {[
              { label: "Role", value: jobTitle },
              { label: "Resume", value: resumeFilename || "Text input" },
              { label: "Questions", value: "25 AI-generated" },
              { label: "Mode", value: "Voice + Text" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 12, padding: "14px 16px"
              }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{value}</div>
              </div>
            ))}
          </div>

          {}
          {analysis?.analysis && (
            <div className="fade-in" style={{
              background: "var(--green-bg)",
              border: "1px solid var(--green-border)",
              borderRadius: 16, padding: 22, marginBottom: 24
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 16
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--green-text)" }}>
                  ✅ AI Match
                  <span style={{ fontWeight: 500, opacity: 0.75, marginLeft: 6 }}>(semantic)</span>
                </h3>
                <span style={{
                  fontWeight: 800, fontSize: 20, color: "var(--green)",
                }}>
                  {analysis.analysis.matchScore}%
                </span>
              </div>

              {}
              <div className="progress" style={{ marginBottom: 18 }}>
                <div
                  className="progress-fill progress-fill-green"
                  style={{ width: `${analysis.analysis.matchScore}%` }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--green-text)", marginBottom: 8 }}>
                    Matched skills
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {analysis.analysis.matchedSkills?.slice(0, 6).map((s, i) => (
                      <span key={i} className="badge badge-green" style={{ fontSize: 11 }}>{s}</span>
                    ))}
                  </div>
                </div>
                {}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--amber-text)", marginBottom: 8 }}>
                    Missing skills
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {analysis.analysis.missingSkills?.slice(0, 5).map((s, i) => (
                      <span key={i} className="badge badge-amber" style={{ fontSize: 11 }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: "0 0 auto" }}>
              ← Edit
            </button>
            <button
              onClick={startInterview}
              disabled={loading}
              className="btn btn-success btn-lg"
              style={{ flex: 1 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin 0.7s linear infinite", display: "inline-block"
                  }} />
                  Creating session…
                </span>
              ) : "🚀 Start interview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
