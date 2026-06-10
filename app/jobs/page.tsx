'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Job {
  id: string;
  title: string;
  content: string;
  requiredSkills: string[];
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    setJobs(data.jobs ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        requiredSkills: requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setTitle('');
      setContent('');
      setRequiredSkills('');
      load();
    }
    setLoading(false);
  };

  const runMatch = async (jobId: string) => {
    setLoading(true);
    await fetch(`/api/jobs/${jobId}`, { method: 'POST' });
    setLoading(false);
    window.location.href = `/dashboard?jobId=${jobId}`;
  };

  return (
    <main className="container">
      <section className="header">
        <h1 className="title">Job Descriptions</h1>
        <p className="subtitle">Add a JD and match candidates by required skills.</p>
      </section>

      <section className="panel">
        <h2 className="section-title">Create job</h2>
        <form onSubmit={handleCreate}>
          <div className="field-group">
            <label>Job title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" required />
          </div>
          <div className="field-group">
            <label>Job description</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste full job description…"
              required
            />
          </div>
          <div className="field-group">
            <label>Required skills (comma-separated)</label>
            <input
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="Python, AWS, PostgreSQL, Kafka"
            />
          </div>
          <button type="submit" disabled={loading}>Save job</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="panel output-section">
        <h2 className="section-title">Saved jobs</h2>
        {jobs.length === 0 ? (
          <p className="muted">No jobs yet.</p>
        ) : (
          <ul className="job-list">
            {jobs.map((job) => (
              <li key={job.id} className="job-item">
                <div>
                  <strong>{job.title}</strong>
                  <p className="muted">{new Date(job.createdAt).toLocaleString()}</p>
                  <div className="tag-row compact">
                    {job.requiredSkills.map((s) => (
                      <span className="tag" key={s}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="action-row">
                  <button type="button" disabled={loading} onClick={() => runMatch(job.id)}>
                    Match candidates
                  </button>
                  <Link href={`/dashboard?jobId=${job.id}`} className="text-link">View rankings</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
