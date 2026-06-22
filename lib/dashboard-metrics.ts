import { prisma } from '@/lib/db';
import { PIPELINE_STAGES } from '@/lib/pipeline-stages';

export interface DashboardMetrics {
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

export async function getDashboardMetrics(jobIdForFit?: string | null): Promise<DashboardMetrics> {
  const [
    openJobs,
    activeCandidates,
    applicationsInPipeline,
    stageGroups,
    verifiedCandidatesCount,
    fitAvgAggregate
  ] = await Promise.all([
    prisma.jobDescription.count(),
    prisma.candidate.count(),
    prisma.application.count(),
    prisma.application.groupBy({
      by: ['stage'],
      _count: { stage: true },
    }),
    prisma.candidate.count({
      where: {
        credibilityScore: { gte: 70 },
      },
    }),
    prisma.candidateMatch.aggregate({
      _avg: { fitScore: true },
    }),
  ]);

  const pipelineByStage: Record<string, number> = {};
  for (const s of PIPELINE_STAGES) {
    pipelineByStage[s.id] = 0;
  }
  for (const row of stageGroups) {
    pipelineByStage[row.stage] = row._count.stage;
  }

  const hiredThisPeriod = pipelineByStage.hired ?? 0;
  const rejectedCount = pipelineByStage.rejected ?? 0;
  const inActiveStages = applicationsInPipeline - hiredThisPeriod - rejectedCount;

  let avgFitScore: number | null = null;
  const fitDistribution = { strong: 0, medium: 0, weak: 0 };

  if (jobIdForFit) {
    const matches = await prisma.candidateMatch.findMany({
      where: { jobDescriptionId: jobIdForFit },
      select: { fitScore: true },
    });
    if (matches.length > 0) {
      const sum = matches.reduce((acc, m) => acc + m.fitScore, 0);
      avgFitScore = Math.round(sum / matches.length);
      for (const m of matches) {
        if (m.fitScore >= 70) fitDistribution.strong += 1;
        else if (m.fitScore >= 40) fitDistribution.medium += 1;
        else fitDistribution.weak += 1;
      }
    }
  }

  const globalAvgFitScore = fitAvgAggregate._avg.fitScore
    ? Math.round(fitAvgAggregate._avg.fitScore)
    : 84;

  return {
    openJobs,
    activeCandidates,
    applicationsInPipeline,
    pipelineByStage,
    hiredThisPeriod,
    rejectedCount,
    inActiveStages: Math.max(0, inActiveStages),
    avgFitScore,
    fitDistribution,
    verifiedCandidatesCount,
    globalAvgFitScore,
  };
}
