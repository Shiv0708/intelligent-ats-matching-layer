import { NextResponse } from 'next/server';
import { findAllProjectPeerMatches } from '@/lib/project-peer-matching';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const matches = await findAllProjectPeerMatches();
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load project matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
