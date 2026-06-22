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

    const [parsed, classification] = await Promise.all([
      parseResumeWithLlm(rawText),
      classifyResumeWithLlm(rawText)
        .catch((err) => {
          console.error('[classifier] failed:', err);
          return null;
        })
    ]);

    const credibility = analyzeCredibility(parsed);

    // Explicitly flag if Technical/Hybrid classification is due to tools/system skills (ERP, CRM, Excel, etc.)
    const hasNonCodingSkills = parsed.skills.some((s) =>
      /\b(erp|crm|excel|sap|salesforce|hubspot|tableau|power.?bi|dynamics.?365|oracle.?erp|zoho|pipedrive|spreadsheets?|microsoft.?office)\b/i.test(s)
    );
    const isTechOrHybrid =
      classification &&
      ((classification.classification === 'Technical') || (classification.classification === 'Hybrid'));
    const reasonContainsFlag =
      classification &&
      ((classification.reason.includes('FLAG')) ||
        (classification.reason.includes('ERP')) ||
        (classification.reason.includes('CRM')) ||
        (classification.reason.includes('Excel')) ||
        (classification.reason.toLowerCase().includes('sap')) ||
        (classification.reason.toLowerCase().includes('salesforce')) ||
        (classification.reason.toLowerCase().includes('hubspot')));

    if (isTechOrHybrid && (hasNonCodingSkills || reasonContainsFlag)) {
      const flagText = 'Technical/Hybrid classification is due to ERP/CRM/Excel-related skills (not a core software developer/engineer)';
      if (!credibility.flags.includes(flagText)) {
        credibility.flags.push(flagText);
      }
    }

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
