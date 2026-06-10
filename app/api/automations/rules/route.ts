import { NextResponse } from 'next/server';
import { listWorkflowRules, setWorkflowRuleEnabled } from '@/lib/workflow-engine';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rules = await listWorkflowRules();
    return NextResponse.json({ rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load rules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || '');
    const enabled = Boolean(body.enabled);

    if (!id) {
      return NextResponse.json({ error: 'Rule id required' }, { status: 400 });
    }

    const rule = await setWorkflowRuleEnabled(id, enabled);
    return NextResponse.json({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update rule';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
