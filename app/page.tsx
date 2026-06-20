'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

interface Candidate {
  id: string;
  name: string;
  role: string;
  score: number;
  status: 'verified' | 'pending' | 'flagged';
  project: string;
  ownership: number;
  impact: string;
  technologies: { name: string; pct: number }[];
  details: string;
}

const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Senior Full Stack Engineer',
    score: 96,
    status: 'verified',
    project: 'E-Commerce Micro-Frontend Migration',
    ownership: 85,
    impact: 'Led migration of a legacy monolithic frontend to Next.js micro-frontends, reducing initial page load times by 42% ($1.2M revenue increase) and training 12 junior devs.',
    technologies: [
      { name: 'TypeScript', pct: 98 },
      { name: 'React/Next.js', pct: 95 },
      { name: 'GraphQL', pct: 90 },
      { name: 'Node.js', pct: 88 }
    ],
    details: 'Verified ownership via GitHub commit history & PR approval logs. High code quality, robust unit test coverage.'
  },
  {
    id: '2',
    name: 'Marcus Vance',
    role: 'ML Platform Engineer',
    score: 92,
    status: 'verified',
    project: 'Real-time Fraud Detection Pipeline',
    ownership: 70,
    impact: 'Designed and deployed an Apache Kafka + PyTorch real-time anomaly detection service processing 5,000 tx/sec. Decreased false positives by 28% and saved $450k annually.',
    technologies: [
      { name: 'Python', pct: 95 },
      { name: 'Apache Kafka', pct: 85 },
      { name: 'PyTorch', pct: 90 },
      { name: 'Kubernetes', pct: 80 }
    ],
    details: 'Verified domain architecture design through system drawings & peer review reports. Validated deployment and production latency metrics.'
  },
  {
    id: '3',
    name: 'Elena Rostova',
    role: 'Backend Architect',
    score: 88,
    status: 'pending',
    project: 'High-Throughput Payment Gateway API',
    ownership: 60,
    impact: 'Re-architected core transaction systems in Go, improving concurrent transaction capacity by 300%. Discovered and fixed 4 critical concurrency race conditions.',
    technologies: [
      { name: 'Go (Golang)', pct: 92 },
      { name: 'PostgreSQL', pct: 88 },
      { name: 'Redis', pct: 85 },
      { name: 'Docker', pct: 80 }
    ],
    details: 'Pending repository history extraction. Self-reported 60% code ownership. Awaiting reference match with engineering lead.'
  },
  {
    id: '4',
    name: 'David Kim',
    role: 'DevOps / Platform Lead',
    score: 85,
    status: 'flagged',
    project: 'Multi-Cloud Infrastructure Automation',
    ownership: 90,
    impact: 'Claimed rebuild of Terraform modules to automate multi-region failover. Discovered that 95% of modules were unmodified copy-paste from public boilerplate.',
    technologies: [
      { name: 'Terraform', pct: 80 },
      { name: 'AWS', pct: 75 },
      { name: 'GitHub Actions', pct: 85 }
    ],
    details: 'AI Credibility Check flagged low authorship. Over 90% code matches generic public boilerplates. Reference interview revealed candidate played supporting role only.'
  }
];

export default function LandingPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate>(mockCandidates[0]);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', company: '' });
  const [activeTab, setActiveTab] = useState<'pipeline' | 'analytics'>('pipeline');
  const [animateCharts, setAnimateCharts] = useState(false);

  // Scroll Progress Bar
  const [scrollProgress, setScrollProgress] = useState(0);

  // Mouse Follow Glow coordinates
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  // 3D Parallax Rotation
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  // Count-up Statistics
  const [counts, setCounts] = useState({
    candidates: 0,
    jobs: 0,
    score: 0,
    experience: 0,
  });

  useEffect(() => {
    // Scroll tracking
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };

    // Cursor tracking
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    // Initial chart animation trigger
    const timer = setTimeout(() => setAnimateCharts(true), 300);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.scroll-trigger');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Trigger metrics count-up on load
  useEffect(() => {
    const targets = { candidates: 1248, jobs: 18, score: 94.2, experience: 87.4 };
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCounts({
        candidates: Math.min(Math.round((targets.candidates / steps) * step), targets.candidates),
        jobs: Math.min(Math.round((targets.jobs / steps) * step), targets.jobs),
        score: Number(Math.min((targets.score / steps) * step, targets.score).toFixed(1)),
        experience: Number(Math.min((targets.experience / steps) * step, targets.experience).toFixed(1)),
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Demo submission handler
  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoForm.name && demoForm.email) {
      setDemoSubmitted(true);
      setTimeout(() => {
        setIsDemoModalOpen(false);
        setDemoSubmitted(false);
        setDemoForm({ name: '', email: '', company: '' });
      }, 2000);
    }
  };

  // Mockup Parallax Math
  const handleMockupMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    // Smooth 3D tilt
    const rX = -(mouseY / height) * 12;
    const rY = (mouseX / width) * 12;
    setRotation({ x: rX, y: rY });
  };

  const handleMockupMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  // Spotlight card mouse tracker
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div className="landing-wrapper">
      {/* Top scroll progress */}
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />

      {/* Mouse follow glow */}
      <div
        className="cursor-glow"
        style={{
          transform: `translate(${mousePos.x}px, ${mousePos.y}px) translate(-50%, -50%)`
        }}
      />

      {/* Mesh Background */}
      <div className="landing-glow-bg" />
      <div className="landing-grid-pattern" />

      {/* Floating Blobs */}
      <div className="blob-container">
        <div className="moving-blob blob-1" />
        <div className="moving-blob blob-2" />
        <div className="moving-blob blob-3" />
      </div>

      {/* Hero Section */}
      <section className="landing-hero animate-fade-in-up">
        <span className="landing-badge">
          <span className="landing-badge-dot" />
          Enterprise-Grade Talent Platform
        </span>
        <h1 className="landing-title">
          Build Trustworthy Teams <br />
          with <span className="landing-title-accent">Intelligence</span>
        </h1>
        <p className="landing-subtitle">
          An elite, project-based candidate screening system. Quantify engineering ownership, evaluate architectural impact, and hire without resumes templates.
        </p>
        <div className="landing-ctas">
          <Link href="/parse" className="btn-primary-gradient">
            Parse Resume
          </Link>
          <button onClick={() => setIsDemoModalOpen(true)} className="btn-secondary-glass" type="button">
            Request Demo
          </button>
        </div>
      </section>



      {/* Interactive 3D Mockup Section */}
      <section className="laptop-mockup-wrapper scroll-trigger">
        <div
          className="laptop-screen"
          onMouseMove={handleMockupMouseMove}
          onMouseLeave={handleMockupMouseLeave}
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateZ(0)`,
          }}
        >
          {/* Browser Top Header */}
          <div className="browser-header">
            <div className="browser-dots">
              <span className="browser-dot browser-dot-red" />
              <span className="browser-dot browser-dot-yellow" />
              <span className="browser-dot browser-dot-green" />
            </div>
            <div className="browser-address">
              https://platform.intelligent-ats.com/pipeline
            </div>
            <div className="browser-menu">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--lp-brand-primary)' }} />
            </div>
          </div>

          <div className="live-db">
            {/* Sidebar Preview */}
            <aside className="live-db-sidebar">
              <div className="live-db-logo">
                <span className="live-db-logo-dot" />
                Intelligent ATS
              </div>
              <ul className="live-db-menu">
                <li
                  onClick={() => { setActiveTab('pipeline'); }}
                  className={`live-db-menu-item ${activeTab === 'pipeline' ? 'active' : ''}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
                  Pipeline Preview
                </li>
                <li
                  onClick={() => { setActiveTab('analytics'); }}
                  className={`live-db-menu-item ${activeTab === 'analytics' ? 'active' : ''}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                  Analytics & Fills
                </li>
              </ul>
              <div style={{ marginTop: 'auto', fontSize: '0.72rem', color: 'var(--lp-text-muted)', fontWeight: 600 }}>
                Mode: Live Demonstration
              </div>
            </aside>

            {/* Dashboard Content */}
            <main className="live-db-content">
              {/* KPIs with Count-Up animation */}
              <div className="db-kpi-grid">
                <div className="db-kpi-card">
                  <div className="db-kpi-label">Candidates Scanned</div>
                  <div className="db-kpi-value">{counts.candidates.toLocaleString()}</div>
                  <div className="db-kpi-trend">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    +18.4%
                  </div>
                </div>
                <div className="db-kpi-card">
                  <div className="db-kpi-label">Active Jobs</div>
                  <div className="db-kpi-value">{counts.jobs}</div>
                  <div className="db-kpi-trend" style={{ color: 'var(--lp-text-muted)' }}>Healthy</div>
                </div>
                <div className="db-kpi-card">
                  <div className="db-kpi-label">Avg Synergy Score</div>
                  <div className="db-kpi-value">{counts.score}%</div>
                  <div className="db-kpi-trend">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                    +2.8%
                  </div>
                </div>
                <div className="db-kpi-card">
                  <div className="db-kpi-label">Flagged Profiles</div>
                  <div className="db-kpi-value">1.4%</div>
                  <div className="db-kpi-trend down">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>
                    -0.8%
                  </div>
                </div>
              </div>

              {activeTab === 'pipeline' ? (
                /* Tab 1: Interactive Pipeline */
                <div className="db-main-grid">
                  {/* Candidate List Card */}
                  <div className="db-panel-card">
                    <div className="db-panel-header">
                      <h3 className="db-panel-title">Hiring Pipeline</h3>
                      <span style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)' }}>Click to check evidence dossiers</span>
                    </div>
                    <div className="db-pipeline-list">
                      {mockCandidates.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCandidate(c)}
                          className={`db-cand-item ${selectedCandidate.id === c.id ? 'selected' : ''}`}
                        >
                          <div className="db-cand-info">
                            <span className="db-cand-name">{c.name}</span>
                            <span className="db-cand-role">{c.role}</span>
                          </div>
                          <div className="db-cand-meta">
                            <span className={`db-match-score-badge ${c.score >= 90 ? 'strong' : 'medium'}`}>
                              {c.score}% Match
                            </span>
                            <span className={`db-verify-badge ${c.status}`}>
                              {c.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Details Panel */}
                  <div className="db-panel-card db-details-card" key={selectedCandidate.id}>
                    <div className="db-details-top">
                      <div className="db-details-avatar">
                        {selectedCandidate.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                          {selectedCandidate.name}
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)' }}>{selectedCandidate.role}</span>
                      </div>
                    </div>

                    <div className="db-details-grid">
                      <div className="db-details-metric">
                        <div className="db-details-label">Project evidence</div>
                        <div className="db-details-value" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedCandidate.project}
                        </div>
                      </div>
                      <div className="db-details-metric">
                        <div className="db-details-label">Code Ownership</div>
                        <div className="db-details-value" style={{ color: selectedCandidate.status === 'flagged' ? '#ef4444' : 'var(--lp-brand-primary)' }}>
                          {selectedCandidate.ownership}% verified
                        </div>
                      </div>
                    </div>

                    <div className="db-details-desc">
                      <div className="db-details-label">Business Scope & Impact</div>
                      {selectedCandidate.impact}
                    </div>

                    <div className="db-details-desc">
                      <div className="db-details-label">AI Experience Verification Logs</div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: 'var(--lp-text-muted)' }}>{selectedCandidate.details}</p>
                      <div className="db-skill-cloud">
                        {selectedCandidate.technologies.map((t) => (
                          <span key={t.name} className="db-skill-tag">
                            {t.name} ({t.pct}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 2: Interactive Analytics Charts */
                <div className="db-panel-card">
                  <div className="db-panel-header">
                    <h3 className="db-panel-title">Talent Funnel Status</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)' }}>Scroll animations & scaling analytics</span>
                  </div>

                  <div className="db-chart-row">
                    {/* Funnel Stage Bar */}
                    <div>
                      <h4 style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hiring Conversion Funnel</h4>
                      <div className="db-funnel">
                        <div className="db-funnel-stage">
                          <span className="db-funnel-label">Applied</span>
                          <div className="db-funnel-track">
                            <div className="db-funnel-fill" style={{ width: animateCharts ? '100%' : '0%' }} />
                          </div>
                          <span className="db-funnel-count">1,248</span>
                        </div>
                        <div className="db-funnel-stage">
                          <span className="db-funnel-label">Screened</span>
                          <div className="db-funnel-track">
                            <div className="db-funnel-fill" style={{ width: animateCharts ? '65%' : '0%' }} />
                          </div>
                          <span className="db-funnel-count">812</span>
                        </div>
                        <div className="db-funnel-stage">
                          <span className="db-funnel-label">Verified</span>
                          <div className="db-funnel-track">
                            <div className="db-funnel-fill" style={{ width: animateCharts ? '42%' : '0%' }} />
                          </div>
                          <span className="db-funnel-count">524</span>
                        </div>
                        <div className="db-funnel-stage">
                          <span className="db-funnel-label">Interviewed</span>
                          <div className="db-funnel-track">
                            <div className="db-funnel-fill" style={{ width: animateCharts ? '18%' : '0%' }} />
                          </div>
                          <span className="db-funnel-count">225</span>
                        </div>
                        <div className="db-funnel-stage">
                          <span className="db-funnel-label">Hired</span>
                          <div className="db-funnel-track">
                            <div className="db-funnel-fill" style={{ width: animateCharts ? '4%' : '0%' }} />
                          </div>
                          <span className="db-funnel-count">50</span>
                        </div>
                      </div>
                    </div>

                    {/* Skill Stack progress list */}
                    <div>
                      <h4 style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evaluated Technology</h4>
                      <div className="db-tech-list">
                        <div className="db-tech-item">
                          <div className="db-tech-header">
                            <span className="db-tech-name">TypeScript / JS</span>
                            <span className="db-tech-pct">94%</span>
                          </div>
                          <div className="db-tech-track">
                            <div className="db-tech-fill" style={{ width: animateCharts ? '94%' : '0%', background: 'var(--lp-brand-primary)' }} />
                          </div>
                        </div>
                        <div className="db-tech-item">
                          <div className="db-tech-header">
                            <span className="db-tech-name">Python / ML Stack</span>
                            <span className="db-tech-pct">82%</span>
                          </div>
                          <div className="db-tech-track">
                            <div className="db-tech-fill" style={{ width: animateCharts ? '82%' : '0%', background: 'var(--lp-brand-tertiary)' }} />
                          </div>
                        </div>
                        <div className="db-tech-item">
                          <div className="db-tech-header">
                            <span className="db-tech-name">Go (Golang)</span>
                            <span className="db-tech-pct">60%</span>
                          </div>
                          <div className="db-tech-track">
                            <div className="db-tech-fill" style={{ width: animateCharts ? '60%' : '0%', background: 'var(--lp-brand-secondary)' }} />
                          </div>
                        </div>
                        <div className="db-tech-item">
                          <div className="db-tech-header">
                            <span className="db-tech-name">Rust / WebAssembly</span>
                            <span className="db-tech-pct">35%</span>
                          </div>
                          <div className="db-tech-track">
                            <div className="db-tech-fill" style={{ width: animateCharts ? '35%' : '0%', background: '#ef4444' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="landing-features-section scroll-trigger">
        <div className="section-header-center">
          <span className="section-pre-title">Intelligent ATS with Project-Based Experience Verification</span>
          <h2 className="section-main-title">Uncompromising Recruitment Quality</h2>
          <p className="section-desc-center" style={{ maxWidth: '800px', textAlign: 'center', margin: '0 auto', fontSize: '0.95rem', color: 'var(--lp-text-muted)', lineHeight: '1.6' }}>
            Move beyond superficial keyword filters. We parse, structure, and verify candidate contributions at the project level to ensure real engineering depth and hiring credibility.
          </p>
        </div>

        <div className="features-grid">
          {/* Card 1: Traditional ATS Failures */}
          <div className="feature-card" onMouseMove={handleCardMouseMove}>
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lp-brand-primary)" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="feature-card-title" style={{ fontSize: '1.3rem' }}>Traditional ATS Failures</h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '1.05rem', color: 'var(--lp-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Rely on raw keyword matching</li>
              <li>Miss actual real-world skills</li>
              <li>Vulnerable to resume exaggeration</li>
            </ul>
          </div>

          {/* Card 2: Project Metadata Gaps */}
          <div className="feature-card" onMouseMove={handleCardMouseMove}>
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lp-brand-secondary)" strokeWidth="2.5">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </div>
            <h3 className="feature-card-title" style={{ fontSize: '1.3rem' }}>Project Metadata Gaps</h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '1.05rem', color: 'var(--lp-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Missing team sizes & durations</li>
              <li>Vague role & ownership levels</li>
              <li>No verified business metrics</li>
            </ul>
          </div>

          {/* Card 3: 5 Core Questions */}
          <div className="feature-card" onMouseMove={handleCardMouseMove}>
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lp-brand-tertiary)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="feature-card-title" style={{ fontSize: '1.3rem' }}>5 Core Questions</h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '1.05rem', color: 'var(--lp-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', listStyleType: 'decimal' }}>
              <li>What was built and its architecture?</li>
              <li>What was the specific engineering role?</li>
              <li>How much ownership was held?</li>
              <li>What was the business impact?</li>
              <li>Can contributions be verified?</li>
            </ul>
          </div>

          {/* Card 4: Formatting Constraints */}
          <div className="feature-card" onMouseMove={handleCardMouseMove}>
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <h3 className="feature-card-title" style={{ fontSize: '1.3rem' }}>Formatting Constraints</h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '1.05rem', color: 'var(--lp-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>No images, graphics, or text boxes</li>
              <li>Avoid multi-column resume layouts</li>
              <li>Avoid complex tables and fonts</li>
            </ul>
          </div>

          {/* Card 5: Standardized Project Blocks */}
          <div className="feature-card" onMouseMove={handleCardMouseMove}>
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lp-brand-primary)" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="9" y1="9" x2="21" y2="9" />
                <line x1="9" y1="15" x2="21" y2="15" />
              </svg>
            </div>
            <h3 className="feature-card-title" style={{ fontSize: '1.3rem' }}>Standardized Project Blocks</h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '1.05rem', color: 'var(--lp-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Project name, domain & duration</li>
              <li>Role, technologies & team size</li>
              <li>Ownership level & business impact</li>
            </ul>
          </div>

          {/* Card 6: Delivery Pathways */}
          <div className="feature-card" onMouseMove={handleCardMouseMove}>
            <div className="feature-icon-wrapper">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lp-brand-secondary)" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <h3 className="feature-card-title" style={{ fontSize: '1.3rem' }}>Dynamic Pathways</h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '1.05rem', color: 'var(--lp-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Standardized format parameters</li>
              <li>Progressive profile completion prompts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="landing-benefits-section scroll-trigger">
        <div className="benefits-layout">
          <div>
            <span className="section-pre-title">System Solutions</span>
            <h2 className="section-main-title" style={{ textAlign: 'left' }}>The Software Team Upgrade</h2>
            <p style={{ color: 'var(--lp-text-muted)', lineHeight: '1.65', fontSize: '1.15rem', margin: '0 0 16px 0', textAlign: 'left' }}>
            </p>
            <p style={{ color: 'var(--lp-text-muted)', lineHeight: '1.65', fontSize: '1.15rem', margin: '0 0 32px 0', textAlign: 'left' }}>
              Our project-centric, credibility-driven ATS platform solves this by extracting and verifying structured engineering experience directly from resumes.
            </p>
            <Link href="/parse" className="btn-primary-gradient" style={{ display: 'inline-block' }}>
              Get Started Now
            </Link>
          </div>

          <div className="benefits-content">
            <div className="benefit-item">
              <div className="benefit-bullet" style={{ width: '28px', height: '28px', fontSize: '0.95rem' }}>✓</div>
              <div className="benefit-info">
                <h3 className="benefit-title" style={{ fontSize: '1.25rem' }}>Eliminate Hiring Mismatch</h3>
                <p className="benefit-desc" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>Prevent project delays, reduced productivity, and inefficient resource allocation caused by vague resume descriptions.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-bullet" style={{ width: '28px', height: '28px', fontSize: '0.95rem' }}>✓</div>
              <div className="benefit-info">
                <h3 className="benefit-title" style={{ fontSize: '1.25rem' }}>Advanced NLP Parsing</h3>
                <p className="benefit-desc" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>Extract structured projects, technologies, roles, responsibilities, team size, duration, and business impact parameters.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-bullet" style={{ width: '28px', height: '28px', fontSize: '0.95rem' }}>✓</div>
              <div className="benefit-info">
                <h3 className="benefit-title" style={{ fontSize: '1.25rem' }}>Credibility Verification Layer</h3>
                <p className="benefit-desc" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>Build a verifiable database and cross-check candidate ownership claims for reliable, predictable hiring outcomes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Request Demo Modal */}
      {isDemoModalOpen && (
        <div className="demo-modal-overlay" onClick={() => setIsDemoModalOpen(false)}>
          <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
            <button className="demo-modal-close" onClick={() => setIsDemoModalOpen(false)} type="button">
              &times;
            </button>
            {demoSubmitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '3rem', color: '#10b981', marginBottom: '16px' }}>✓</div>
                <h3 className="demo-modal-title">Request Registered!</h3>
                <p className="demo-modal-desc">
                  An enterprise account lead will contact you shortly to configure a live custom demonstration.
                </p>
              </div>
            ) : (
              <>
                <h3 className="demo-modal-title">Request Live Demo</h3>
                <p className="demo-modal-desc">
                  Explore how verified engineering screening and project synergy matching can scale your team.
                </p>
                <form className="demo-form" onSubmit={handleDemoSubmit}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', marginBottom: '6px', display: 'block', fontWeight: 700 }}>Name</label>
                    <input
                      type="text"
                      className="demo-input"
                      placeholder="Sarah Jenkins"
                      required
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', marginBottom: '6px', display: 'block', fontWeight: 700 }}>Corporate Email</label>
                    <input
                      type="email"
                      className="demo-input"
                      placeholder="sarah@company.com"
                      required
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--lp-text-muted)', marginBottom: '6px', display: 'block', fontWeight: 700 }}>Company</label>
                    <input
                      type="text"
                      className="demo-input"
                      placeholder="Acme Inc"
                      value={demoForm.company}
                      onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="demo-submit">
                    Schedule Demonstration
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
