import { NextResponse } from 'next/server';
import { getJobDescription, getRankingsForJob, matchAllCandidatesToJob } from '@/lib/job-repository';
import { logAudit } from '@/lib/audit-log';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const job = await getJobDescription(params.id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const rankings = await getRankingsForJob(params.id);
    return NextResponse.json({ job, rankings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const rankings = await matchAllCandidatesToJob(params.id);
    await logAudit('match', 'job', params.id, { candidateCount: rankings.length });
    return NextResponse.json({ rankings });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run matching';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
