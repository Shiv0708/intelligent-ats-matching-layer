import { NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit-log';
import { createApplication } from '@/lib/application-repository';
import { saveParsedCandidate } from '@/lib/candidate-repository';
import { analyzeCredibility } from '@/lib/credibility';
import { flattenParsedResume } from '@/lib/flatten-resume';
import { parseResumeWithLlm, classifyResumeWithLlm } from '@/lib/llm-parser';
import { extractTextFromUpload } from '@/lib/text-extraction';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rawText = '';
    let selectedJobId: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const text = formData.get('text');
      const jobId = formData.get('jobId');

      if (typeof jobId === 'string' && jobId) selectedJobId = jobId;

      if (file && file.size > 0) {
        rawText = await extractTextFromUpload(file);
      }

      if (!rawText && typeof text === 'string' && text.trim().length > 0) {
        rawText = text;
      }
    } else {
      const body = await request.json();
      rawText = String(body.text || body.resumeText || '');
      if (body.jobId) selectedJobId = String(body.jobId);
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'No resume text or file detected.' }, { status: 400 });
    }

    let classification = null;
    const [parsed] = await Promise.all([
      parseResumeWithLlm(rawText),
      classifyResumeWithLlm(rawText)
        .then((res) => { classification = res; })
        .catch((err) => { console.error('[classifier] failed:', err); })
    ]);

    const credibility = analyzeCredibility(parsed);
    const saved = await saveParsedCandidate(parsed, rawText, credibility);
    const flattened = flattenParsedResume(parsed);

    const application = await createApplication(saved.id, selectedJobId, 'applied');
    try {
      const { onApplicationStageChange } = await import('@/lib/workflow-engine');
      await onApplicationStageChange(application.id, 'applied');
    } catch (e) {
      console.error('[workflow] parse hook failed:', e);
    }

    await logAudit('parse', 'candidate', saved.id, {
      candidateName: saved.candidateName,
      credibilityScore: credibility.score,
      pipelineStage: 'applied',
    });

    return NextResponse.json({
      success: true,
      parsed,
      flattened,
      credibility,
      candidate: saved,
      classification,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parser error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
