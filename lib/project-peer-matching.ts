import { prisma } from '@/lib/db';
import { expandRange, parseDurationText, rangesOverlap, type DateRange } from '@/lib/duration-parse';

const BUFFER_MONTHS = 1;

export interface ProjectPeerRow {
  projectId: string;
  candidateId: string;
  candidateName: string;
  projectName: string;
  clientName: string | null;
  projectType: string | null;
  duration: string | null;
  role: string | null;
  range: DateRange | null;
}

export interface ProjectPeerMatch {
  clientKey: string;
  projectTypeKey: string;
  clientDisplay: string;
  projectTypeDisplay: string;
  projects: ProjectPeerRow[];
  /** Pairs of different candidates on overlapping timelines (±1 month buffer). */
  pairs: Array<{
    projectA: ProjectPeerRow;
    projectB: ProjectPeerRow;
    overlapNote: string;
  }>;
}

function normalizeKey(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(inc|llc|ltd|corp|corporation|limited|plc|co)\b\.?/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keysMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
  const aTokens = new Set(a.split(' ').filter((t) => t.length > 2));
  const bTokens = new Set(b.split(' ').filter((t) => t.length > 2));
  if (aTokens.size === 0 || bTokens.size === 0) return false;
  let shared = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) shared += 1;
  }
  const minSize = Math.min(aTokens.size, bTokens.size);
  const threshold = Math.max(1, Math.ceil(minSize * 0.6));
  return shared >= threshold;
}

function resolveRange(
  durationStart: Date | null,
  durationEnd: Date | null,
  durationText: string | null
): DateRange | null {
  if (durationStart && durationEnd) {
    return { start: durationStart, end: durationEnd };
  }
  return parseDurationText(durationText);
}

function rowFromDb(
  p: {
    id: string;
    candidateId: string;
    name: string;
    clientName: string | null;
    projectType: string | null;
    duration: string | null;
    durationStart: Date | null;
    durationEnd: Date | null;
    role: string | null;
    candidate: { candidateName: string };
  }
): ProjectPeerRow {
  return {
    projectId: p.id,
    candidateId: p.candidateId,
    candidateName: p.candidate.candidateName,
    projectName: p.name,
    clientName: p.clientName,
    projectType: p.projectType,
    duration: p.duration,
    role: p.role,
    range: resolveRange(p.durationStart, p.durationEnd, p.duration),
  };
}

function timelinesOverlap(a: ProjectPeerRow, b: ProjectPeerRow): boolean {
  if (!a.range || !b.range) return false;
  return rangesOverlap(expandRange(a.range, BUFFER_MONTHS), expandRange(b.range, BUFFER_MONTHS));
}

function buildPairs(projects: ProjectPeerRow[]): ProjectPeerMatch['pairs'] {
  const pairs: ProjectPeerMatch['pairs'] = [];
  for (let i = 0; i < projects.length; i += 1) {
    for (let j = i + 1; j < projects.length; j += 1) {
      const a = projects[i];
      const b = projects[j];
      if (a.candidateId === b.candidateId) continue;
      if (!timelinesOverlap(a, b)) continue;
      pairs.push({
        projectA: a,
        projectB: b,
        overlapNote: `Overlapping engagement (±${BUFFER_MONTHS} month buffer)`,
      });
    }
  }
  return pairs;
}

export async function findAllProjectPeerMatches(): Promise<ProjectPeerMatch[]> {
  const rows = await prisma.project.findMany({
    include: { candidate: { select: { candidateName: true } } },
    orderBy: [{ clientName: 'asc' }, { projectType: 'asc' }],
  });

  const enriched = rows
    .map(rowFromDb)
    .filter((r) => normalizeKey(r.clientName) && normalizeKey(r.projectType));

  const matches: ProjectPeerMatch[] = [];

  for (let i = 0; i < enriched.length; i += 1) {
    for (let j = i + 1; j < enriched.length; j += 1) {
      const a = enriched[i];
      const b = enriched[j];
      if (a.candidateId === b.candidateId) continue;

      const clientA = normalizeKey(a.clientName);
      const clientB = normalizeKey(b.clientName);
      const typeA = normalizeKey(a.projectType);
      const typeB = normalizeKey(b.projectType);

      if (!keysMatch(clientA, clientB)) continue;
      if (!keysMatch(typeA, typeB)) continue;
      if (!timelinesOverlap(a, b)) continue;

      let group = matches.find((m) =>
        (keysMatch(m.clientKey, clientA) || keysMatch(m.clientKey, clientB)) &&
        (keysMatch(m.projectTypeKey, typeA) || keysMatch(m.projectTypeKey, typeB))
      );

      if (!group) {
        group = {
          clientKey: clientA,
          projectTypeKey: typeA,
          clientDisplay: a.clientName ?? clientA,
          projectTypeDisplay: a.projectType ?? typeA,
          projects: [],
          pairs: [],
        };
        matches.push(group);
      }

      if (!group.projects.some((p) => p.projectId === a.projectId)) {
        group.projects.push(a);
      }
      if (!group.projects.some((p) => p.projectId === b.projectId)) {
        group.projects.push(b);
      }

      group.pairs.push({
        projectA: a,
        projectB: b,
        overlapNote: `Overlapping engagement (±${BUFFER_MONTHS} month buffer)`,
      });
    }
  }

  matches.sort((a, b) => b.pairs.length - a.pairs.length);
  return matches;
}

export interface CandidateProjectPeer {
  projectId: string;
  projectName: string;
  clientName: string | null;
  projectType: string | null;
  peers: Array<{
    candidateId: string;
    candidateName: string;
    projectId: string;
    projectName: string;
    role: string | null;
    duration: string | null;
    overlapNote: string;
  }>;
}

export async function findPeerMatchesForCandidate(candidateId: string): Promise<CandidateProjectPeer[]> {
  const all = await findAllProjectPeerMatches();
  const result: CandidateProjectPeer[] = [];

  for (const group of all) {
    for (const pair of group.pairs) {
      const mine =
        pair.projectA.candidateId === candidateId
          ? pair.projectA
          : pair.projectB.candidateId === candidateId
            ? pair.projectB
            : null;
      const other =
        pair.projectA.candidateId === candidateId
          ? pair.projectB
          : pair.projectB.candidateId === candidateId
            ? pair.projectA
            : null;
      if (!mine || !other) continue;

      let entry = result.find((r) => r.projectId === mine.projectId);
      if (!entry) {
        entry = {
          projectId: mine.projectId,
          projectName: mine.projectName,
          clientName: mine.clientName,
          projectType: mine.projectType,
          peers: [],
        };
        result.push(entry);
      }

      if (!entry.peers.some((p) => p.candidateId === other.candidateId && p.projectId === other.projectId)) {
        entry.peers.push({
          candidateId: other.candidateId,
          candidateName: other.candidateName,
          projectId: other.projectId,
          projectName: other.projectName,
          role: other.role,
          duration: other.duration,
          overlapNote: pair.overlapNote,
        });
      }
    }
  }

  return result;
}

export function projectDatesFromDuration(duration: string | null | undefined): {
  durationStart: Date | null;
  durationEnd: Date | null;
} {
  const range = parseDurationText(duration);
  if (!range) return { durationStart: null, durationEnd: null };
  return { durationStart: range.start, durationEnd: range.end };
}
