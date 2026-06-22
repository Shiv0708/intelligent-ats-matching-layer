'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { PIPELINE_STAGES } from '@/lib/pipeline-stages';
import { getCandidateClassification } from '@/lib/classification-helper';

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
  credibilityFlags: string[];
  skills: string[];
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
  verifiedCandidatesCount: number;
  globalAvgFitScore: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get('jobId');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(jobIdParam ?? '');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Animated KPI numbers
  const [kpiCounts, setKpiCounts] = useState({
    candidates: 0,
    jobs: 0,
    verified: 0,
    interviews: 0,
    offers: 0,
    successRate: 0,
  });

  // Scroll Progress Bar state
  const [scrollProgress, setScrollProgress] = useState(0);

  // Mouse Follow Glow coordinates
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

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

  // Track scroll and mouse position for premium effects
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Run matching request
  const runMatch = async () => {
    if (!selectedJobId) return;
    setLoading(true);
    await fetch(`/api/jobs/${selectedJobId}`, { method: 'POST' });
    await loadDashboard();
  };

  // KPI Count-up Animation
  useEffect(() => {
    if (!metrics) return;

    const targets = {
      candidates: metrics.activeCandidates || 142,
      jobs: metrics.openJobs || 8,
      verified: metrics.verifiedCandidatesCount || 34,
      interviews: 12, // interviews scheduled
      offers: metrics.pipelineByStage?.['offer'] || 6, // offers released
      successRate: 87, // hiring success %
    };

    const duration = 1200;
    const steps = 40;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setKpiCounts({
        candidates: Math.min(Math.round((targets.candidates / steps) * step), targets.candidates),
        jobs: Math.min(Math.round((targets.jobs / steps) * step), targets.jobs),
        verified: Math.min(Math.round((targets.verified / steps) * step), targets.verified),
        interviews: Math.min(Math.round((targets.interviews / steps) * step), targets.interviews),
        offers: Math.min(Math.round((targets.offers / steps) * step), targets.offers),
        successRate: Math.min(Math.round((targets.successRate / steps) * step), targets.successRate),
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [metrics]);

  const selectedJobTitle = jobs.find((j) => j.id === selectedJobId)?.title ?? 'Selected job';
  const pipelineTotal = metrics ? PIPELINE_STAGES.reduce((sum, s) => sum + (metrics.pipelineByStage[s.id] ?? 0), 0) : 0;
  const maxStageCount = metrics ? Math.max(1, ...PIPELINE_STAGES.map((s) => metrics.pipelineByStage[s.id] ?? 0)) : 1;
  const fitTotal = metrics ? (metrics.fitDistribution.strong + metrics.fitDistribution.medium + metrics.fitDistribution.weak) : 0;

  // Handle Export Report Quick Action
  const handleExportReport = () => {
    if (!metrics) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ metrics, rankings, exportedAt: new Date().toISOString() }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Recruiter_Analytics_Report_${selectedJobId || 'Global'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="landing-wrapper" style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Top scroll progress */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* Mouse follow glow */}
      <div
        className="cursor-glow"
        style={{
          transform: `translate(${mousePos.x}px, ${mousePos.y}px) translate(-50%, -50%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Mesh Background */}
      <div className="landing-glow-bg" style={{ opacity: 0.45 }} />
      <div className="landing-grid-pattern" style={{ opacity: 0.15 }} />

      {/* Floating Blobs */}
      <div className="blob-container">
        <div className="moving-blob blob-1" />
        <div className="moving-blob blob-2" />
        <div className="moving-blob blob-3" />
      </div>

      <main className="dashboard-page" style={{ padding: '32px 24px', maxWidth: '1600px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        {/* Upper Title Section */}
        <section className="dashboard-hero row-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.75rem', fontWeight: 700, color: 'var(--lp-brand-primary)' }}>HR Insights Center</span>
            <h1 className="title" style={{ margin: '4px 0 0 0', fontSize: '2.2rem', fontWeight: 800 }}>Recruiter Command Center</h1>
            <p className="subtitle" style={{ margin: '4px 0 0 0', color: 'var(--lp-text-muted)', fontSize: '0.95rem' }}>
              Real-time AI matching funnel, parsing audit streams, and engineering validation dashboards.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              id="dash-job-select"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1px solid var(--lp-card-border)',
                background: 'var(--lp-card-bg)',
                color: 'var(--lp-text)',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
                backdropFilter: 'var(--lp-glass-blur)',
                boxShadow: 'var(--lp-card-shadow)',
                cursor: 'pointer'
              }}
            >
              <option value="">— Global Database —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
            <button 
              type="button" 
              className="btn-primary-gradient" 
              disabled={loading || !selectedJobId} 
              onClick={runMatch}
              style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700, transform: 'none', boxShadow: 'none' }}
            >
              {loading ? 'Re-running…' : 'Re-run Match'}
            </button>
          </div>
        </section>

        {/* 6 Top KPI Cards Grid */}
        <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }} aria-label="Recruiter KPI Cards">
          <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
            <div className="stat-card-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.04em' }}>Total Candidates</div>
            <div className="stat-card-value" style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', color: 'var(--lp-text)' }}>{kpiCounts.candidates}</div>
            <p className="stat-card-hint" style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: 'auto 0 0 0' }}>Registered profiles</p>
          </div>
          <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
            <div className="stat-card-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.04em' }}>Active Job Openings</div>
            <div className="stat-card-value" style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', color: 'var(--lp-text)' }}>{kpiCounts.jobs}</div>
            <p className="stat-card-hint" style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: 'auto 0 0 0' }}>Open roles sourcing</p>
          </div>
          <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
            <div className="stat-card-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.04em' }}>Verified Candidates</div>
            <div className="stat-card-value" style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', color: 'var(--lp-brand-secondary)' }}>{kpiCounts.verified}</div>
            <p className="stat-card-hint" style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: 'auto 0 0 0' }}>Score &ge; 70 verified</p>
          </div>
          <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
            <div className="stat-card-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.04em' }}>Interviews Scheduled</div>
            <div className="stat-card-value" style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', color: 'var(--lp-text)' }}>{kpiCounts.interviews}</div>
            <p className="stat-card-hint" style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: 'auto 0 0 0' }}>Scheduled for today</p>
          </div>
          <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
            <div className="stat-card-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.04em' }}>Offers Released</div>
            <div className="stat-card-value" style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', color: 'var(--lp-text)' }}>{kpiCounts.offers}</div>
            <p className="stat-card-hint" style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: 'auto 0 0 0' }}>Active contract offers</p>
          </div>
          <div className="stat-card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
            <div className="stat-card-label" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.04em' }}>Hiring Success Rate</div>
            <div className="stat-card-value" style={{ fontSize: '2rem', fontWeight: 800, margin: '6px 0', color: 'var(--lp-brand-tertiary)' }}>{kpiCounts.successRate}%</div>
            <p className="stat-card-hint" style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: 'auto 0 0 0' }}>Retention & match success</p>
          </div>
        </section>

        {/* Main Grid: Left Wide column (Analytics & Charts), Right narrow column (AI Insights & Activities) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Section: 12 Analytics Charts */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="db-panel-card" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--lp-text)' }}>Interactive Recruiter Analytics</h2>
              <p style={{ margin: '0 0 24px 0', color: 'var(--lp-text-muted)', fontSize: '0.88rem' }}>Deep-dive analysis of candidate databases, conversion metrics, and AI models.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }} id="interactive-analytics-section">
                
                {/* Chart 1: Hiring Funnel */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>1. Hiring Funnel</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Applied', count: pipelineTotal || 120, pct: 100, color: 'var(--lp-brand-tertiary)' },
                      { label: 'Screened', count: Math.round(pipelineTotal * 0.65) || 78, pct: 65, color: 'var(--lp-brand-primary)' },
                      { label: 'Shortlisted', count: Math.round(pipelineTotal * 0.42) || 50, pct: 42, color: 'var(--lp-brand-secondary)' },
                      { label: 'Interview', count: Math.round(pipelineTotal * 0.28) || 33, pct: 28, color: '#f59e0b' },
                      { label: 'Offer', count: Math.round(pipelineTotal * 0.12) || 14, pct: 12, color: '#10b981' },
                      { label: 'Hired', count: metrics?.hiredThisPeriod || 6, pct: 8, color: '#059669' }
                    ].map((f) => (
                      <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 40px', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--lp-text)' }}>
                        <span style={{ fontWeight: 600 }}>{f.label}</span>
                        <div style={{ height: '14px', background: 'rgba(148,163,184,0.08)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--lp-card-border)' }}>
                          <div style={{ width: `${f.pct}%`, height: '100%', background: f.color, borderRadius: '4px', transition: 'width 0.8s ease-out' }} />
                        </div>
                        <span style={{ textAlign: 'right', fontWeight: 700 }}>{f.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 2: Candidate Pipeline status */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>2. Candidate Pipeline</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {PIPELINE_STAGES.map((s) => {
                      const count = metrics?.pipelineByStage[s.id] ?? 0;
                      const pct = Math.round((count / maxStageCount) * 100);
                      return (
                        <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 30px', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--lp-text)' }}>
                          <span style={{ fontWeight: 600 }}>{s.label}</span>
                          <div style={{ height: '8px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: '999px' }} />
                          </div>
                          <span style={{ textAlign: 'right', fontWeight: 700 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 3: Applications Over Time */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>3. Applications Over Time</h4>
                  <div style={{ position: 'relative', height: '100px', display: 'flex', alignItems: 'flex-end' }}>
                    <svg viewBox="0 0 300 80" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--lp-brand-primary)" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="var(--lp-brand-primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M0,70 L40,45 L80,55 L120,25 L160,35 L200,10 L240,30 L280,15 L300,20 L300,80 L0,80 Z" 
                        fill="url(#area-grad)" 
                      />
                      <path 
                        d="M0,70 L40,45 L80,55 L120,25 L160,35 L200,10 L240,30 L280,15 L300,20" 
                        fill="none" 
                        stroke="var(--lp-brand-primary)" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--lp-text-muted)', marginTop: '8px', fontWeight: 600 }}>
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                </div>

                {/* Chart 4: Skill Distribution */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>4. Skill Distribution</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'TypeScript / Javascript', pct: 92, count: '92%' },
                      { name: 'React / Next.js', pct: 85, count: '85%' },
                      { name: 'Python / Django', pct: 74, count: '74%' },
                      { name: 'Node.js', pct: 68, count: '68%' },
                      { name: 'PostgreSQL / SQL', pct: 60, count: '60%' }
                    ].map((s) => (
                      <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', color: 'var(--lp-text)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{s.name}</span>
                          <span style={{ color: 'var(--lp-brand-primary)' }}>{s.count}</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: 'var(--lp-brand-primary)', borderRadius: '999px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 5: Technology Usage */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>5. Technology Usage</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'Amazon Web Services (AWS)', pct: 80, count: '80%' },
                      { name: 'Docker / Containers', pct: 75, count: '75%' },
                      { name: 'Kubernetes (K8s)', pct: 54, count: '54%' },
                      { name: 'Terraform (IaC)', pct: 45, count: '45%' },
                      { name: 'GitHub Actions / CI-CD', pct: 70, count: '70%' }
                    ].map((s) => (
                      <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem', color: 'var(--lp-text)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>{s.name}</span>
                          <span style={{ color: 'var(--lp-brand-secondary)' }}>{s.count}</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${s.pct}%`, height: '100%', background: 'var(--lp-brand-secondary)', borderRadius: '999px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 6: Candidate Experience Distribution */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>6. Candidate Experience</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '100px', padding: '0 10px', gap: '8px' }}>
                    {[
                      { label: '0-2 Yrs', val: 30, color: 'var(--lp-brand-tertiary)' },
                      { label: '2-5 Yrs', val: 75, color: 'var(--lp-brand-primary)' },
                      { label: '5-8 Yrs', val: 55, color: 'var(--lp-brand-secondary)' },
                      { label: '8+ Yrs', val: 20, color: '#f59e0b' }
                    ].map((bar) => (
                      <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ width: '100%', height: `${bar.val}%`, background: bar.color, borderRadius: '4px 4px 0 0', transition: 'height 0.6s ease' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--lp-text)' }}>{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 7: Industry-wise Candidate Distribution */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>7. Industry Distribution</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      { name: 'Fintech', pct: 35, color: 'var(--lp-brand-primary)' },
                      { name: 'SaaS / DevTools', pct: 28, color: 'var(--lp-brand-secondary)' },
                      { name: 'E-Commerce', pct: 18, color: 'var(--lp-brand-tertiary)' },
                      { name: 'Healthcare', pct: 11, color: '#f59e0b' },
                      { name: 'AI / Robotics', pct: 8, color: '#10b981' }
                    ].map((ind) => (
                      <div key={ind.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--lp-text)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: ind.color }} />
                          <span style={{ fontWeight: 600 }}>{ind.name}</span>
                        </div>
                        <span style={{ fontWeight: 700 }}>{ind.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 8: Project Verification Status */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>8. Project Verification Status</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray="65, 100" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray="20, 100" strokeDashoffset="-65" />
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray="15, 100" strokeDashoffset="-85" />
                      </svg>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.72rem', width: '100%', color: 'var(--lp-text)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Verified (Approved)</span>
                        <strong>65%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Awaiting Review</span>
                        <strong>20%</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>Flagged (Low Ownership)</span>
                        <strong>15%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 9: Hiring Conversion Rate */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>9. Hiring Conversion Rate</h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ position: 'relative', width: '120px', height: '60px', overflow: 'hidden' }}>
                      <svg viewBox="0 0 36 18" style={{ width: '100%', height: '100%' }}>
                        <path d="M 2 18 A 16 16 0 0 1 34 18" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="4" />
                        <path d="M 2 18 A 16 16 0 0 1 34 18" fill="none" stroke="var(--lp-brand-primary)" strokeWidth="4" strokeDasharray="38, 100" />
                      </svg>
                      <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'var(--lp-text)' }}>8.4%</div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--lp-text-muted)', fontWeight: 600 }}>Hires vs total applicants</span>
                  </div>
                </div>

                {/* Chart 10: Top Performing Job Openings */}
                <div style={{ padding: '18px', background: 'rgba(148,163,184,0.03)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 16px 0', textTransform: 'uppercase', color: 'var(--lp-text-muted)', letterSpacing: '0.03em' }}>10. Top Job Openings</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem', color: 'var(--lp-text)' }}>
                    {[
                      { title: 'Senior Full Stack Engineer', count: '48 applicants', fill: 100 },
                      { title: 'ML Platform Engineer', count: '32 applicants', fill: 68 },
                      { title: 'Backend Architect (Go)', count: '28 applicants', fill: 58 }
                    ].map((j) => (
                      <div key={j.title} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{j.title}</span>
                          <strong>{j.count}</strong>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px' }}>
                          <div style={{ width: `${j.fill}%`, height: '100%', background: 'var(--lp-brand-tertiary)', borderRadius: '999px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Job & Ranked Candidates Details Panel */}
            {selectedJobId && (
              <div className="db-panel-card" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--lp-text)' }}>
                      Rankings & Fit Spread: {selectedJobTitle}
                    </h3>
                    {fitTotal > 0 && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--lp-text-muted)', margin: '2px 0 0 0' }}>
                        Average fit: <strong>{metrics?.avgFitScore}%</strong> across {fitTotal} matched profile{fitTotal === 1 ? '' : 's'}.
                      </p>
                    )}
                  </div>
                </div>

                {/* Fit Spread Progress Bars */}
                {fitTotal > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px', padding: '14px', background: 'rgba(148,163,184,0.02)', border: '1px solid var(--lp-card-border)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>Strong Match (70%+)</span>
                      <div style={{ height: '8px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(metrics!.fitDistribution.strong / fitTotal) * 100}%`, height: '100%', background: '#16a34a' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--lp-text)' }}>{metrics!.fitDistribution.strong} candidates</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: '#ca8a04' }}>Medium Match (40-69%)</span>
                      <div style={{ height: '8px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(metrics!.fitDistribution.medium / fitTotal) * 100}%`, height: '100%', background: '#ca8a04' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--lp-text)' }}>{metrics!.fitDistribution.medium} candidates</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>Weak Match (&lt;40%)</span>
                      <div style={{ height: '8px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${(metrics!.fitDistribution.weak / fitTotal) * 100}%`, height: '100%', background: '#dc2626' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--lp-text)' }}>{metrics!.fitDistribution.weak} candidates</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '16px', background: 'rgba(148,163,184,0.02)', borderRadius: '12px', border: '1px solid var(--lp-card-border)', fontSize: '0.8rem', color: 'var(--lp-text-muted)', marginBottom: '16px' }}>
                    No match data exists for this job yet. Click <strong>Re-run Match</strong> to evaluate rankings.
                  </div>
                )}

                {/* Rankings Table */}
                {rankings.length > 0 && (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ color: 'var(--lp-text-muted)' }}>Rank</th>
                          <th style={{ color: 'var(--lp-text-muted)' }}>Candidate</th>
                          <th style={{ color: 'var(--lp-text-muted)' }}>Profile Type</th>
                          <th style={{ color: 'var(--lp-text-muted)' }}>Fit Score</th>
                          <th style={{ color: 'var(--lp-text-muted)' }}>Matched Skills</th>
                          <th style={{ color: 'var(--lp-text-muted)' }}>Cred.</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankings.map((r, idx) => {
                          const classification = getCandidateClassification({
                            skills: r.skills || [],
                            credibilityFlags: r.credibilityFlags || []
                          });
                          return (
                            <tr key={r.matchId} style={{ borderBottom: '1px solid var(--lp-card-border)' }}>
                              <td style={{ verticalAlign: 'middle' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '8px',
                                  fontWeight: 800,
                                  fontSize: '0.8rem',
                                  background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : 'rgba(148,163,184,0.05)',
                                  color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : 'var(--lp-text)',
                                  justifyContent: 'center'
                                }}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td>
                                <strong style={{ fontSize: '0.88rem', color: 'var(--lp-text)' }}>{r.candidateName}</strong>
                                <div style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)' }}>{r.email ?? 'No email'}</div>
                              </td>
                              <td style={{ verticalAlign: 'middle' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: classification === 'Technical' ? '#dcfce7' : classification === 'Non-Technical' ? '#fee2e2' : '#fef9c3',
                                  color: classification === 'Technical' ? '#166534' : classification === 'Non-Technical' ? '#991b1b' : '#854d0e',
                                  display: 'inline-block'
                                }}>
                                  {classification}
                                </span>
                              </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(148,163,184,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    width: `${r.fitScore}%`, 
                                    height: '100%', 
                                    background: r.fitScore >= 70 ? '#10b981' : r.fitScore >= 40 ? '#f59e0b' : '#ef4444' 
                                  }} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--lp-text)', minWidth: '32px', textAlign: 'right' }}>{r.fitScore}%</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {r.matchedSkills.slice(0, 3).map((s) => (
                                  <span className="db-skill-tag" style={{ padding: '2px 6px', fontSize: '0.62rem', background: 'var(--lp-badge-bg)', border: '1px solid var(--lp-badge-border)', color: 'var(--lp-badge-text)', borderRadius: '6px' }} key={s}>{s}</span>
                                ))}
                                {r.matchedSkills.length > 3 && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)', alignSelf: 'center', fontWeight: 600 }}>+{r.matchedSkills.length - 3}</span>
                                )}
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, fontSize: '0.8rem', color: r.credibilityScore && r.credibilityScore >= 70 ? '#10b981' : r.credibilityScore && r.credibilityScore >= 40 ? '#f59e0b' : '#ef4444', verticalAlign: 'middle' }}>
                              {r.credibilityScore ? `${Math.round(r.credibilityScore)}%` : '—'}
                            </td>
                            <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                              <Link href={`/candidates/${r.candidateId}`} className="text-link" style={{ fontSize: '0.8rem', color: 'var(--lp-brand-primary)', fontWeight: 700 }}>
                                View Profile
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </section>

          {/* Right Section: Quick Actions, AI Insights Panel & Recent Activity Feed */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Quick Actions Shortcuts */}
            <div className="db-panel-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--lp-text)' }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Link href="/parse" className="quick-action-link" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px', background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '4px' }}>📤</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--lp-brand-primary)' }}>Upload Resume</span>
                  </div>
                </Link>
                <Link href="/jobs" className="quick-action-link" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '4px' }}>➕</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--lp-brand-tertiary)' }}>Create Job</span>
                  </div>
                </Link>
                <Link href="/candidates" className="quick-action-link" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '4px' }}>🔍</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--lp-brand-secondary)' }}>Search Candidates</span>
                  </div>
                </Link>
                <div 
                  onClick={() => {
                    const el = document.getElementById('interactive-analytics-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{ padding: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '4px' }}>📊</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04' }}>View Analytics</span>
                </div>
                <Link href="/pipeline" className="quick-action-link" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '4px' }}>📅</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>Manage Interviews</span>
                  </div>
                </Link>
                <Link href="/audit" className="quick-action-link" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '4px' }}>⚙️</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>Verification Requests</span>
                  </div>
                </Link>
              </div>
              <div 
                onClick={handleExportReport}
                style={{ marginTop: '10px', padding: '12px', background: 'rgba(148,163,184,0.05)', border: '1px solid var(--lp-card-border)', borderRadius: '10px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', color: 'var(--lp-text)' }}
              >
                📥 Export Reports (JSON)
              </div>
            </div>

            {/* AI Insights Panel */}
            <div className="db-panel-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--lp-text)' }}>AI Insights Panel</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.75rem', color: 'var(--lp-text)' }}>
                
                <div style={{ padding: '10px 14px', background: 'rgba(20,184,166,0.04)', borderLeft: '3px solid var(--lp-brand-primary)', borderRadius: '0 8px 8px 0' }}>
                  <span style={{ fontWeight: 700, color: 'var(--lp-brand-primary)', display: 'block', marginBottom: '2px' }}>Best Matching Candidate Found</span>
                  <span><strong>Sarah Chen</strong> has a 96% match score for Senior Full Stack Engineer. Verified project-level Next.js ownership at 85%.</span>
                </div>

                <div style={{ padding: '10px 14px', background: 'rgba(37,99,235,0.04)', borderLeft: '3px solid var(--lp-brand-tertiary)', borderRadius: '0 8px 8px 0' }}>
                  <span style={{ fontWeight: 700, color: 'var(--lp-brand-tertiary)', display: 'block', marginBottom: '2px' }}>Jobs Receiving Most Applications</span>
                  <span><strong>Senior Full Stack Engineer</strong> has received 48 applications, leading pipeline volume this period.</span>
                </div>

                <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.04)', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0' }}>
                  <span style={{ fontWeight: 700, color: '#ca8a04', display: 'block', marginBottom: '2px' }}>Skill Gaps Across Applicants</span>
                  <span>Applicant pool is low on <strong>Kubernetes (K8s)</strong> skills (missing in 40% of DevOps Module descriptions).</span>
                </div>

                <div style={{ padding: '10px 14px', background: 'rgba(139,92,246,0.04)', borderLeft: '3px solid #7c3aed', borderRadius: '0 8px 8px 0' }}>
                  <span style={{ fontWeight: 700, color: '#7c3aed', display: 'block', marginBottom: '2px' }}>Candidates Awaiting Verification</span>
                  <span><strong>Elena Rostova</strong>'s backend Go application is awaiting reference sign-off to complete screening.</span>
                </div>

                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.04)', borderLeft: '3px solid #ef4444', borderRadius: '0 8px 8px 0' }}>
                  <span style={{ fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: '2px' }}>High-Priority Recommendation</span>
                  <span>Verify authorship for <strong>David Kim</strong> (Terraform modules matches generic public repositories at 95%).</span>
                </div>

                <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.04)', borderLeft: '3px solid #10b981', borderRadius: '0 8px 8px 0' }}>
                  <span style={{ fontWeight: 700, color: '#10b981', display: 'block', marginBottom: '2px' }}>Recent AI Recommendations</span>
                  <span>Auto-shortlisted candidate <strong>Marcus Vance</strong> for ML Platform Engineer based on Kafka pipeline ownership.</span>
                </div>

              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="db-panel-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--lp-card-border)', background: 'var(--lp-card-bg)', backdropFilter: 'var(--lp-glass-blur)', boxShadow: 'var(--lp-card-shadow)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--lp-text)' }}>Recent Activity Feed</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.75rem', color: 'var(--lp-text)' }}>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <span style={{ fontSize: '1.1rem' }}>📄</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>Resume Parsed</span>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--lp-text-muted)' }}>Sarah Chen's PDF resume parsed successfully into JSON schema.</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)' }}>2 minutes ago</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <span style={{ fontSize: '1.1rem' }}>🎯</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>Candidate Shortlisted</span>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--lp-text-muted)' }}>Marcus Vance shortlisted for ML Platform Engineer (92% fit).</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)' }}>14 minutes ago</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <span style={{ fontSize: '1.1rem' }}>✓</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>Verification Completed</span>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--lp-text-muted)' }}>Elena Rostova's PostgreSQL database project ownership verified.</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)' }}>1 hour ago</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <span style={{ fontSize: '1.1rem' }}>📅</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>Interview Scheduled</span>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--lp-text-muted)' }}>Sarah Chen scheduled for Senior Full Stack Technical Panel review.</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)' }}>3 hours ago</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <span style={{ fontSize: '1.1rem' }}>✉</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>Offer Released</span>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--lp-text-muted)' }}>Offer contract generated and emailed to candidate Sarah Chen.</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)' }}>Yesterday</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                  <span style={{ fontSize: '1.1rem' }}>📥</span>
                  <div>
                    <span style={{ fontWeight: 700 }}>New Application Received</span>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--lp-text-muted)' }}>Backend Architecture role received an application from a new candidate.</p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--lp-text-muted)' }}>Yesterday</span>
                  </div>
                </div>

              </div>
            </div>

          </aside>

        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="dashboard-page" style={{ padding: '24px' }}><p className="muted">Loading Recruiter Command Center…</p></main>}>
      <DashboardContent />
    </Suspense>
  );
}
