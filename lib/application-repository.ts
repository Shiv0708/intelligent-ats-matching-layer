import { prisma } from '@/lib/db';
import { isValidStage, type PipelineStageId } from '@/lib/pipeline-stages';

export interface ApplicationView {
  id: string;
  candidateId: string;
  candidateName: string;
  email: string | null;
  phone: string | null;
  totalExperience: string | null;
  credibilityScore: number | null;
  jobId: string | null;
  jobTitle: string | null;
  stage: PipelineStageId;
  notes: string | null;
  stageChangedAt: string;
  createdAt: string;
}


function mapApplication(
  row: {
    id: string;
    candidateId: string;
    jobDescriptionId: string | null;
    stage: string;
    notes: string | null;
    stageChangedAt: Date;
    createdAt: Date;
    candidate: {
      candidateName: string;
      email: string | null;
      phone: string | null;
      totalExperience: string | null;
      credibilityScore: number | null;
    };
    jobDescription: { id: string; title: string } | null;
  }
): ApplicationView {
  return {
    id: row.id,
    candidateId: row.candidateId,
    candidateName: row.candidate.candidateName,
    email: row.candidate.email,
    phone: row.candidate.phone,
    totalExperience: row.candidate.totalExperience,
    credibilityScore: row.candidate.credibilityScore,
    jobId: row.jobDescriptionId,
    jobTitle: row.jobDescription?.title ?? null,
    stage: row.stage as PipelineStageId,
    notes: row.notes,
    stageChangedAt: row.stageChangedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function assertApplicationModel() {
  const app = (prisma as { application?: { findFirst: unknown } }).application;
  if (!app?.findFirst) {
    throw new Error(
      'Database is out of date (Application table missing). Stop the dev server, then run: npm run db:push && npx prisma generate'
    );
  }
}

export async function createApplication(
  candidateId: string,
  jobDescriptionId?: string | null,
  stage: PipelineStageId = 'applied',
  notes?: string
) {
  assertApplicationModel();

  const existing = await prisma.application.findFirst({
    where: {
      candidateId,
      jobDescriptionId: jobDescriptionId ?? null,
    },
  });

  if (existing) {
    return mapApplication(
      await prisma.application.findUniqueOrThrow({
        where: { id: existing.id },
        include: {
          candidate: true,
          jobDescription: true,
        },
      })
    );
  }

  const app = await prisma.application.create({
    data: {
      candidateId,
      jobDescriptionId: jobDescriptionId ?? null,
      stage,
      notes: notes ?? null,
    },
    include: { candidate: true, jobDescription: true },
  });

  return mapApplication(app);
}

export async function ensureApplicationForCandidate(candidateId: string) {
  const existing = await prisma.application.findFirst({
    where: { candidateId, jobDescriptionId: null },
  });
  if (existing) return mapApplication(
    await prisma.application.findUniqueOrThrow({
      where: { id: existing.id },
      include: { candidate: true, jobDescription: true },
    })
  );
  return createApplication(candidateId, null, 'applied');
}

export async function backfillApplicationsForAllCandidates() {
  const candidates = await prisma.candidate.findMany({ select: { id: true } });
  for (const c of candidates) {
    await ensureApplicationForCandidate(c.id);
  }
}

export async function listApplications(jobId?: string) {
  const rows = await prisma.application.findMany({
    where: jobId ? { jobDescriptionId: jobId } : undefined,
    orderBy: { stageChangedAt: 'desc' },
    include: { candidate: true, jobDescription: true },
  });
  return rows.map(mapApplication);
}

export async function getPipelineBoard(jobId?: string) {
  await backfillApplicationsForAllCandidates();

  const applications = await listApplications(jobId);
  const board: Record<string, ApplicationView[]> = {};

  for (const app of applications) {
    if (!board[app.stage]) board[app.stage] = [];
    board[app.stage].push(app);
  }

  return { applications, board };
}

export async function moveApplicationStage(
  applicationId: string,
  stage: PipelineStageId,
  notes?: string
) {
  if (!isValidStage(stage)) {
    throw new Error('Invalid pipeline stage');
  }

  const before = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { stage: true },
  });

  const app = await prisma.application.update({
    where: { id: applicationId },
    data: {
      stage,
      stageChangedAt: new Date(),
      ...(notes !== undefined && { notes }),
    },
    include: { candidate: true, jobDescription: true },
  });

  const mapped = mapApplication(app);

  if (before && before.stage !== stage) {
    try {
      const { onApplicationStageChange } = await import('@/lib/workflow-engine');
      await onApplicationStageChange(applicationId, stage);
    } catch (e) {
      console.error('[workflow] stage change hook failed:', e);
    }
  }

  return mapped;
}

export async function deleteApplication(applicationId: string) {
  await prisma.application.delete({ where: { id: applicationId } });
}
