'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { PIPELINE_STAGES } from '@/lib/pipeline-stages';

interface Ranking {
  matchId: string;
  candidateId: string;
  candidateName: string;
  email: string | null;
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  notes: string | null;
  credibilityScore: number | null;
}

interface Job {
  id: string;
  title: string;
}

interface DashboardMetrics {
  openJobs: number;
  activeCandidates: number;
  applicationsInPipeline: number;
  pipelineByStage: Record<string, number>;
  hiredThisPeriod: number;
  rejectedCount: number;
  inActiveStages: number;
  avgFitScore: number | null;
  fitDistribution: { strong: number; medium: number; weak: number };
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('jobId');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(jobIdParam ?? '');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const jid = selectedJobId || jobIdParam || '';
    const url = jid ? `/api/dashboard?jobId=${encodeURIComponent(jid)}` : '/api/dashboard';
    const res = await fetch(url);
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setMetrics(data.metrics ?? null);
    setRankings(data.rankings ?? []);
    if (!jid && data.jobs?.[0]) {
      setSelectedJobId(data.jobs[0].id);
    }
    setLoading(false);
  }, [selectedJobId, jobIdParam]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (jobIdParam) setSelectedJobId(jobIdParam);
  }, [jobIdParam]);

  const runMatch = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    await fetch(`/api/jobs/${selectedJobId}`, { method: 'POST' });
    await loadDashboard();
  };

  const selectedJobTitle = jobs.find((j) => j.id === selectedJobId)?.title ?? 'Selected job';

  const pipelineTotal =
    metrics?.applicationsInPipeline ??
    PIPELINE_STAGES.reduce((sum, s) => sum + (metrics?.pipelineByStage[s.id] ?? 0), 0);

  const maxStageCount = Math.max(
    1,
    ...PIPELINE_STAGES.map((s) => metrics?.pipelineByStage[s.id] ?? 0)
  );

  const fitTotal =
    (metrics?.fitDistribution.strong ?? 0) +
    (metrics?.fitDistribution.medium ?? 0) +
    (metrics?.fitDistribution.weak ?? 0);

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero row-header">
        <div>
          <h1 className="title">Dashboard</h1>
          <p className="subtitle">
            At-a-glance metrics, pipeline distribution, and candidate fit for the selected role.
          </p>
        </div>
        <button type="button" className="btn-secondary" disabled={loading || !selectedJobId} onClick={runMatch}>
          Re-run matching
        </button>
      </section>

      {loading && !metrics ? (
        <p className="muted">Loading metrics…</p>
      ) : metrics ? (
        <section className="stats-grid" aria-label="Summary metrics">
          <div className="stat-card stat-card--jobs">
            <div className="stat-card-label">Open jobs</div>
            <div className="stat-card-value">{metrics.openJobs}</div>
            <p className="stat-card-hint">Active job postings</p>
          </div>
          <div className="stat-card stat-card--candidates">
            <div className="stat-card-label">Candidates</div>
            <div className="stat-card-value">{metrics.activeCandidates}</div>
            <p className="stat-card-hint">Profiles in database</p>
          </div>
          <div className="stat-card stat-card--pipeline">
            <div className="stat-card-label">Pipeline</div>
            <div className="stat-card-value">{metrics.applicationsInPipeline}</div>
            <p className="stat-card-hint">{metrics.inActiveStages} in active stages</p>
          </div>
          <div className="stat-card stat-card--outcomes">
            <div className="stat-card-label">Outcomes</div>
            <div className="stat-card-value">
              <span style={{ color: '#166534' }}>{metrics.hiredThisPeriod}</span>
              <span className="muted" style={{ fontSize: '1.25rem', margin: '0 6px' }}>/</span>
              <span style={{ color: '#991b1b' }}>{metrics.rejectedCount}</span>
            </div>
            <p className="stat-card-hint">Hired vs rejected</p>
          </div>
        </section>
      ) : null}

      {metrics && (
        <section className="dashboard-section" aria-labelledby="pipeline-heading">
          <div className="dashboard-section-header">
            <div>
              <h2 id="pipeline-heading" className="dashboard-section-title">
                Recruitment pipeline
              </h2>
              <p className="dashboard-section-sub">
                Distribution across {pipelineTotal} application{pipelineTotal === 1 ? '' : 's'} — use{' '}
                <Link href="/pipeline" className="text-link">Pipeline</Link> to move candidates.
              </p>
            </div>
          </div>

          <div className="pipeline-stack-wrap">
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 8 }}>
              Relative volume by stage
            </p>
            <div className="pipeline-stack-bar" role="img" aria-label="Pipeline distribution stacked bar">
              {PIPELINE_STAGES.some((s) => (metrics.pipelineByStage[s.id] ?? 0) > 0) ? (
                PIPELINE_STAGES.map((s) => {
                  const count = metrics.pipelineByStage[s.id] ?? 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={s.id}
                      className="pipeline-stack-seg"
                      style={{
                        flex: Math.max(count, 0.001),
                        background: s.color,
                        borderRight: '1px solid rgba(255,255,255,0.35)',
                      }}
                      title={`${s.label}: ${count}`}
                    />
                  );
                })
              ) : (
                <div style={{ flex: 1, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                  No applications in pipeline yet
                </div>
              )}
            </div>
          </div>

          <div className="pipeline-stage-rows">
            {PIPELINE_STAGES.map((s) => {
              const count = metrics.pipelineByStage[s.id] ?? 0;
              const widthPct = (count / maxStageCount) * 100;
              return (
                <div key={s.id} className="pipeline-stage-row">
                  <span className="pipeline-stage-row-label">{s.label}</span>
                  <div className="pipeline-mini-track">
                    <div
                      className="pipeline-mini-fill"
                      style={{ width: `${widthPct}%`, background: s.color }}
                    />
                  </div>
                  <span className="pipeline-stage-count">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2 className="dashboard-section-title">Job & fit analysis</h2>
            <p className="dashboard-section-sub">Select a job to see average match quality and ranked candidates.</p>
          </div>
        </div>
        <div className="field-group" style={{ marginBottom: 16 }}>
          <label htmlFor="dash-job">Select job</label>
          <select
            id="dash-job"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <option value="">— Select —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>

        {selectedJobId && metrics?.avgFitScore !== null && metrics.avgFitScore !== undefined && fitTotal > 0 && (
          <div
            className="dashboard-section"
            style={{
              marginBottom: 20,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div className="dashboard-section-header" style={{ borderBottomColor: '#e2e8f0' }}>
              <div>
                <h3 className="dashboard-section-title" style={{ fontSize: '1rem' }}>
                  Fit score spread — {selectedJobTitle}
                </h3>
                <p className="dashboard-section-sub">
                  Average fit: <strong>{metrics.avgFitScore}%</strong> across {fitTotal} matched candidate
                  {fitTotal === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="fit-bars">
              <div className="fit-bar-row">
                <span className="fit-bar-label fit-bar-label--strong">Strong (70%+)</span>
                <div className="fit-bar-track">
                  <div
                    className="fit-bar-fill fit-bar-fill--strong"
                    style={{ width: `${fitTotal ? (metrics.fitDistribution.strong / fitTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="fit-bar-pct">{metrics.fitDistribution.strong}</span>
              </div>
              <div className="fit-bar-row">
                <span className="fit-bar-label fit-bar-label--medium">Medium (40–69%)</span>
                <div className="fit-bar-track">
                  <div
                    className="fit-bar-fill fit-bar-fill--medium"
                    style={{ width: `${fitTotal ? (metrics.fitDistribution.medium / fitTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="fit-bar-pct">{metrics.fitDistribution.medium}</span>
              </div>
              <div className="fit-bar-row">
                <span className="fit-bar-label fit-bar-label--weak">Weak (&lt;40%)</span>
                <div className="fit-bar-track">
                  <div
                    className="fit-bar-fill fit-bar-fill--weak"
                    style={{ width: `${fitTotal ? (metrics.fitDistribution.weak / fitTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="fit-bar-pct">{metrics.fitDistribution.weak}</span>
              </div>
            </div>
          </div>
        )}

        {selectedJobId && fitTotal === 0 && !loading && (
          <div className="empty-state-box" style={{ marginBottom: 20 }}>
            No match data yet for this job. Run matching from the{' '}
            <Link href="/jobs" className="text-link">Jobs</Link> page, then refresh or re-run above.
          </div>
        )}

        <div className="rankings-panel">
          <h3 className="dashboard-section-title" style={{ fontSize: '1rem', marginBottom: 12 }}>
            Candidate rankings
          </h3>
          {loading ? (
            <p className="muted">Loading rankings…</p>
          ) : !selectedJobId ? (
            <p className="muted">Select a job to see ranked candidates.</p>
          ) : rankings.length === 0 ? (
            <p className="muted">No rankings yet. Run matching for this job.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Fit</th>
                    <th>Matched</th>
                    <th>Missing</th>
                    <th>Cred.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, i) => (
                    <tr key={r.matchId}>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#ffedd5' : '#f8fafc',
                            color: '#0f172a',
                          }}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <strong>{r.candidateName}</strong>
                        <br />
                        <span className="muted">{r.email || '—'}</span>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div className="fit-bar-track" style={{ height: 8, marginBottom: 4 }}>
                          <div
                            className={`fit-bar-fill ${
                              r.fitScore >= 70
                                ? 'fit-bar-fill--strong'
                                : r.fitScore >= 40
                                  ? 'fit-bar-fill--medium'
                                  : 'fit-bar-fill--weak'
                            }`}
                            style={{ width: `${r.fitScore}%` }}
                          />
                        </div>
                        <span className={`fit-score ${r.fitScore >= 70 ? 'score-good' : r.fitScore >= 40 ? 'score-ok' : 'score-low'}`}>
                          {r.fitScore}%
                        </span>
                      </td>
                      <td>
                        <div className="tag-row compact">
                          {r.matchedSkills.slice(0, 6).map((s) => (
                            <span className="tag tag-match" key={s}>{s}</span>
                          ))}
                          {r.matchedSkills.length > 6 && (
                            <span className="muted">+{r.matchedSkills.length - 6}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="tag-row compact">
                          {r.missingSkills.slice(0, 4).map((s) => (
                            <span className="tag tag-miss" key={s}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td>{r.credibilityScore ?? '—'}</td>
                      <td>
                        <Link href={`/candidates/${r.candidateId}`} className="text-link">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="dashboard-page"><p className="muted">Loading…</p></main>}>
      <DashboardContent />
    </Suspense>
  );
}
