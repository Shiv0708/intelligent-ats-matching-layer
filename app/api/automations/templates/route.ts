import { NextResponse } from 'next/server';
import { listEmailTemplates, updateEmailTemplate } from '@/lib/workflow-engine';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || '');

    if (!id) {
      return NextResponse.json({ error: 'Template id required' }, { status: 400 });
    }

    const template = await updateEmailTemplate(id, {
      ...(body.subject !== undefined && { subject: String(body.subject) }),
      ...(body.bodyHtml !== undefined && { bodyHtml: String(body.bodyHtml) }),
      ...(body.bodyText !== undefined && { bodyText: body.bodyText ? String(body.bodyText) : null }),
    });

    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
