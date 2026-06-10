'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface ProjectPeerRow {
  projectId: string;
  candidateId: string;
  candidateName: string;
  projectName: string;
  clientName: string | null;
  projectType: string | null;
  duration: string | null;
  role: string | null;
}

interface ProjectPeerMatch {
  clientDisplay: string;
  projectTypeDisplay: string;
  projects: ProjectPeerRow[];
  pairs: Array<{
    projectA: ProjectPeerRow;
    projectB: ProjectPeerRow;
    overlapNote: string;
  }>;
}

export default function ProjectMatchesPage() {
  const [matches, setMatches] = useState<ProjectPeerMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/project-matches');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load');
      setMatches([]);
    } else {
      setMatches(data.matches ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="container">
      <h1 className="page-title">Same-client project matches</h1>
      <p className="muted page-lead">
        Candidates who likely worked on the same client engagement: matching client name, project type,
        and overlapping timelines (±1 month buffer). Employers may differ.
      </p>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && matches.length === 0 && (
        <div className="empty-state">
          <p>No cross-candidate matches yet.</p>
          <p className="muted">
            Parse resumes with client and project type filled in, and include date ranges on projects.
          </p>
        </div>
      )}

      {matches.map((group) => (
        <section className="peer-match-group card-block" key={`${group.clientDisplay}-${group.projectTypeDisplay}`}>
          <header className="peer-match-header">
            <div>
              <h2 className="section-title">{group.clientDisplay}</h2>
              <p className="muted">{group.projectTypeDisplay}</p>
            </div>
            <span className="tag">{group.pairs.length} overlap{group.pairs.length === 1 ? '' : 's'}</span>
          </header>

          <div className="peer-match-projects">
            {group.projects.map((p) => (
              <div className="peer-project-chip" key={p.projectId}>
                <Link href={`/candidates/${p.candidateId}`} className="peer-link">
                  {p.candidateName}
                </Link>
                <span className="muted"> — {p.projectName}</span>
                {p.duration && <span className="muted"> ({p.duration})</span>}
              </div>
            ))}
          </div>

          <ul className="peer-pair-list">
            {group.pairs.map((pair) => (
              <li key={`${pair.projectA.projectId}-${pair.projectB.projectId}`}>
                <Link href={`/candidates/${pair.projectA.candidateId}`}>{pair.projectA.candidateName}</Link>
                {' ↔ '}
                <Link href={`/candidates/${pair.projectB.candidateId}`}>{pair.projectB.candidateName}</Link>
                <span className="muted"> — {pair.overlapNote}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
