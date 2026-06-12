'use client';

import Link from 'next/link';
import type { CandidateRecord } from '@/lib/types/resume';
import { PIPELINE_STAGES, getStageMeta, type PipelineStageId } from '@/lib/pipeline-stages';

export interface ProjectPeerMatchView {
  projectId: string;
  projectName: string;
  clientName: string | null;
  projectType: string | null;
  peers: Array<{
    candidateId: string;
    candidateName: string;
    projectId: string;
    projectName: string;
    role: string | null;
    duration: string | null;
    overlapNote: string;
  }>;
}

interface PipelineApplicationView {
  id: string;
  stage: PipelineStageId;
  notes: string | null;
}

interface CandidateProfileProps {
  candidate: CandidateRecord;
  peerMatches?: ProjectPeerMatchView[];
  application?: PipelineApplicationView | null;
  onMoveStage?: (newStage: PipelineStageId) => void;
  onMoveToNextStage?: () => void;
  onReviewProject?: (projectId: string, status: 'approved' | 'rejected', note?: string) => void;
  showActions?: boolean;
  onDelete?: () => void;
  onExport?: () => void;
}

function scoreClass(score: number | null) {
  if (score === null) return '';
  if (score >= 80) return 'score-good';
  if (score >= 60) return 'score-ok';
  return 'score-low';
}

export default function CandidateProfile({
  candidate,
  peerMatches = [],
  application,
  onMoveStage,
  onMoveToNextStage,
  onReviewProject,
  showActions,
  onDelete,
  onExport,
}: CandidateProfileProps) {
  const peersByProject = new Map(peerMatches.map((m) => [m.projectId, m.peers]));
  const currentStage = application ? getStageMeta(application.stage) : null;
  return (
    <div>
      <div className="profile-header">
        <div>
          <h2 className="section-title">{candidate.candidateName}</h2>
          <p className="muted">Saved {new Date(candidate.createdAt).toLocaleString()}</p>
        </div>
        {candidate.credibilityScore !== null && (
          <div className={`credibility-badge ${scoreClass(candidate.credibilityScore)}`}>
            Credibility {candidate.credibilityScore}/100
          </div>
        )}
      </div>

      {application && (
        <div className="pipeline-stage-panel">
          <div className="pipeline-stage-current">
            <strong>Pipeline stage:</strong>{' '}
            <span className="stage-badge" style={{ backgroundColor: currentStage?.color ?? '#d1d5db' }}>
              {currentStage?.label ?? 'Unknown'}
            </span>
          </div>
          <div className="pipeline-stage-actions">
            <label className="stage-select-label">
              Move to stage
              <select
                value={application.stage}
                onChange={(event) => onMoveStage?.(event.target.value as PipelineStageId)}
              >
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-secondary"
              onClick={onMoveToNextStage}
              disabled={!onMoveToNextStage}
            >
              Move to next stage
            </button>
          </div>
        </div>
      )}

      {showActions && (
        <div className="action-row">
          {onExport && (
            <button type="button" className="btn-secondary" onClick={onExport}>
              Export CSV
            </button>
          )}
          {onDelete && (
            <button type="button" className="btn-danger" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>
      )}

      <div className="profile-grid">
        <div><span className="label">Email</span><p>{candidate.email || '—'}</p></div>
        <div><span className="label">Phone</span><p>{candidate.phone || '—'}</p></div>
        <div><span className="label">Experience</span><p>{candidate.totalExperience || '—'}</p></div>
      </div>

      {candidate.credibilityFlags.length > 0 && (
        <div className="flags-block">
          <strong>Credibility flags</strong>
          <ul>
            {candidate.credibilityFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="field-group">
        <span className="label">Skills</span>
        <div className="tag-row">
          {candidate.skills.map((skill) => (
            <span className="tag" key={skill}>{skill}</span>
          ))}
        </div>
      </div>

      {candidate.education.length > 0 && (
        <div className="field-group">
          <h3 className="section-title">Education</h3>
          {candidate.education.map((edu, index) => (
            <div className="project-card" key={edu.id}>
              <h4>{edu.institution}</h4>
              <p>
                <strong>Degree:</strong>{' '}
                {[edu.degree, edu.field].filter(Boolean).join(' — ') || '—'}
              </p>
              <p><strong>Duration:</strong> {edu.duration || '—'}</p>
              {edu.grade && <p><strong>Grade:</strong> {edu.grade}</p>}
              {edu.location && <p><strong>Location:</strong> {edu.location}</p>}
              {edu.description && <p><strong>Details:</strong> {edu.description}</p>}
            </div>
          ))}
        </div>
      )}

      {candidate.workExperience.length > 0 && (
        <div className="field-group">
          <h3 className="section-title">Work experience</h3>
          {candidate.workExperience.map((job) => (
            <div className="project-card" key={job.id}>
              <h4>{job.company}</h4>
              <p><strong>Role:</strong> {job.role || '—'}</p>
              <p><strong>Duration:</strong> {job.duration || '—'}</p>
              {job.department && <p><strong>Department:</strong> {job.department}</p>}
              {job.scopeOfWork && <p><strong>Scope of work:</strong> {job.scopeOfWork}</p>}
              {job.location && <p><strong>Location:</strong> {job.location}</p>}
              <p><strong>Responsibilities:</strong> {job.responsibilities || '—'}</p>
              {job.technologies.length > 0 && (
                <div className="tag-row">
                  {job.technologies.map((tech) => (
                    <span className="tag" key={tech}>{tech}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {candidate.internships.length > 0 && (
        <div className="field-group">
          <h3 className="section-title">Internships</h3>
          {candidate.internships.map((intern) => (
            <div className="project-card" key={intern.id}>
              <h4>{intern.company}</h4>
              <p><strong>Role:</strong> {intern.role || '—'}</p>
              <p><strong>Duration:</strong> {intern.duration || '—'}</p>
              {intern.location && <p><strong>Location:</strong> {intern.location}</p>}
              <p><strong>Responsibilities:</strong> {intern.responsibilities || '—'}</p>
              {intern.technologies.length > 0 && (
                <div className="tag-row">
                  {intern.technologies.map((tech) => (
                    <span className="tag" key={tech}>{tech}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {candidate.projects.length > 0 && (
        <h3 className="section-title">Projects</h3>
      )}

      {candidate.projects.map((project, index) => (
        <div className="project-card" key={project.id}>
          <div className="project-header">
            <h3>Project {index + 1}: {project.name}</h3>
            <span className={`review-badge review-${project.reviewStatus}`}>
              {project.reviewStatus}
            </span>
          </div>
          <p><strong>Client:</strong> {project.clientName || '—'}</p>
          <p><strong>Project type:</strong> {project.projectType || '—'}</p>
          <p><strong>Role:</strong> {project.role || '—'}</p>
          <p><strong>Duration:</strong> {project.duration || '—'}</p>
          <p><strong>Team size:</strong> {project.teamSize || '—'}</p>
          <p><strong>Ownership:</strong> {project.ownershipLevel || '—'}</p>
          <p><strong>Manager:</strong> {project.managerDetails || '—'}</p>
          <p><strong>Responsibilities:</strong> {project.responsibilities || '—'}</p>
          <div className="tag-row">
            {project.technologies.map((tech) => (
              <span className="tag" key={tech}>{tech}</span>
            ))}
          </div>
          {Object.keys(project.businessImpact).length > 0 && (
            <div className="impact-block">
              <strong>Business impact</strong>
              <ul>
                {Object.entries(project.businessImpact).map(([key, value]) => (
                  <li key={key}><code>{key}</code>: {value}</li>
                ))}
              </ul>
            </div>
          )}
          {onReviewProject && project.reviewStatus === 'pending' && (
            <div className="action-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onReviewProject(project.id, 'approved')}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  const note = window.prompt('Rejection reason (optional):') ?? undefined;
                  onReviewProject(project.id, 'rejected', note);
                }}
              >
                Reject
              </button>
            </div>
          )}
          {project.reviewNote && (
            <p className="muted"><strong>Review note:</strong> {project.reviewNote}</p>
          )}
          {(peersByProject.get(project.id)?.length ?? 0) > 0 && (
            <div className="peer-match-inline">
              <strong>Same-client colleagues</strong>
              <ul>
                {peersByProject.get(project.id)!.map((peer) => (
                  <li key={`${peer.candidateId}-${peer.projectId}`}>
                    <Link href={`/candidates/${peer.candidateId}`}>{peer.candidateName}</Link>
                    {' — '}
                    {peer.projectName}
                    {peer.duration ? ` (${peer.duration})` : ''}
                    <span className="muted"> · {peer.overlapNote}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
