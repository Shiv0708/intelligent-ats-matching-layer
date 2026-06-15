import { parsedResumeSchema, type ParsedResume } from '@/lib/types/resume';

const SYSTEM_PROMPT = `You are an expert ATS resume parser. Extract resume content into strict JSON only.

Return a single JSON object with this exact structure (no markdown, no commentary):
{
  "candidate_name": "full name",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "skills": ["skill1", "skill2"],
  "total_experience": "e.g. 4+ years",
  "education": [
    {
      "institution": "school or university name",
      "degree": "e.g. B.Tech, MBA, High School",
      "field": "major or stream e.g. Computer Science",
      "duration": "date range if present",
      "grade": "CGPA, percentage, or class if mentioned",
      "location": "city or campus if mentioned",
      "description": "honors, coursework, activities as one paragraph"
    }
  ],
  "internships": [
    {
      "company": "employer or organization name",
      "role": "e.g. Software Engineering Intern",
      "duration": "date range if present",
      "location": "city or remote if mentioned",
      "responsibilities": "bullet-style work as one paragraph",
      "technologies": ["Python", "React"]
    }
  ],
  "work_experience": [
    {
      "company": "employer name e.g. JSW Cement ltd",
      "role": "job title e.g. Junior Engineer, SAP PP Support consultant",
      "duration": "date range e.g. SEP 2021 to JAN 2025",
      "location": "work site or city if mentioned",
      "department": "department if listed e.g. PPC (Production planning & control)",
      "scope_of_work": "scope of work if listed e.g. Production planning & dispatch",
      "responsibilities": "duties for this job as one paragraph; merge Role/Department/Scope bullets when no separate RESPONSIBILITIES section applies to this job only",
      "technologies": ["SAP PP", "S4/HANA"]
    }
  ],
  "projects": [
    {
      "name": "project or product name",
      "client_name": "end client or customer the work was delivered for (not the employer)",
      "project_type": "short category e.g. payment platform, data migration, mobile app",
      "technologies": ["Python", "AWS"],
      "role": "job title on this project",
      "duration": "date range if present e.g. Jan 2020 - Mar 2022",
      "team_size": "team size if mentioned",
      "responsibilities": "bullet-style responsibilities as one paragraph",
      "ownership_level": "e.g. Module Owner, Tech Lead",
      "manager_details": "reporting line if mentioned",
      "business_impact": {
        "metric_key_snake_case": "quantified outcome e.g. 45%"
      }
    }
  ]
}

Rules:
- education[] = every degree, diploma, or academic program (school, college, university). One entry per institution/program.
- internships[] = internship, trainee, or summer industrial training only — not full-time or permanent employment.
- work_experience[] = EVERY paid full-time or contract job with an employer. One entry per employer/role block. REQUIRED when the resume lists employers, even if there is no "Work Experience" heading.
- For work_experience: extract employer blocks that appear as "COMPANY NAME" with dates (e.g. "MUKUNDA SUMI STEEL LTD" FEB 2025 to PRESENT), or quoted names like "JSW Cement ltd" SEP 2021 to JAN2025, often between SUMMARY and SKILLS sections.
- Map Department:, Scope of work:, Role:, Location: lines under each employer into department, scope_of_work, role, location respectively.
- Jr./Junior Engineer at a company is work_experience, NOT an internship, unless explicitly labeled intern/trainee.
- projects[] = named deliverables, products, client engagements, or customer-facing deliveries — NOT employer-level history. Do NOT put employer-only work_experience into projects[].
- If a single employer or work_experience block describes multiple client engagements, extract each engagement as its own projects[] entry. Do not merge multiple clients into one project or one responsibilities paragraph.
- If an engagement does not include a distinct project name, use the client_name and project_type to identify it clearly.
- client_name = the organization the project served (bank, retailer, government agency, end client), even when the candidate's employer was a consulting/vendor firm. Use "" only if no client is identifiable.
- project_type = one concise label for the kind of work (integration, ERP rollout, API modernization, payment platform, etc.).
- business_impact keys must be snake_case describing the metric (e.g. reduce_settlement_delays, improve_api_response_time).
- Include percentage or numbers in business_impact values when present in the resume.
- skills = all technical and professional skills found across the resume.
- If a field is missing, use "" for strings, [] for arrays, {} for business_impact.
- Do not invent facts not supported by the resume text.`;

/** Models with free-tier quota (Flash / Flash-Lite). Avoid gemini-2.0-flash — often limit 0 on free tier. */
export const GEMINI_FREE_TIER_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-2.5-flash',
] as const;

function cleanLlmJson(raw: string): string {
  return raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function parseJsonSafe(raw: string): unknown {
  const cleaned = cleanLlmJson(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('LLM returned invalid JSON. Try again or use clearer resume text.');
  }
}

function getModelsToTry(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim();
  const extra = process.env.GEMINI_FALLBACK_MODELS?.split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  const defaults = [...GEMINI_FREE_TIER_MODELS];
  const ordered: string[] = [];

  if (primary) ordered.push(primary);
  if (extra) ordered.push(...extra);
  ordered.push(...defaults);

  return [...new Set(ordered)];
}

function isQuotaError(status: number, message: string): boolean {
  return status === 429 || /quota|rate.?limit|resource.?exhausted|limit:\s*0/i.test(message);
}

function isModelUnavailable(status: number, message: string): boolean {
  return status === 404 || /not found|not supported|invalid model/i.test(message);
}

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number };
};

async function callGeminiModel(
  apiKey: string,
  model: string,
  userText: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  const payload = (await response.json()) as GeminiGenerateResponse;
  const message = payload.error?.message || JSON.stringify(payload).slice(0, 500);

  if (!response.ok) {
    return { ok: false, status: response.status, message };
  }

  if (payload.error?.message) {
    return { ok: false, status: 500, message: payload.error.message };
  }

  const candidate = payload.candidates?.[0];
  const finish = candidate?.finishReason;
  if (finish && (finish === 'SAFETY' || finish === 'RECITATION' || finish === 'BLOCKLIST')) {
    return { ok: false, status: 400, message: `Gemini blocked output (${finish}).` };
  }

  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text.trim()) {
    return { ok: false, status: 502, message: 'Empty response from Gemini.' };
  }

  return { ok: true, text };
}

export async function parseResumeWithLlm(rawText: string): Promise<ParsedResume> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Get a key from https://aistudio.google.com/apikey and add it to .env (see .env.example).'
    );
  }

  const models = getModelsToTry();
  const userText = `Parse the following resume and return structured JSON only:\n\n${rawText.slice(0, 120000)}`;

  const failures: string[] = [];

  for (const model of models) {
    const result = await callGeminiModel(apiKey, model, userText);

    if (result.ok) {
      const parsed = parseJsonSafe(result.text);
      return parsedResumeSchema.parse(parsed);
    }

    failures.push(`${model}: ${result.message.slice(0, 200)}`);

    if (isQuotaError(result.status, result.message) || isModelUnavailable(result.status, result.message)) {
      continue;
    }

    throw new Error(`Gemini API error (${result.status}) [${model}]: ${result.message}`);
  }

  throw new Error(
    `All Gemini models hit quota or are unavailable. Tried: ${models.join(', ')}. ` +
      `Use a Flash-Lite model (e.g. gemini-2.5-flash-lite). Details: ${failures.join(' | ')}`
  );
}
