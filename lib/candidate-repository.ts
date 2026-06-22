import { filterCandidatesByBoolean } from '@/lib/boolean-search';
import { prisma } from '@/lib/db';
import { flattenParsedResume } from '@/lib/flatten-resume';
import { projectDatesFromDuration } from '@/lib/project-peer-matching';
import type { CandidateRecord, ParsedResume } from '@/lib/types/resume';
import type { Candidate, Education, Internship, Project, WorkExperience } from '@prisma/client';

type CandidateWithRelations = Candidate & {
  projects: Project[];
  education: Education[];
  internships: Internship[];
  workExperience: WorkExperience[];
};

const candidateInclude = {
  projects: { orderBy: { orderIndex: 'asc' as const } },
  education: { orderBy: { orderIndex: 'asc' as const } },
  internships: { orderBy: { orderIndex: 'asc' as const } },
  workExperience: { orderBy: { orderIndex: 'asc' as const } },
};

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)])
      );
    }
    return {};
  } catch {
    return {};
  }
}

function mapCandidate(row: CandidateWithRelations | null): CandidateRecord | null {
  if (!row) return null;

  const skills = parseJsonArray(row.skills);
  const education = row.education.map((e) => ({
    id: e.id,
    orderIndex: e.orderIndex,
    institution: e.institution,
    degree: e.degree,
    field: e.field,
    duration: e.duration,
    grade: e.grade,
    location: e.location,
    description: e.description,
  }));
  const internships = row.internships.map((i) => ({
    id: i.id,
    orderIndex: i.orderIndex,
    company: i.company,
    role: i.role,
    duration: i.duration,
    location: i.location,
    responsibilities: i.responsibilities,
    technologies: parseJsonArray(i.technologies),
  }));
  const workExperience = row.workExperience.map((w) => ({
    id: w.id,
    orderIndex: w.orderIndex,
    company: w.company,
    role: w.role,
    duration: w.duration,
    location: w.location,
    department: w.department,
    scopeOfWork: w.scopeOfWork,
    responsibilities: w.responsibilities,
    technologies: parseJsonArray(w.technologies),
  }));
  const projects = row.projects.map((p) => ({
    id: p.id,
    orderIndex: p.orderIndex,
    name: p.name,
    clientName: p.clientName,
    projectType: p.projectType,
    technologies: parseJsonArray(p.technologies),
    role: p.role,
    duration: p.duration,
    durationStart: p.durationStart?.toISOString() ?? null,
    durationEnd: p.durationEnd?.toISOString() ?? null,
    teamSize: p.teamSize,
    responsibilities: p.responsibilities,
    ownershipLevel: p.ownershipLevel,
    managerDetails: p.managerDetails,
    businessImpact: parseJsonObject(p.businessImpact),
    reviewStatus: p.reviewStatus,
    reviewNote: p.reviewNote,
    reviewedAt: p.reviewedAt?.toISOString() ?? null,
  }));

  const parsedShape: ParsedResume = {
    candidate_name: row.candidateName,
    email: row.email ?? '',
    phone: row.phone ?? '',
    skills,
    total_experience: row.totalExperience ?? '',
    education: education.map((e) => ({
      institution: e.institution,
      degree: e.degree ?? '',
      field: e.field ?? '',
      duration: e.duration ?? '',
      grade: e.grade ?? '',
      location: e.location ?? '',
      description: e.description ?? '',
    })),
    internships: internships.map((i) => ({
      company: i.company,
      role: i.role ?? '',
      duration: i.duration ?? '',
      location: i.location ?? '',
      responsibilities: i.responsibilities ?? '',
      technologies: i.technologies,
    })),
    work_experience: workExperience.map((w) => ({
      company: w.company,
      role: w.role ?? '',
      duration: w.duration ?? '',
      location: w.location ?? '',
      department: w.department ?? '',
      scope_of_work: w.scopeOfWork ?? '',
      responsibilities: w.responsibilities ?? '',
      technologies: w.technologies,
    })),
    projects: projects.map((p) => ({
      name: p.name,
      client_name: p.clientName ?? '',
      project_type: p.projectType ?? '',
      technologies: p.technologies,
      role: p.role ?? '',
      duration: p.duration ?? '',
      team_size: p.teamSize ?? '',
      responsibilities: p.responsibilities ?? '',
      ownership_level: p.ownershipLevel ?? '',
      manager_details: p.managerDetails ?? '',
      business_impact: p.businessImpact,
    })),
  };

  return {
    id: row.id,
    candidateName: row.candidateName,
    email: row.email,
    phone: row.phone,
    skills,
    totalExperience: row.totalExperience,
    rawResumeText: row.rawResumeText,
    credibilityFlags: parseJsonArray(row.credibilityFlags ?? '[]'),
    credibilityScore: row.credibilityScore,
    classification: row.classification,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    education,
    internships,
    workExperience,
    projects,
    flattened: flattenParsedResume(parsedShape),
  };
}

export interface ListCandidatesOptions {
  query?: string;
  skill?: string;
  booleanQuery?: string;
}

export async function saveParsedCandidate(
  parsed: ParsedResume,
  rawResumeText: string,
  credibility: { score: number; flags: string[] },
  classification: string | null = null
) {
  const candidate = await prisma.candidate.create({
    data: {
      candidateName: parsed.candidate_name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      skills: JSON.stringify(parsed.skills),
      totalExperience: parsed.total_experience || null,
      rawResumeText,
      credibilityScore: credibility.score,
      credibilityFlags: JSON.stringify(credibility.flags),
      classification,
      education: {
        create: parsed.education.map((edu, index) => ({
          orderIndex: index,
          institution: edu.institution,
          degree: edu.degree || null,
          field: edu.field || null,
          duration: edu.duration || null,
          grade: edu.grade || null,
          location: edu.location || null,
          description: edu.description || null,
        })),
      },
      internships: {
        create: parsed.internships.map((intern, index) => ({
          orderIndex: index,
          company: intern.company,
          role: intern.role || null,
          duration: intern.duration || null,
          location: intern.location || null,
          responsibilities: intern.responsibilities || null,
          technologies: JSON.stringify(intern.technologies),
        })),
      },
      workExperience: {
        create: parsed.work_experience.map((job, index) => ({
          orderIndex: index,
          company: job.company,
          role: job.role || null,
          duration: job.duration || null,
          location: job.location || null,
          department: job.department || null,
          scopeOfWork: job.scope_of_work || null,
          responsibilities: job.responsibilities || null,
          technologies: JSON.stringify(job.technologies),
        })),
      },
      projects: {
        create: parsed.projects.map((project, index) => {
          const dates = projectDatesFromDuration(project.duration || null);
          return {
            orderIndex: index,
            name: project.name,
            clientName: project.client_name?.trim() || null,
            projectType: project.project_type?.trim() || null,
            technologies: JSON.stringify(project.technologies),
            role: project.role || null,
            duration: project.duration || null,
            durationStart: dates.durationStart,
            durationEnd: dates.durationEnd,
            teamSize: project.team_size || null,
            responsibilities: project.responsibilities || null,
            ownershipLevel: project.ownership_level || null,
            managerDetails: project.manager_details || null,
            businessImpact: JSON.stringify(project.business_impact ?? {}),
          };
        }),
      },
    },
    include: candidateInclude,
  });

  return mapCandidate(candidate)!;
}

export async function listCandidates(options: ListCandidatesOptions = {}) {
  const rows = await prisma.candidate.findMany({
    orderBy: { createdAt: 'desc' },
    include: candidateInclude,
  });

  let results = rows.map((row) => mapCandidate(row)!);

  if (options.query) {
    const q = options.query.toLowerCase();
    results = results.filter(
      (c) =>
        c.candidateName.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        c.skills.some((s) => s.toLowerCase().includes(q)) ||
        c.education.some(
          (e) =>
            e.institution.toLowerCase().includes(q) ||
            (e.degree?.toLowerCase().includes(q) ?? false) ||
            (e.field?.toLowerCase().includes(q) ?? false)
        ) ||
        c.internships.some(
          (i) =>
            i.company.toLowerCase().includes(q) ||
            (i.role?.toLowerCase().includes(q) ?? false)
        ) ||
        c.workExperience.some(
          (w) =>
            w.company.toLowerCase().includes(q) ||
            (w.role?.toLowerCase().includes(q) ?? false) ||
            (w.department?.toLowerCase().includes(q) ?? false)
        )
    );
  }

  if (options.skill) {
    const s = options.skill.toLowerCase();
    results = results.filter(
      (c) =>
        c.skills.some((sk) => sk.toLowerCase().includes(s)) ||
        c.projects.some((p) => p.technologies.some((t) => t.toLowerCase().includes(s))) ||
        c.internships.some((i) => i.technologies.some((t) => t.toLowerCase().includes(s))) ||
        c.workExperience.some((w) => w.technologies.some((t) => t.toLowerCase().includes(s)))
    );
  }

  if (options.booleanQuery?.trim()) {
    results = filterCandidatesByBoolean(results, options.booleanQuery);
  }

  return results;
}

export async function getCandidateById(id: string) {
  const row = await prisma.candidate.findUnique({
    where: { id },
    include: candidateInclude,
  });

  return mapCandidate(row);
}

export interface UpdateCandidateInput {
  candidateName?: string;
  email?: string | null;
  phone?: string | null;
  skills?: string[];
  totalExperience?: string | null;
}

export async function updateCandidate(id: string, input: UpdateCandidateInput) {
  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      ...(input.candidateName !== undefined && { candidateName: input.candidateName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.skills !== undefined && { skills: JSON.stringify(input.skills) }),
      ...(input.totalExperience !== undefined && { totalExperience: input.totalExperience }),
    },
    include: candidateInclude,
  });

  return mapCandidate(candidate)!;
}

export async function deleteCandidate(id: string) {
  await prisma.candidate.delete({ where: { id } });
}

export async function reviewProject(
  projectId: string,
  status: 'approved' | 'rejected' | 'pending',
  note?: string
) {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      reviewStatus: status,
      reviewNote: note ?? null,
      reviewedAt: status === 'pending' ? null : new Date(),
    },
  });
  return project;
}
