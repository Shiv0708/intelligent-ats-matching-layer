import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit-log';
import { reviewProject } from '@/lib/candidate-repository';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const status = body.status as 'approved' | 'rejected' | 'pending';
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const project = await reviewProject(params.id, status, body.note);
    await logAudit('review', 'project', params.id, { status, note: body.note });

    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to review project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
