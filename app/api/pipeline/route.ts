import { NextResponse } from 'next/server';
import {
  backfillApplicationsForAllCandidates,
  createApplication,
  getPipelineBoard,
} from '@/lib/application-repository';
import { logAudit } from '@/lib/audit-log';
import { isValidStage } from '@/lib/pipeline-stages';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId') ?? undefined;

    const pipeline = await getPipelineBoard(jobId);
    return NextResponse.json(pipeline);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load pipeline';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const candidateId = String(body.candidateId || '');
    const jobDescriptionId = body.jobDescriptionId ? String(body.jobDescriptionId) : null;
    const stage = body.stage ?? 'applied';

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }
    if (!isValidStage(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const application = await createApplication(candidateId, jobDescriptionId, stage, body.notes);

    await logAudit('pipeline_add', 'application', application.id, {
      candidateId,
      stage,
      jobId: jobDescriptionId,
    });

    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create application';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT() {
  try {
    await backfillApplicationsForAllCandidates();
    return NextResponse.json({ success: true, message: 'All candidates synced to pipeline' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backfill failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
