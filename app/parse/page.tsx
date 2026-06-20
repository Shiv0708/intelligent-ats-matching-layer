'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Job {
  id: string;
  title: string;
}

export default function HomePage() {
  const [resumeText, setResumeText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [classification, setClassification] = useState<{
    classification: string;
    confidence: number;
    reason: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []));
  }, []);

  const setFileFromList = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const name = f.name.toLowerCase();
    if (name.endsWith('.pdf') || name.endsWith('.docx')) {
      setFile(f);
      setError(null);
    } else {
      setError('Please upload a PDF or DOCX file.');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setFileFromList(e.dataTransfer.files);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resumeText.trim() && !file) {
      setError('Paste resume text or upload a PDF/DOCX file.');
      return;
    }

    setLoading(true);
    setError(null);
    setSavedId(null);
    setClassification(null);

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('text', resumeText);
      if (jobId) formData.append('jobId', jobId);

      const response = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Parser error');

      setSavedId(data.candidate.id);
      if (data.classification) {
        setClassification(data.classification);
      }
      setResumeText('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parse-page">
      <section className="parse-hero">
        <div className="parse-hero-bg" aria-hidden />
        <div className="parse-hero-inner">
          <span className="parse-hero-badge">
            <span className="parse-hero-badge-dot" />
            AI-powered · Gemini
          </span>
          <h1 className="parse-hero-title">
            Turn resumes into
            <span className="parse-hero-accent"> structured talent data</span>
          </h1>
          <p className="parse-hero-desc">
            Upload a PDF or DOCX, or paste text. We extract education, internships, skills, projects, and impact—then
            place the candidate in your pipeline at <strong>Applied</strong>.
          </p>
          <ul className="parse-hero-features">
            <li>
              <span className="parse-feature-icon" aria-hidden></span>
              Project-centric profiles
            </li>
            <li>
              <span className="parse-feature-icon" aria-hidden></span>
              Credibility scoring
            </li>
            <li>
              <span className="parse-feature-icon" aria-hidden></span>
              Job matching ready
            </li>
          </ul>
        </div>
      </section>

      <main className="parse-main">
        <form className="parse-form-card" onSubmit={handleSubmit}>
          <div className="parse-form-header">
            <h2>Submit a resume</h2>
            <p>Choose a role (optional), then upload or paste below.</p>
          </div>

          <div className="parse-field">
            <label htmlFor="jobSelect">Apply to job</label>
            <select id="jobSelect" className="parse-select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">General application</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          <div className="parse-upload-grid">
            <div className="parse-upload-col">
              <label className="parse-label">Upload file</label>
              <div
                className={`parse-dropzone ${dragOver ? 'parse-dropzone--active' : ''} ${file ? 'parse-dropzone--has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  ref={fileInputRef}
                  id="resumeFile"
                  type="file"
                  className="parse-file-input"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFileFromList(e.target.files)}
                />
                {file ? (
                  <>
                    <span className="parse-dropzone-icon parse-dropzone-icon--success">✓</span>
                    <p className="parse-dropzone-title">{file.name}</p>
                    <p className="parse-dropzone-hint">Click or drop to replace</p>
                  </>
                ) : (
                  <>
                    <span className="parse-dropzone-icon">📄</span>
                    <p className="parse-dropzone-title">Drop PDF or DOCX here</p>
                    <p className="parse-dropzone-hint">or click to browse</p>
                  </>
                )}
              </div>
            </div>

            <div className="parse-divider">
              <span>or</span>
            </div>

            <div className="parse-upload-col parse-upload-col--grow">
              <label htmlFor="resumeText" className="parse-label">Paste resume text</label>
              <textarea
                id="resumeText"
                className="parse-textarea"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Education, internships, skills, projects…"
              />
            </div>
          </div>

          <button type="submit" className="parse-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="parse-spinner" aria-hidden />
                Parsing with AI…
              </>
            ) : (
              <>Parse & save to database</>
            )}
          </button>

          {error && (
            <div className="parse-alert parse-alert--error" role="alert">
              {error}
            </div>
          )}

          {savedId && (
            <div className="parse-alert parse-alert--success" role="status">
              <p className="parse-success-title">Candidate saved successfully</p>
              <p className="parse-success-desc">Added to pipeline at Applied stage.</p>
              
              {classification && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  textAlign: 'left'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    AI Resume Classification
                  </p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: classification.classification === 'Technical' ? '#dcfce7' : classification.classification === 'Non-Technical' ? '#fee2e2' : '#fef9c3',
                      color: classification.classification === 'Technical' ? '#166534' : classification.classification === 'Non-Technical' ? '#991b1b' : '#854d0e'
                    }}>
                      {classification.classification}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Confidence: {Math.round(classification.confidence * 100)}%
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    <strong>Reason:</strong> {classification.reason}
                  </p>
                </div>
              )}

              <div className="parse-success-actions" style={{ marginTop: '16px' }}>
                <Link href={`/candidates/${savedId}`} className="parse-success-btn parse-success-btn--primary">
                  View profile
                </Link>
                <Link href="/pipeline" className="parse-success-btn">
                  Open pipeline
                </Link>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
