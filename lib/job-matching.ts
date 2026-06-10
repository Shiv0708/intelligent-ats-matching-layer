function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/[^a-z0-9+#.\s]/g, '');
}

function skillMatches(candidateSkill: string, required: string): boolean {
  const a = normalizeSkill(candidateSkill);
  const b = normalizeSkill(required);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function extractSkillsFromText(text: string): string[] {
  const parts = text
    .split(/[,;\n|•·]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 60);
  return [...new Set(parts)];
}

export interface MatchResult {
  fitScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  notes: string;
}

export function matchCandidateToJob(
  candidateSkills: string[],
  projectTechnologies: string[],
  jobRequiredSkills: string[],
  jobContent: string
): MatchResult {
  const inferredFromJd = extractSkillsFromText(jobContent);
  const required = [...new Set([...jobRequiredSkills, ...inferredFromJd].map(normalizeSkill))].filter(Boolean);

  const candidatePool = [
    ...candidateSkills,
    ...projectTechnologies,
  ].map(normalizeSkill);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of required) {
    const found = candidatePool.some((cs) => skillMatches(cs, req));
    if (found) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }

  const fitScore =
    required.length === 0 ? 0 : Math.round((matched.length / required.length) * 100);

  const notes =
    required.length === 0
      ? 'No required skills defined on job description.'
      : `${matched.length} of ${required.length} required skills matched.`;

  return { fitScore, matchedSkills: matched, missingSkills: missing, notes };
}
