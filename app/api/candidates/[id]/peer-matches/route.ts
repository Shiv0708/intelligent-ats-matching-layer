import { NextResponse } from 'next/server';
import { findPeerMatchesForCandidate } from '@/lib/project-peer-matching';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const peerMatches = await findPeerMatchesForCandidate(params.id);
    return NextResponse.json({ peerMatches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load peer matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
