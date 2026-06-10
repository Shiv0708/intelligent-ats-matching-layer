import { NextResponse } from 'next/server';
import { processDueScheduledTasks } from '@/lib/workflow-engine';

export const runtime = 'nodejs';

/** Manually process due follow-ups / reminders (same as cron). */
export async function POST() {
  try {
    const result = await processDueScheduledTasks();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run workflows';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
