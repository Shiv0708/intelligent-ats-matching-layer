import type { ParsedResume } from '@/lib/types/resume';

export interface CredibilityResult {
  score: number;
  flags: string[];
}

export function analyzeCredibility(parsed: ParsedResume): CredibilityResult {
  const flags: string[] = [];
  let score = 100;

  if (!parsed.email) {
    flags.push('Missing email address');
    score -= 5;
  }
  if (!parsed.phone) {
    flags.push('Missing phone number');
    score -= 3;
  }
  if (!parsed.total_experience) {
    flags.push('Total experience not stated');
    score -= 8;
  }
  if (parsed.skills.length < 3) {
    flags.push('Very few skills listed (< 3)');
    score -= 10;
  }
  if (parsed.work_experience.length === 0 && parsed.projects.length === 0) {
    flags.push('No work experience or projects detected');
    score -= 25;
  }

  parsed.work_experience.forEach((job, index) => {
    const label = `Work ${index + 1} (${job.company})`;
    if (!job.duration) {
      flags.push(`${label}: missing duration / date range`);
      score -= 5;
    }
    if (!job.role) {
      flags.push(`${label}: role not specified`);
      score -= 4;
    }
  });

  parsed.projects.forEach((project, index) => {
    const label = `Project ${index + 1} (${project.name})`;

    if (!project.duration) {
      flags.push(`${label}: missing duration / date range`);
      score -= 5;
    }
    if (!project.role) {
      flags.push(`${label}: role not specified`);
      score -= 4;
    }
    if (project.technologies.length === 0) {
      flags.push(`${label}: no technologies listed`);
      score -= 5;
    }
    if (!project.responsibilities || project.responsibilities.length < 40) {
      flags.push(`${label}: vague or very short responsibilities`);
      score -= 6;
    }
    if (Object.keys(project.business_impact ?? {}).length === 0) {
      flags.push(`${label}: no quantified business impact metrics`);
      score -= 8;
    } else {
      const hasNumbers = Object.values(project.business_impact).some((v) => /\d/.test(v));
      if (!hasNumbers) {
        flags.push(`${label}: business impact lacks numbers or percentages`);
        score -= 4;
      }
    }
    if (!project.ownership_level) {
      flags.push(`${label}: ownership level not stated`);
      score -= 3;
    }
  });

  const vaguePatterns = /\b(various|multiple|several|etc\.?|and more|many projects)\b/i;
  if (vaguePatterns.test(JSON.stringify(parsed.projects))) {
    flags.push('Vague language detected (e.g. "various", "multiple")');
    score -= 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    flags,
  };
}
