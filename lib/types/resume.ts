import { z } from 'zod';

/** Gemini often returns null for missing fields; Zod .default('') does not coerce null. */
const llmStr = z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v == null ? '' : String(v)));

const llmRequiredStr = llmStr.pipe(z.string().min(1));

const llmStrArray = z
  .union([z.array(z.union([z.string(), z.null()])), z.null(), z.undefined()])
  .transform((v) =>
    v == null ? [] : v.map((x) => (x == null ? '' : String(x))).filter((s) => s.length > 0)
  );

export const businessImpactSchema = z
  .union([z.record(z.string(), z.union([z.string(), z.null()])), z.null(), z.undefined()])
  .transform((v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v).map(([k, val]) => [k, val == null ? '' : String(val)])
    );
  })
  .default({});

export const educationSchema = z.object({
  institution: llmStr.default(''),
  degree: llmStr.default(''),
  field: llmStr.default(''),
  duration: llmStr.default(''),
  grade: llmStr.default(''),
  location: llmStr.default(''),
  description: llmStr.default(''),
});

export const internshipSchema = z.object({
  company: llmStr.default(''),
  role: llmStr.default(''),
  duration: llmStr.default(''),
  location: llmStr.default(''),
  responsibilities: llmStr.default(''),
  technologies: llmStrArray.default([]),
});

export const workExperienceSchema = z.object({
  company: llmStr.default(''),
  role: llmStr.default(''),
  duration: llmStr.default(''),
  location: llmStr.default(''),
  department: llmStr.default(''),
  scope_of_work: llmStr.default(''),
  responsibilities: llmStr.default(''),
  technologies: llmStrArray.default([]),
});

export const projectSchema = z.object({
  name: llmStr.default(''),
  client_name: llmStr.default(''),
  project_type: llmStr.default(''),
  technologies: llmStrArray.default([]),
  role: llmStr.default(''),
  duration: llmStr.default(''),
  team_size: llmStr.default(''),
  responsibilities: llmStr.default(''),
  ownership_level: llmStr.default(''),
  manager_details: llmStr.default(''),
  business_impact: businessImpactSchema,
});

export const parsedResumeSchema = z.object({
  candidate_name: llmRequiredStr,
  email: llmStr.default(''),
  phone: llmStr.default(''),
  skills: llmStrArray.default([]),
  total_experience: llmStr.default(''),
  education: z
    .array(educationSchema)
    .default([])
    .transform((rows) => rows.filter((e) => e.institution.trim().length > 0)),
  internships: z
    .array(internshipSchema)
    .default([])
    .transform((rows) => rows.filter((i) => i.company.trim().length > 0)),
  work_experience: z
    .array(workExperienceSchema)
    .default([])
    .transform((rows) => rows.filter((w) => w.company.trim().length > 0)),
  projects: z
    .array(projectSchema)
    .default([])
    .transform((rows) => rows.filter((p) => p.name.trim().length > 0)),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;
export type ParsedEducation = z.infer<typeof educationSchema>;
export type ParsedInternship = z.infer<typeof internshipSchema>;
export type ParsedWorkExperience = z.infer<typeof workExperienceSchema>;
export type ParsedProject = z.infer<typeof projectSchema>;

export interface CandidateRecord {
  id: string;
  candidateName: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  totalExperience: string | null;
  rawResumeText: string | null;
  credibilityFlags: string[];
  credibilityScore: number | null;
  classification: string | null;
  createdAt: string;
  updatedAt: string;
  education: Array<{
    id: string;
    orderIndex: number;
    institution: string;
    degree: string | null;
    field: string | null;
    duration: string | null;
    grade: string | null;
    location: string | null;
    description: string | null;
  }>;
  internships: Array<{
    id: string;
    orderIndex: number;
    company: string;
    role: string | null;
    duration: string | null;
    location: string | null;
    responsibilities: string | null;
    technologies: string[];
  }>;
  workExperience: Array<{
    id: string;
    orderIndex: number;
    company: string;
    role: string | null;
    duration: string | null;
    location: string | null;
    department: string | null;
    scopeOfWork: string | null;
    responsibilities: string | null;
    technologies: string[];
  }>;
  projects: Array<{
    id: string;
    orderIndex: number;
    name: string;
    clientName: string | null;
    projectType: string | null;
    technologies: string[];
    role: string | null;
    duration: string | null;
    durationStart: string | null;
    durationEnd: string | null;
    teamSize: string | null;
    responsibilities: string | null;
    ownershipLevel: string | null;
    managerDetails: string | null;
    businessImpact: Record<string, string>;
    reviewStatus: string;
    reviewNote: string | null;
    reviewedAt: string | null;
  }>;
  flattened: Record<string, string>;
}
