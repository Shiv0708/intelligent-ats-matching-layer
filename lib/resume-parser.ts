const KNOWN_TECHNOLOGIES = [
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'react', 'next.js', 'node.js', 'node', 'express',
  'angular', 'vue', 'django', 'flask', 'spring', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql', 'postgresql',
  'mysql', 'mongodb', 'graphql', 'rest', 'redis', 'elasticsearch', 'jira', 'git', 'github', 'gitlab', 'terraform',
  'salesforce', 'powerbi', 'tableau', 'linux', 'bash', 'api', 'microservices', 'serverless', 'html', 'css',
  'sass', 'tailwind', 'bootstrap', 'jira', 'confluence', 'agile', 'scrum'
];

const PROJECT_KEYWORDS = /project|engagement|assignment|initiative|implementation|delivery|migration|development/i;
const IMPACT_KEYWORDS = /reduc|improv|increas|accelerat|optim|deliver|achiev|save|boost|gain|cut|cutting|growth|yield/i;

function normalizeText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
}

function extractBetween(text: string, regex: RegExp) {
  const match = regex.exec(text);
  return match?.groups?.value?.trim() || match?.[0]?.trim() || '';
}

function parseDateRange(raw: string) {
  const rangeRegex = /(?<start>\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}\/\d{2,4}|\d{4})\b)[^\n\r\-–—]{0,60}(?:-|to|until|through|–|—)[^\n\r]{0,80}(?<end>\b(?:present|current|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}\/\d{2,4}|\d{4})\b)/i;
  const match = raw.match(rangeRegex);
  return match ? match[0].trim() : '';
}

function parseTeamSize(raw: string) {
  const match = raw.match(/team\s*(?:of|with)?\s*(?:around|about|approximately|approx\.?\s*)?([0-9]{1,2})/i);
  return match ? match[1] : '';
}

function parseRole(raw: string) {
  const roleMatch = raw.match(/(?:role[:\-]?|as an?|as a|as senior|as lead|as principal|as staff)\s*([A-Za-z0-9 ]{3,70})/i);
  if (roleMatch) {
    return roleMatch[1].trim();
  }

  const firstLine = raw.split('\n')[0];
  if (/^(Senior|Lead|Principal|Architect|Engineer|Developer|Manager|Consultant|Analyst)/i.test(firstLine)) {
    return firstLine.trim();
  }

  return '';
}

function parseTechnologies(raw: string) {
  const normalized = raw.toLowerCase();
  const found = KNOWN_TECHNOLOGIES.filter((tech) => normalized.includes(tech));
  return Array.from(new Set(found)).sort();
}

function parseOwnership(raw: string) {
  const ownerMatch = raw.match(/\b(led|owned|owned the|responsible for|ownership of|accountable for|led the|head of|lead of)\b/i);
  if (ownerMatch) {
    return ownerMatch[0].toLowerCase();
  }
  return '';
}

function parseBusinessImpact(raw: string) {
  const sentences = raw
    .split(/[\.\n]\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => IMPACT_KEYWORDS.test(sentence));
  return sentences.join('. ').trim();
}

function parseManagerDetails(raw: string) {
  const match = raw.match(/(?:report(?:ed)? to|working with|under the guidance of|manager[:\-]?|project manager[:\-]?|lead[:\-]?)([^\n\.]+)/i);
  return match ? match[1].trim() : '';
}

function parseProjectBlocks(rawText: string) {
  const normalized = normalizeText(rawText);
  const paragraphs = normalized.split(/\n{2,}/g).map((paragraph) => paragraph.trim()).filter(Boolean);
  const projectParagraphs = paragraphs.filter((paragraph) => PROJECT_KEYWORDS.test(paragraph));

  if (projectParagraphs.length > 0) {
    return projectParagraphs;
  }

  return paragraphs;
}

function buildProject(projectText: string, index: number) {
  const titleLine = projectText.split('\n')[0];
  const title = titleLine.length < 120 ? titleLine.trim() : `Project ${index + 1}`;

  return {
    projectId: extractBetween(projectText, /project\s*id\s*[:\-]?\s*(?<value>[A-Za-z0-9\-]+)/i) || `proj-${index + 1}`,
    title,
    description: projectText.replace(/\n+/g, ' ').trim(),
    duration: parseDateRange(projectText),
    teamSize: parseTeamSize(projectText),
    role: parseRole(projectText),
    ownershipLevel: parseOwnership(projectText),
    businessImpact: parseBusinessImpact(projectText),
    managerDetails: parseManagerDetails(projectText),
    technologies: parseTechnologies(projectText),
    responsibilities: projectText
      .split(/[\.\n]\s*/)
      .map((line) => line.trim())
      .filter((line) => /designed|developed|implemented|led|owned|managed|coordinated|built|optimized|deployed|supported|tested|analyzed/i.test(line))
      .slice(0, 6),
    metrics: Array.from(new Set(Array.from(projectText.matchAll(/\b(?:\d+\.?\d*%|\$?\d+[kKmM]?|\d+\s+(?:days|months|years)|improved|reduced|increased|decreased)\b/gi), (match) => match[0]))),
  };
}

export function parseResumeText(rawText: string) {
  const normalized = normalizeText(rawText);
  const blocks = parseProjectBlocks(normalized);
  const projects = blocks.map((block, index) => buildProject(block, index));

  const skills = Array.from(
    new Set(
      KNOWN_TECHNOLOGIES.filter((tech) => normalized.toLowerCase().includes(tech))
    )
  );

  const summary = `Detected ${projects.length} project${projects.length === 1 ? '' : 's'} with ` +
    `${skills.length} technology${skills.length === 1 ? '' : 'ies'} and structured project metadata.`;

  return {
    summary,
    projects,
    technologies: skills,
    skills,
    rawText: normalized,
  };
}
