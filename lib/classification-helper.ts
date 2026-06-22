export interface HasClassificationFields {
  skills: string[];
  credibilityFlags: string[];
  classification?: string | null;
}

export function getCandidateClassification(candidate: HasClassificationFields): 'Technical' | 'Non-Technical' | 'Hybrid' {
  // 0. Check direct database column first
  if (candidate.classification) {
    const val = candidate.classification;
    if (val === 'Technical' || val === 'Non-Technical' || val === 'Hybrid') {
      return val;
    }
  }

  // 1. Check for stored classification in flags
  const classFlag = candidate.credibilityFlags.find((f) => f.startsWith('Classification: '));
  if (classFlag) {
    const val = classFlag.replace('Classification: ', '').trim();
    if (val === 'Technical' || val === 'Non-Technical' || val === 'Hybrid') {
      return val;
    }
  }

  // 2. Check if they have the ERP/CRM flag
  const hasErpCrmFlag = candidate.credibilityFlags.some((f) =>
    f.toLowerCase().includes('technical/hybrid classification is due to erp/crm/excel')
  );

  // 3. Fallback heuristic based on skills
  const skillsStr = candidate.skills.join(' ').toLowerCase();

  // Technical indicator keywords
  const techKeywords = [
    'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'php', 'ruby', 'golang', 'rust', 'swift',
    'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'laravel', 'asp.net',
    'sql', 'postgres', 'mysql', 'mongodb', 'redis', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
    'git', 'ci/cd', 'software', 'developer', 'engineer', 'architect', 'programming', 'coding'
  ];

  // Non-technical indicator keywords
  const nonTechKeywords = [
    'sales', 'marketing', 'hr', 'human resources', 'recruiter', 'finance', 'accounting', 'business development',
    'b2b', 'operations', 'customer success', 'salesforce', 'hubspot', 'crm', 'erp', 'excel', 'sap'
  ];

  const hasTech = techKeywords.some((kw) => skillsStr.includes(kw));
  const hasNonTech = nonTechKeywords.some((kw) => skillsStr.includes(kw));

  if (hasErpCrmFlag) {
    return hasTech ? 'Hybrid' : 'Non-Technical';
  }

  if (hasTech && hasNonTech) {
    return 'Hybrid';
  } else if (hasTech) {
    return 'Technical';
  } else {
    return 'Non-Technical';
  }
}
