import { NextResponse } from 'next/server';
import { listMessageLogs } from '@/lib/workflow-engine';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200);
    const messages = await listMessageLogs(limit);
    return NextResponse.json({ messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
