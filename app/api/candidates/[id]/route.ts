import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit-log';
import {
  deleteCandidate,
  getCandidateById,
  updateCandidate,
} from '@/lib/candidate-repository';
import { candidatesToCsv } from '@/lib/csv-export';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('format') === 'csv') {
      const candidate = await getCandidateById(params.id);
      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
      const csv = candidatesToCsv([candidate]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${candidate.candidateName.replace(/\s+/g, '-')}.csv"`,
        },
      });
    }

    const candidate = await getCandidateById(params.id);
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }
    return NextResponse.json({ candidate });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load candidate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const candidate = await updateCandidate(params.id, {
      candidateName: body.candidateName,
      email: body.email,
      phone: body.phone,
      skills: body.skills,
      totalExperience: body.totalExperience,
    });

    await logAudit('update', 'candidate', params.id, { fields: Object.keys(body) });
    return NextResponse.json({ candidate });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update candidate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await getCandidateById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    await deleteCandidate(params.id);
    await logAudit('delete', 'candidate', params.id, { candidateName: existing.candidateName });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete candidate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
