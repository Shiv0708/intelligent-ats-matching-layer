import type { CandidateRecord } from '@/lib/types/resume';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function candidatesToCsv(candidates: CandidateRecord[]): string {
  if (candidates.length === 0) return '';

  const allKeys = new Set<string>();
  candidates.forEach((c) => {
    Object.keys(c.flattened).forEach((k) => allKeys.add(k));
    allKeys.add('credibility_score');
    allKeys.add('credibility_flags');
  });

  const headers = [...allKeys].sort((a, b) => {
    if (a.startsWith('candidate') && !b.startsWith('candidate')) return -1;
    if (!a.startsWith('candidate') && b.startsWith('candidate')) return 1;
    return a.localeCompare(b);
  });

  const rows = candidates.map((c) => {
    const row: Record<string, string> = {
      ...c.flattened,
      credibility_score: String(c.credibilityScore ?? ''),
      credibility_flags: (c.credibilityFlags ?? []).join('; '),
    };
    return headers.map((h) => escapeCsv(row[h] ?? '')).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
