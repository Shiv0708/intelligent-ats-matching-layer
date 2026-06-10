import type { CandidateRecord } from '@/lib/types/resume';

export type BooleanField =
  | 'name'
  | 'email'
  | 'skill'
  | 'client'
  | 'project'
  | 'type'
  | 'role'
  | 'tech';

type Token =
  | { kind: 'term'; value: string; field?: BooleanField }
  | { kind: 'and' }
  | { kind: 'or' }
  | { kind: 'not' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

export type AstNode =
  | { type: 'term'; value: string; field?: BooleanField }
  | { type: 'and'; left: AstNode; right: AstNode }
  | { type: 'or'; left: AstNode; right: AstNode }
  | { type: 'not'; operand: AstNode };

const FIELD_ALIASES: Record<string, BooleanField> = {
  name: 'name',
  email: 'email',
  skill: 'skill',
  skills: 'skill',
  client: 'client',
  project: 'project',
  projects: 'project',
  type: 'type',
  role: 'role',
  tech: 'tech',
  technology: 'tech',
  technologies: 'tech',
};

const OPERATORS = new Set(['and', 'or', 'not']);

function normalizeField(raw: string): BooleanField | undefined {
  return FIELD_ALIASES[raw.toLowerCase()];
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }
    if (ch === '"') {
      i += 1;
      let value = '';
      while (i < input.length && input[i] !== '"') {
        value += input[i];
        i += 1;
      }
      if (input[i] === '"') i += 1;
      if (value) tokens.push({ kind: 'term', value });
      continue;
    }

    let word = '';
    while (i < input.length && !/\s/.test(input[i]) && input[i] !== '(' && input[i] !== ')') {
      word += input[i];
      i += 1;
    }

    if (!word) continue;

    const lower = word.toLowerCase();
    if (OPERATORS.has(lower)) {
      tokens.push({ kind: lower as 'and' | 'or' | 'not' });
      continue;
    }

    const colon = word.indexOf(':');
    if (colon > 0) {
      const fieldKey = word.slice(0, colon);
      const field = normalizeField(fieldKey);
      const value = word.slice(colon + 1).replace(/^"+|"+$/g, '');
      if (field && value) {
        tokens.push({ kind: 'term', value, field });
        continue;
      }
    }

    tokens.push({ kind: 'term', value: word });
  }

  return tokens;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): AstNode | null {
    if (this.tokens.length === 0) return null;
    const expr = this.parseOr();
    return expr;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private match(kind: Token['kind']): boolean {
    const t = this.peek();
    if (t && t.kind === kind) {
      this.pos += 1;
      return true;
    }
    return false;
  }

  private parseOr(): AstNode {
    let node = this.parseAnd();
    while (this.match('or')) {
      node = { type: 'or', left: node, right: this.parseAnd() };
    }
    return node;
  }

  private parseAnd(): AstNode {
    let node = this.parseNot();
    while (this.shouldContinueAnd()) {
      if (!this.match('and')) {
        // implicit AND between adjacent terms
      }
      node = { type: 'and', left: node, right: this.parseNot() };
    }
    return node;
  }

  private shouldContinueAnd(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.kind === 'and') return true;
    return t.kind === 'term' || t.kind === 'not' || t.kind === 'lparen';
  }

  private parseNot(): AstNode {
    if (this.match('not')) {
      return { type: 'not', operand: this.parseNot() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): AstNode {
    const t = this.peek();
    if (!t) {
      return { type: 'term', value: '' };
    }
    if (this.match('lparen')) {
      const inner = this.parseOr();
      this.match('rparen');
      return inner;
    }
    if (t.kind === 'term') {
      this.consume();
      return { type: 'term', value: t.value, field: t.field };
    }
    this.consume();
    return { type: 'term', value: '' };
  }
}

export function parseBooleanQuery(query: string): AstNode | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;
  return new Parser(tokens).parse();
}

export function validateBooleanQuery(query: string): { ok: true } | { ok: false; error: string } {
  try {
    const ast = parseBooleanQuery(query);
    if (!ast) return { ok: false, error: 'Query is empty' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid query' };
  }
}

function haystackForField(candidate: CandidateRecord, field: BooleanField): string {
  switch (field) {
    case 'name':
      return candidate.candidateName;
    case 'email':
      return candidate.email ?? '';
    case 'skill':
      return [
        ...candidate.skills,
        ...candidate.workExperience.flatMap((w) => w.technologies),
        ...candidate.projects.flatMap((p) => p.technologies),
      ].join(' ');
    case 'client':
      return candidate.projects.map((p) => p.clientName ?? '').join(' ');
    case 'project':
      return candidate.projects
        .map((p) =>
          [p.name, p.responsibilities, p.role, p.managerDetails].filter(Boolean).join(' ')
        )
        .join(' ');
    case 'type':
      return candidate.projects.map((p) => p.projectType ?? '').join(' ');
    case 'role':
      return [
        ...candidate.workExperience.map((w) => w.role ?? ''),
        ...candidate.projects.map((p) => p.role ?? ''),
      ].join(' ');
    case 'tech':
      return candidate.projects.flatMap((p) => p.technologies).join(' ');
    default:
      return '';
  }
}

export function candidateSearchBlob(candidate: CandidateRecord): string {
  const parts = [
    candidate.candidateName,
    candidate.email ?? '',
    candidate.phone ?? '',
    candidate.totalExperience ?? '',
    candidate.skills.join(' '),
    candidate.rawResumeText ?? '',
    ...candidate.education.flatMap((e) => [
      e.institution,
      e.degree ?? '',
      e.field ?? '',
      e.duration ?? '',
      e.grade ?? '',
      e.location ?? '',
      e.description ?? '',
    ]),
    ...candidate.internships.flatMap((i) => [
      i.company,
      i.role ?? '',
      i.duration ?? '',
      i.location ?? '',
      i.responsibilities ?? '',
      ...i.technologies,
    ]),
    ...candidate.workExperience.flatMap((w) => [
      w.company,
      w.role ?? '',
      w.duration ?? '',
      w.location ?? '',
      w.department ?? '',
      w.scopeOfWork ?? '',
      w.responsibilities ?? '',
      ...w.technologies,
    ]),
    ...candidate.projects.flatMap((p) => [
      p.name,
      p.clientName ?? '',
      p.projectType ?? '',
      p.role ?? '',
      p.duration ?? '',
      p.responsibilities ?? '',
      p.ownershipLevel ?? '',
      p.managerDetails ?? '',
      ...p.technologies,
      ...Object.entries(p.businessImpact).map(([k, v]) => `${k} ${v}`),
    ]),
  ];
  return parts.join(' ').toLowerCase();
}

function termMatches(haystack: string, term: string): boolean {
  const h = haystack.toLowerCase();
  const t = term.toLowerCase();
  if (!t) return true;
  return h.includes(t);
}

function evaluateNode(node: AstNode, candidate: CandidateRecord): boolean {
  switch (node.type) {
    case 'term': {
      if (!node.value) return true;
      const haystack = node.field
        ? haystackForField(candidate, node.field).toLowerCase()
        : candidateSearchBlob(candidate);
      return termMatches(haystack, node.value);
    }
    case 'and':
      return evaluateNode(node.left, candidate) && evaluateNode(node.right, candidate);
    case 'or':
      return evaluateNode(node.left, candidate) || evaluateNode(node.right, candidate);
    case 'not':
      return !evaluateNode(node.operand, candidate);
    default:
      return false;
  }
}

export function matchesBooleanQuery(candidate: CandidateRecord, query: string): boolean {
  const ast = parseBooleanQuery(query);
  if (!ast) return true;
  return evaluateNode(ast, candidate);
}

export function filterCandidatesByBoolean(
  candidates: CandidateRecord[],
  query: string
): CandidateRecord[] {
  const trimmed = query.trim();
  if (!trimmed) return candidates;
  return candidates.filter((c) => matchesBooleanQuery(c, trimmed));
}

/** Short help text for the UI. */
export const BOOLEAN_SEARCH_HELP = `Use AND, OR, NOT and parentheses. Quote phrases: "payment platform".
Field filters: name:, email:, skill:, client:, project:, type:, role:, tech:
Examples: python AND aws | (react OR vue) NOT intern | client:acme AND skill:java`;
