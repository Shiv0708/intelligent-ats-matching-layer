import type { PrismaClient } from '@prisma/client';

const wrap = (body: string) =>
  `<div style="font-family:sans-serif;line-height:1.6;color:#0f172a"><p>${body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p><p style="color:#64748b;font-size:14px">— {{companyName}}</p></div>`;

export const DEFAULT_TEMPLATES = [
  {
    key: 'pipeline_stage_update',
    name: 'Pipeline stage update (all moves)',
    subject: 'Application update: {{stageLabel}} — {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nYour application for {{jobTitle}} has been updated.\n\n<strong>Current status:</strong> {{stageLabel}}\n\nOur recruiting team will reach out if any action is needed from you. You can reply to this email with questions.\n\nThank you for your interest in joining {{companyName}}.'
    ),
    bodyText:
      'Hi {{candidateName}},\n\nYour application for {{jobTitle}} is now at stage: {{stageLabel}}.\n\n— {{companyName}}',
  },
  {
    key: 'applied_confirmation',
    name: 'Application received',
    subject: 'We received your application — {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nThank you for applying for {{jobTitle}}. Our recruiting team has received your profile and will review it shortly.\n\nWe will contact you if your background is a strong match for the next steps.'
    ),
    bodyText:
      'Hi {{candidateName}},\n\nThank you for applying for {{jobTitle}}. We have received your application and will be in touch if you are selected to move forward.\n\n— {{companyName}}',
  },
  {
    key: 'screening_followup',
    name: 'Screening follow-up',
    subject: 'Update on your application — {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nWe are still reviewing applications for {{jobTitle}}. If you have any updates to share (availability, portfolio, etc.), reply to this email.\n\nThank you for your patience.'
    ),
    bodyText:
      'Hi {{candidateName}},\n\nWe are still reviewing your application for {{jobTitle}}. Reply if you have any updates.\n\n— {{companyName}}',
  },
  {
    key: 'phone_screen_invite',
    name: 'Phone screen invitation',
    subject: 'Next step: phone screen — {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nWe would like to schedule a phone screen for {{jobTitle}}.\n\nPlease pick a time that works for you: {{schedulingLink}}\n\nWe look forward to speaking with you.'
    ),
    bodyText:
      'Hi {{candidateName}},\n\nPlease schedule your phone screen here: {{schedulingLink}}\n\n— {{companyName}}',
  },
  {
    key: 'technical_next_steps',
    name: 'Technical interview',
    subject: 'Technical interview — {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nCongratulations on moving to the technical stage for {{jobTitle}}.\n\nOur team will share assessment or interview details shortly. If you have scheduling constraints, reply to this email.'
    ),
    bodyText: 'Hi {{candidateName}},\n\nYou have advanced to the technical stage for {{jobTitle}}.\n\n— {{companyName}}',
  },
  {
    key: 'offer_extended',
    name: 'Offer extended',
    subject: 'Offer for {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nWe are pleased to move forward with an offer for {{jobTitle}}. A member of our team will contact you with the formal details.\n\nCongratulations!'
    ),
    bodyText: 'Hi {{candidateName}},\n\nWe are pleased to extend an offer for {{jobTitle}}.\n\n— {{companyName}}',
  },
  {
    key: 'rejection_notice',
    name: 'Application update',
    subject: 'Update on your application — {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nThank you for your interest in {{jobTitle}} and for the time you invested in our process.\n\nAfter careful consideration, we will not be moving forward at this time. We encourage you to apply for future openings that match your experience.'
    ),
    bodyText:
      'Hi {{candidateName}},\n\nThank you for applying for {{jobTitle}}. We will not be moving forward at this time.\n\n— {{companyName}}',
  },
  {
    key: 'interview_reminder',
    name: 'Interview reminder',
    subject: 'Reminder: upcoming step for {{jobTitle}}',
    bodyHtml: wrap(
      'Hi {{candidateName}},\n\nThis is a friendly reminder about your upcoming step in our process for {{jobTitle}} (current stage: {{stageLabel}}).\n\nIf you need to reschedule, use: {{schedulingLink}}'
    ),
    bodyText:
      'Hi {{candidateName}},\n\nReminder for {{jobTitle}} ({{stageLabel}}). Reschedule: {{schedulingLink}}\n\n— {{companyName}}',
  },
] as const;

export const DEFAULT_RULES: Array<{
  name: string;
  triggerType: 'stage_enter' | 'stage_idle';
  triggerStage: string;
  delayHours?: number;
  templateKey: string;
}> = [
  // Stage-enter emails are sent via pipeline_stage_update on every move (see workflow-engine.ts)
  {
    name: 'Screening idle follow-up (3 days)',
    triggerType: 'stage_idle',
    triggerStage: 'screening',
    delayHours: 72,
    templateKey: 'screening_followup',
  },
  { name: 'Phone screen scheduling invite', triggerType: 'stage_enter', triggerStage: 'phone_screen', templateKey: 'phone_screen_invite' },
  {
    name: 'Phone screen reminder (24h)',
    triggerType: 'stage_idle',
    triggerStage: 'phone_screen',
    delayHours: 24,
    templateKey: 'interview_reminder',
  },
  { name: 'Technical stage notification', triggerType: 'stage_enter', triggerStage: 'technical', templateKey: 'technical_next_steps' },
  { name: 'Offer notification', triggerType: 'stage_enter', triggerStage: 'offer', templateKey: 'offer_extended' },
  { name: 'Rejection notice', triggerType: 'stage_enter', triggerStage: 'rejected', templateKey: 'rejection_notice' },
];

export async function seedWorkflowDefaults(prisma: PrismaClient) {
  const templateIds = new Map<string, string>();

  for (const t of DEFAULT_TEMPLATES) {
    const row = await prisma.emailTemplate.upsert({
      where: { key: t.key },
      update: {
        name: t.name,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        bodyText: t.bodyText,
      },
      create: {
        key: t.key,
        name: t.name,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        bodyText: t.bodyText,
      },
    });
    templateIds.set(t.key, row.id);
  }

  for (const r of DEFAULT_RULES) {
    const templateId = templateIds.get(r.templateKey);
    if (!templateId) continue;

    const existing = await prisma.workflowRule.findFirst({
      where: { name: r.name },
    });

    if (existing) {
      await prisma.workflowRule.update({
        where: { id: existing.id },
        data: {
          triggerType: r.triggerType,
          triggerStage: r.triggerStage,
          delayHours: r.delayHours ?? null,
          templateId,
        },
      });
    } else {
      await prisma.workflowRule.create({
        data: {
          name: r.name,
          enabled: true,
          triggerType: r.triggerType,
          triggerStage: r.triggerStage,
          delayHours: r.delayHours ?? null,
          templateId,
        },
      });
    }
  }
}
