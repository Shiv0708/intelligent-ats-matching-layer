'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PIPELINE_STAGES } from '@/lib/pipeline-stages';

interface ApplicationCard {
  id: string;
  candidateId: string;
  candidateName: string;
  email: string | null;
  jobTitle: string | null;
  credibilityScore: number | null;
  totalExperience: string | null;
  stage: string;
  notes: string | null;
}

interface Job {
  id: string;
  title: string;
}

export default function PipelinePage() {
  const [board, setBoard] = useState<Record<string, ApplicationCard[]>>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobFilter, setJobFilter] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = jobFilter ? `?jobId=${jobFilter}` : '';
    const [pipelineRes, jobsRes] = await Promise.all([
      fetch(`/api/pipeline${params}`),
      fetch('/api/jobs'),
    ]);
    const pipelineData = await pipelineRes.json();
    const jobsData = await jobsRes.json();
    setBoard(pipelineData.board ?? {});
    setJobs(jobsData.jobs ?? []);
    setLoading(false);
  }, [jobFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredBoard = useMemo(() => {
    if (!candidateQuery) return board;
    const q = candidateQuery.trim().toLowerCase();
    const result: Record<string, ApplicationCard[]> = {};
    PIPELINE_STAGES.forEach((s) => {
      result[s.id] = (board[s.id] ?? []).filter((card) => {
        return (
          (card.candidateName || '').toLowerCase().includes(q) ||
          (card.jobTitle || '').toLowerCase().includes(q) ||
          (card.email || '').toLowerCase().includes(q)
        );
      });
    });
    return result;
  }, [board, candidateQuery]);

  const doSearch = () => setCandidateQuery(pendingQuery);
  const clearSearch = () => {
    setPendingQuery('');
    setCandidateQuery('');
  };

  const moveCard = async (applicationId: string, newStage: string) => {
    const res = await fetch(`/api/pipeline/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    });
    if (res.ok) await load();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const applicationId = e.dataTransfer.getData('applicationId');
    if (applicationId) moveCard(applicationId, stageId);
    setDraggingId(null);
  };

  const totalCount = Object.values(board).reduce((sum, col) => sum + col.length, 0);

  return (
    <main className="container container-wide">
      <section className="header row-header">
        <div>
          <h1 className="title">Recruitment Pipeline</h1>
          <p className="subtitle">
            Track candidates through every hiring stage. Drag cards between columns to update status.
          </p>
        </div>
        <div className="filter-row pipeline-filters">
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={() => load()}>
            Refresh
          </button>
        </div>

        <div className="pipeline-search-row">
          <input
            className="pipeline-search-input"
            type="search"
            placeholder="Search candidates, job or email"
            value={pendingQuery}
            onChange={(e) => setPendingQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
          />
          <button type="button" className="pipeline-search-btn" onClick={doSearch}>Search</button>
          <button type="button" className="btn-secondary" onClick={clearSearch}>Clear</button>
        </div>
      </section>

      <section className="pipeline-legend panel">
        <p className="muted">{totalCount} active application{totalCount === 1 ? '' : 's'} in pipeline</p>
        <div className="stage-legend">
          {PIPELINE_STAGES.map((s) => (
            <span key={s.id} className="legend-item" style={{ background: s.color }}>
              {s.label}
            </span>
          ))}
        </div>
      </section>

      {loading ? (
        <p className="muted">Loading pipeline…</p>
      ) : (
        <div className="pipeline-board">
          {PIPELINE_STAGES.map((stage) => {
            const cards = filteredBoard[stage.id] ?? [];
            return (
              <div
                key={stage.id}
                className="pipeline-column"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div
                  className="pipeline-column-header"
                  style={{ borderColor: stage.color, background: stage.color }}
                >
                  <h3>{stage.label}</h3>
                  <span className="pipeline-count">{cards.length}</span>
                  <p className="pipeline-stage-desc">{stage.description}</p>
                </div>
                <div className="pipeline-cards">
                  {cards.length === 0 ? (
                    <p className="pipeline-empty">Drop here</p>
                  ) : (
                    cards.map((card) => (
                      <div
                        key={card.id}
                        className={`pipeline-card ${draggingId === card.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('applicationId', card.id);
                          setDraggingId(card.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                      >
                        <strong>{card.candidateName}</strong>
                        {card.jobTitle && <span className="pipeline-job">{card.jobTitle}</span>}
                        <span className="muted">{card.email || 'No email'}</span>
                        {card.totalExperience && <span className="muted">{card.totalExperience}</span>}
                        {card.credibilityScore !== null && (
                          <span className="pipeline-cred">Credibility {card.credibilityScore}</span>
                        )}
                        <div className="pipeline-card-actions">
                          <Link href={`/candidates/${card.candidateId}`} className="text-link">
                            Profile
                          </Link>
                          <select
                            value={card.stage}
                            onChange={(e) => moveCard(card.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
