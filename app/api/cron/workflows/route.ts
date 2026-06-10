import { NextResponse } from 'next/server';
import { processDueScheduledTasks } from '@/lib/workflow-engine';

export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(request.url);
  return url.searchParams.get('secret') === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processDueScheduledTasks();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
