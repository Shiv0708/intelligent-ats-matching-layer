'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateRange, expandRange, parseDurationText, rangesOverlap } from '@/lib/duration-parse';
import type { CandidateRecord } from '@/lib/types/resume';

interface MatchCriteria {
  clientName: string;
  projectType: string;
  duration: string;
}

interface MatchResult {
  candidateId: string;
  candidateName: string;
  matchedProjects: number;
  score: number;
  classification: string;
}

interface MatchScore {
  total: number;
  client: number;
  type: number;
  duration: number;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\b(pvt|pvt ltd|private limited|ltd|inc|inc\.|corp|corporation|co|company|llc|plc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarityScore(a: string, b: string) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const distance = levenshteinDistance(left, right);
  const maxLen = Math.max(left.length, right.length);
  return maxLen === 0 ? 0 : Math.max(0, 1 - distance / maxLen);
}

function thresholdedScore(a: string, b: string) {
  const score = similarityScore(a, b);
  return score >= 0.85 ? score : 0;
}

function getProjectRange(project: CandidateRecord['projects'][number]) {
  if (project.durationStart && project.durationEnd) {
    const start = new Date(project.durationStart);
    const end = new Date(project.durationEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return { start, end };
    }
  }
  return parseDurationText(project.duration) ?? null;
}

function projectMatchScore(
  project: CandidateRecord['projects'][number],
  sourceClient: string,
  sourceType: string,
  sourceRange: DateRange | null,
  sourceDurationText: string
): MatchScore {
  const clientScore = sourceClient && project.clientName
    ? thresholdedScore(sourceClient, project.clientName)
    : 0;
  const typeScore = sourceType && project.projectType
    ? thresholdedScore(sourceType, project.projectType)
    : 0;

  let durationScore = 0;
  const projectRange = getProjectRange(project);
  if (sourceRange && projectRange) {
    durationScore = rangesOverlap(sourceRange, projectRange) ? 1 : 0;
  } else if (sourceDurationText && projectRange) {
    const criteriaRange = parseDurationText(sourceDurationText);
    durationScore = criteriaRange && rangesOverlap(expandRange(criteriaRange, 1), projectRange) ? 1 : 0;
  }

  const total = 0.5 * clientScore + 0.3 * typeScore + 0.2 * durationScore;
  return { total, client: clientScore, type: typeScore, duration: durationScore };
}

function scoreLabel(score: number, clientScore: number) {
  if (score > 0.9) return 'Very Likely Same Engagement';
  if (clientScore >= 0.95 && score >= 0.5) return 'Strong Match';
  if (score >= 0.75) return 'Possible Match';
  if (score >= 0.5) return 'Weak Match';
  return 'No match';
}

export default function ProjectMatchesPage() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [criteria, setCriteria] = useState<MatchCriteria>({
    clientName: '',
    projectType: '',
    duration: '',
  });
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/candidates');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load candidates');
      setCandidates([]);
    } else {
      setCandidates(data.candidates ?? []);
      if (data.candidates && data.candidates.length > 0) {
        setSelectedCandidateId(data.candidates[0].id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const candidateList = useMemo(() => {
    return candidates.filter((candidate) => {
      if (!candidateSearch.trim()) return true;
      const query = candidateSearch.toLowerCase();
      return (
        candidate.candidateName.toLowerCase().includes(query) ||
        (candidate.email?.toLowerCase().includes(query) ?? false) ||
        (candidate.totalExperience?.toLowerCase().includes(query) ?? false) ||
        candidate.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    });
  }, [candidates, candidateSearch]);

  const selectedCandidate = useMemo(() => {
    return candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null;
  }, [candidates, selectedCandidateId]);

  const selectedProject = useMemo(
    () => selectedCandidate?.projects.find((project) => project.id === selectedProjectId) ?? null,
    [selectedCandidate, selectedProjectId]
  );

  const criteriaRange = useMemo(() => {
    if (!criteria.duration.trim()) return null;
    const parsed = parseDurationText(criteria.duration.trim());
    return parsed ? expandRange(parsed, 1) : null;
  }, [criteria.duration]);

  useEffect(() => {
    if (selectedProject) {
      setCriteria({
        clientName: selectedProject.clientName ?? '',
        projectType: selectedProject.projectType ?? '',
        duration: selectedProject.duration ?? '',
      });
    }
  }, [selectedProject]);

  const handleCandidateClick = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setSelectedProjectId(null);
    setCriteria({ clientName: '', projectType: '', duration: '' });
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  const runFindMatches = () => {
    const sourceClient = criteria.clientName.trim();
    const sourceType = criteria.projectType.trim();
    const sourceDuration = criteria.duration.trim();
    const sourceRange = criteriaRange;

    if (!sourceClient && !sourceType && !sourceDuration) {
      setMatchResults([]);
      return;
    }

      const results: MatchResult[] = candidates
      .filter((candidate) => candidate.id !== selectedCandidateId)
      .map((candidate) => {
        let bestScore = 0;
        let bestClientScore = 0;
        let matchedProjects = 0;

        candidate.projects.forEach((project) => {
          const projectScore = projectMatchScore(project, sourceClient, sourceType, sourceRange, sourceDuration);
          if (projectScore.total > 0) {
            matchedProjects += 1;
            bestScore = Math.max(bestScore, projectScore.total);
            bestClientScore = Math.max(bestClientScore, projectScore.client);
          }
        });

        return {
          candidateId: candidate.id,
          candidateName: candidate.candidateName,
          matchedProjects,
          score: Math.round(bestScore * 100),
          classification: scoreLabel(bestScore, bestClientScore),
        };
      })
      .filter((result) => result.matchedProjects > 0)
      .sort((a, b) => b.score - a.score);

    setMatchResults(results);
  };

  return (
    <main className="container-project-matches">
      <h1 className="page-title">Project matching</h1>
      <p className="muted page-lead">
        Browse all candidates, inspect parsed project details, and autofill matching criteria from a selected project.
      </p>

      <div className="layout-three-col">
        <section className="panel candidate-panel">
          <div className="row-header">
            <div>
              <h2 className="section-title">Candidates</h2>
              <p className="muted">Select a candidate to view parsed profile and projects.</p>
            </div>
          </div>

          <div className="filter-row">
            <input
              type="search"
              placeholder="Search candidates…"
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="muted">Loading candidates…</p>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : candidateList.length === 0 ? (
            <p className="muted">No candidates match that search.</p>
          ) : (
            <ul className="candidate-list">
              {candidateList.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className={`candidate-link ${selectedCandidateId === candidate.id ? 'selected' : ''}`}
                    onClick={() => handleCandidateClick(candidate.id)}
                  >
                    <strong>{candidate.candidateName}</strong>
                    <span className="muted">{candidate.totalExperience || 'No experience listed'}</span>
                    <div className="skills-preview">
                      {candidate.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="skill-badge">{skill}</span>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel details-panel">
          {selectedCandidate ? (
            <>
              <div className="profile-header">
                <div>
                  <h2 className="section-title">{selectedCandidate.candidateName}</h2>
                  <p className="muted">Parsed resume details and project history.</p>
                </div>
                <div className="candidate-summary">
                  <span className="badge">{selectedCandidate.projects.length} projects</span>
                </div>
              </div>

              <div className="profile-grid">
                <div>
                  <span className="label">Email</span>
                  <p>{selectedCandidate.email || '—'}</p>
                </div>
                <div>
                  <span className="label">Experience</span>
                  <p>{selectedCandidate.totalExperience || '—'}</p>
                </div>
                <div>
                  <span className="label">Skills</span>
                  {selectedCandidate.skills.length > 0 ? (
                    <div className="skills-container">
                      {selectedCandidate.skills.map((skill) => (
                        <span key={skill} className="skill-badge">{skill}</span>
                      ))}
                    </div>
                  ) : (
                    <p>—</p>
                  )}
                </div>
              </div>

              <h3 className="section-title">Projects</h3>
              {selectedCandidate.projects.length === 0 ? (
                <p className="muted">No parsed projects available for this candidate.</p>
              ) : (
                selectedCandidate.projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={`project-card project-card--selectable ${selectedProjectId === project.id ? 'project-card--selected' : ''}`}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="project-header">
                      <h4>{project.name || 'Untitled project'}</h4>
                      <span className="muted">{project.role || 'Role not parsed'}</span>
                    </div>
                    <p><strong>Client:</strong> {project.clientName || '—'}</p>
                    <p><strong>Type:</strong> {project.projectType || '—'}</p>
                    <p><strong>Duration:</strong> {project.duration || '—'}</p>
                  </button>
                ))
              )}
            </>
          ) : (
            <p className="muted">Select a candidate to view parsed details.</p>
          )}
        </section>

        <section className="panel criteria-panel">
          <div className="row-header">
            <div>
              <h2 className="section-title">Match criteria</h2>
              <p className="muted">Click any project to autofill these fields automatically.</p>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="client-name">Client name</label>
            <input
              id="client-name"
              type="text"
              value={criteria.clientName}
              onChange={(e) => setCriteria({ ...criteria, clientName: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="project-type">Project type</label>
            <input
              id="project-type"
              type="text"
              value={criteria.projectType}
              onChange={(e) => setCriteria({ ...criteria, projectType: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label htmlFor="duration">Duration</label>
            <input
              id="duration"
              type="text"
              value={criteria.duration}
              onChange={(e) => setCriteria({ ...criteria, duration: e.target.value })}
            />
          </div>

          <div className="action-row">
            <button type="button" className="btn-secondary" onClick={runFindMatches}>
              Find matches
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCriteria({ clientName: '', projectType: '', duration: '' })}>
              Clear criteria
            </button>
          </div>

          <div className="match-results">
            <h3 className="section-title">Matching results</h3>
            {matchResults.length === 0 ? (
              <p className="muted">No matches yet. Click Find matches to see candidates with matching projects.</p>
            ) : (
              <ul className="candidate-list">
                {matchResults.map((result) => (
                  <li key={result.candidateId}>
                    <div className={`candidate-link match-result ${result.classification.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`}>
                      <strong>{result.candidateName}</strong>
                      <span className="muted">{result.matchedProjects} project match{result.matchedProjects === 1 ? '' : 'es'} · {result.score}% · {result.classification}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
