import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit-log';
import { createJobDescription, listJobDescriptions } from '@/lib/job-repository';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const jobs = await listJobDescriptions();
    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load jobs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const requiredSkills = Array.isArray(body.requiredSkills)
      ? body.requiredSkills.map(String)
      : String(body.requiredSkills || '')
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    const job = await createJobDescription(title, content, requiredSkills);
    await logAudit('create', 'job', job.id, { title });

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        content: job.content,
        requiredSkills,
        createdAt: job.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create job';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
