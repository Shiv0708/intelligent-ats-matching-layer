import type { ParsedResume } from '@/lib/types/resume';

/** Sheet-style flat keys (project_1_name, project_1_business_impact_*, etc.) */
export function flattenParsedResume(parsed: ParsedResume): Record<string, string> {
  const flat: Record<string, string> = {
    candidate_name: parsed.candidate_name,
    email: parsed.email ?? '',
    phone: parsed.phone ?? '',
    skills: parsed.skills.join(', '),
    total_experience: parsed.total_experience ?? '',
  };

  parsed.education.forEach((edu, index) => {
    const n = index + 1;
    const prefix = `education_${n}`;
    flat[`${prefix}_institution`] = edu.institution;
    flat[`${prefix}_degree`] = edu.degree ?? '';
    flat[`${prefix}_field`] = edu.field ?? '';
    flat[`${prefix}_duration`] = edu.duration ?? '';
    flat[`${prefix}_grade`] = edu.grade ?? '';
    flat[`${prefix}_location`] = edu.location ?? '';
    flat[`${prefix}_description`] = edu.description ?? '';
  });

  parsed.internships.forEach((intern, index) => {
    const n = index + 1;
    const prefix = `internship_${n}`;
    flat[`${prefix}_company`] = intern.company;
    flat[`${prefix}_role`] = intern.role ?? '';
    flat[`${prefix}_duration`] = intern.duration ?? '';
    flat[`${prefix}_location`] = intern.location ?? '';
    flat[`${prefix}_responsibilities`] = intern.responsibilities ?? '';
    flat[`${prefix}_technologies`] = intern.technologies.join(', ');
  });

  parsed.work_experience.forEach((job, index) => {
    const n = index + 1;
    const prefix = `work_${n}`;
    flat[`${prefix}_company`] = job.company;
    flat[`${prefix}_role`] = job.role ?? '';
    flat[`${prefix}_duration`] = job.duration ?? '';
    flat[`${prefix}_location`] = job.location ?? '';
    flat[`${prefix}_department`] = job.department ?? '';
    flat[`${prefix}_scope_of_work`] = job.scope_of_work ?? '';
    flat[`${prefix}_responsibilities`] = job.responsibilities ?? '';
    flat[`${prefix}_technologies`] = job.technologies.join(', ');
  });

  parsed.projects.forEach((project, index) => {
    const n = index + 1;
    const prefix = `project_${n}`;

    flat[`${prefix}_name`] = project.name;
    flat[`${prefix}_client_name`] = project.client_name ?? '';
    flat[`${prefix}_project_type`] = project.project_type ?? '';
    flat[`${prefix}_technologies`] = project.technologies.join(', ');
    flat[`${prefix}_role`] = project.role ?? '';
    flat[`${prefix}_duration`] = project.duration ?? '';
    flat[`${prefix}_team_size`] = project.team_size ?? '';
    flat[`${prefix}_responsibilities`] = project.responsibilities ?? '';
    flat[`${prefix}_ownership_level`] = project.ownership_level ?? '';
    flat[`${prefix}_manager_details`] = project.manager_details ?? '';

    Object.entries(project.business_impact ?? {}).forEach(([key, value]) => {
      flat[`${prefix}_business_impact_${key}`] = value;
    });
  });

  return flat;
}
