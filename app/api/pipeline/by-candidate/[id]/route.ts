import { NextResponse } from 'next/server';
import { ensureApplicationForCandidate } from '@/lib/application-repository';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const application = await ensureApplicationForCandidate(params.id);
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load pipeline application';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
