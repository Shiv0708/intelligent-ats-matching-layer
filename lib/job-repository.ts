import { prisma } from '@/lib/db';
import { matchCandidateToJob } from '@/lib/job-matching';
import { getCandidateById, listCandidates } from '@/lib/candidate-repository';

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function createJobDescription(title: string, content: string, requiredSkills: string[]) {
  return prisma.jobDescription.create({
    data: {
      title,
      content,
      requiredSkills: JSON.stringify(requiredSkills),
    },
  });
}

export async function listJobDescriptions() {
  const jobs = await prisma.jobDescription.findMany({ orderBy: { createdAt: 'desc' } });
  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    content: j.content,
    requiredSkills: parseJsonArray(j.requiredSkills),
    createdAt: j.createdAt.toISOString(),
  }));
}

export async function getJobDescription(id: string) {
  const j = await prisma.jobDescription.findUnique({ where: { id } });
  if (!j) return null;
  return {
    id: j.id,
    title: j.title,
    content: j.content,
    requiredSkills: parseJsonArray(j.requiredSkills),
    createdAt: j.createdAt.toISOString(),
  };
}

export async function matchAllCandidatesToJob(jobId: string) {
  const job = await getJobDescription(jobId);
  if (!job) throw new Error('Job not found');

  const candidates = await listCandidates();
  const results = [];

  for (const candidate of candidates) {
    const allTech = candidate.projects.flatMap((p) => p.technologies);
    const match = matchCandidateToJob(
      candidate.skills,
      allTech,
      job.requiredSkills,
      job.content
    );

    const saved = await prisma.candidateMatch.upsert({
      where: {
        candidateId_jobDescriptionId: {
          candidateId: candidate.id,
          jobDescriptionId: jobId,
        },
      },
      create: {
        candidateId: candidate.id,
        jobDescriptionId: jobId,
        fitScore: match.fitScore,
        matchedSkills: JSON.stringify(match.matchedSkills),
        missingSkills: JSON.stringify(match.missingSkills),
        notes: match.notes,
      },
      update: {
        fitScore: match.fitScore,
        matchedSkills: JSON.stringify(match.matchedSkills),
        missingSkills: JSON.stringify(match.missingSkills),
        notes: match.notes,
      },
    });

    results.push({
      ...match,
      candidateId: candidate.id,
      candidateName: candidate.candidateName,
      matchId: saved.id,
    });
  }

  return results.sort((a, b) => b.fitScore - a.fitScore);
}

export async function getRankingsForJob(jobId: string) {
  const matches = await prisma.candidateMatch.findMany({
    where: { jobDescriptionId: jobId },
    orderBy: { fitScore: 'desc' },
    include: { candidate: { include: { projects: true } } },
  });

  return matches.map((m) => ({
    matchId: m.id,
    candidateId: m.candidateId,
    candidateName: m.candidate.candidateName,
    email: m.candidate.email,
    fitScore: m.fitScore,
    matchedSkills: parseJsonArray(m.matchedSkills),
    missingSkills: parseJsonArray(m.missingSkills),
    notes: m.notes,
    credibilityScore: m.candidate.credibilityScore,
    credibilityFlags: parseJsonArray(m.candidate.credibilityFlags ?? '[]'),
    skills: parseJsonArray(m.candidate.skills ?? '[]'),
    updatedAt: m.updatedAt.toISOString(),
  }));
}

export async function matchSingleCandidate(jobId: string, candidateId: string) {
  const job = await getJobDescription(jobId);
  const candidate = await getCandidateById(candidateId);
  if (!job || !candidate) throw new Error('Job or candidate not found');

  const allTech = candidate.projects.flatMap((p) => p.technologies);
  const match = matchCandidateToJob(
    candidate.skills,
    allTech,
    job.requiredSkills,
    job.content
  );

  await prisma.candidateMatch.upsert({
    where: {
      candidateId_jobDescriptionId: { candidateId, jobDescriptionId: jobId },
    },
    create: {
      candidateId,
      jobDescriptionId: jobId,
      fitScore: match.fitScore,
      matchedSkills: JSON.stringify(match.matchedSkills),
      missingSkills: JSON.stringify(match.missingSkills),
      notes: match.notes,
    },
    update: {
      fitScore: match.fitScore,
      matchedSkills: JSON.stringify(match.matchedSkills),
      missingSkills: JSON.stringify(match.missingSkills),
      notes: match.notes,
    },
  });

  return { ...match, candidateId, candidateName: candidate.candidateName };
}
