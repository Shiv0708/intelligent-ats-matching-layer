import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/dashboard-metrics';
import { listJobDescriptions, getRankingsForJob } from '@/lib/job-repository';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    const jobs = await listJobDescriptions();
    const metrics = await getDashboardMetrics(jobId);

    if (jobId) {
      const rankings = await getRankingsForJob(jobId);
      return NextResponse.json({ jobs, metrics, rankings });
    }

    return NextResponse.json({ jobs, metrics, rankings: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
