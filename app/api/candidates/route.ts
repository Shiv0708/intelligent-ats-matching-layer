import { NextResponse } from 'next/server';
import { candidatesToCsv } from '@/lib/csv-export';
import { listCandidates } from '@/lib/candidate-repository';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? undefined;
    const skill = searchParams.get('skill') ?? undefined;
    const booleanQuery = searchParams.get('boolean') ?? searchParams.get('advanced') ?? undefined;
    const candidates = await listCandidates({ query, skill, booleanQuery });

    if (searchParams.get('export') === 'csv') {
      const csv = candidatesToCsv(candidates);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="candidates-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load candidates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
