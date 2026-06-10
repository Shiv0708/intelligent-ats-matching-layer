import { NextResponse } from 'next/server';
import { deleteApplication, moveApplicationStage } from '@/lib/application-repository';
import { logAudit } from '@/lib/audit-log';
import { isValidStage } from '@/lib/pipeline-stages';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const stage = String(body.stage || '');

    if (!isValidStage(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const application = await moveApplicationStage(params.id, stage, body.notes);

    await logAudit('pipeline_move', 'application', params.id, {
      stage,
      candidateId: application.candidateId,
    });

    return NextResponse.json({
      application,
      workflowNote: 'Automation emails run on stage change (see Automations → Message log).',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to move application';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteApplication(params.id);
    await logAudit('pipeline_remove', 'application', params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete application';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
