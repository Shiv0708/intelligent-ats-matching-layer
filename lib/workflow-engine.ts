import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { getStageMeta, type PipelineStageId } from '@/lib/pipeline-stages';
import { renderTemplate, type TemplateContext } from '@/lib/template-render';

export type WorkflowTriggerType = 'stage_enter' | 'stage_idle';

interface ApplicationContext {
  id: string;
  candidateId: string;
  stage: string;
  notes: string | null;
  stageChangedAt: Date;
  candidate: {
    candidateName: string;
    email: string | null;
  };
  jobDescription: { title: string } | null;
}

function companyName() {
  return process.env.COMPANY_NAME?.trim() || 'Our team';
}

function schedulingLink() {
  return process.env.SCHEDULING_URL?.trim() || 'https://cal.com';
}

function buildContext(app: ApplicationContext): TemplateContext {
  const meta = getStageMeta(app.stage);
  return {
    candidateName: app.candidate.candidateName,
    candidateEmail: app.candidate.email ?? '',
    jobTitle: app.jobDescription?.title ?? 'the open role',
    stage: app.stage,
    stageLabel: meta.label,
    companyName: companyName(),
    schedulingLink: schedulingLink(),
    notes: app.notes ?? '',
  };
}

async function loadApplication(applicationId: string): Promise<ApplicationContext | null> {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: true, jobDescription: true },
  });
}

async function logMessage(params: {
  applicationId: string;
  candidateId: string;
  ruleId?: string;
  templateId?: string;
  toEmail: string;
  subject: string;
  status: string;
  error?: string;
  providerId?: string;
}) {
  await prisma.messageLog.create({
    data: {
      applicationId: params.applicationId,
      candidateId: params.candidateId,
      ruleId: params.ruleId ?? null,
      templateId: params.templateId ?? null,
      toEmail: params.toEmail,
      subject: params.subject,
      status: params.status,
      error: params.error ?? null,
      providerId: params.providerId ?? null,
    },
  });
}

type EmailTemplatePayload = {
  id: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
};

async function sendFromTemplate(
  app: ApplicationContext,
  template: EmailTemplatePayload,
  opts?: { ruleId?: string }
) {
  const to = app.candidate.email?.trim();
  if (!to) {
    await logMessage({
      applicationId: app.id,
      candidateId: app.candidateId,
      ruleId: opts?.ruleId,
      templateId: template.id,
      toEmail: '',
      subject: template.subject,
      status: 'skipped',
      error: 'Candidate has no email address',
    });
    return;
  }

  const ctx = buildContext(app);
  const subject = renderTemplate(template.subject, ctx);
  const html = renderTemplate(template.bodyHtml, ctx);
  const text = template.bodyText ? renderTemplate(template.bodyText, ctx) : undefined;

  const result = await sendEmail({ to, subject, html, text });

  await logMessage({
    applicationId: app.id,
    candidateId: app.candidateId,
    ruleId: opts?.ruleId,
    templateId: template.id,
    toEmail: to,
    subject,
    status: result.ok ? (result.dryRun ? 'dry_run' : 'sent') : 'failed',
    error: result.error,
    providerId: result.providerId,
  });
}

/** Sends the standard pipeline status email (every stage move). */
async function sendPipelineStageEmail(app: ApplicationContext) {
  const template = await prisma.emailTemplate.findUnique({
    where: { key: 'pipeline_stage_update' },
  });
  if (!template) {
    console.error('[workflow] Missing template pipeline_stage_update — run npm run db:seed');
    return;
  }
  await sendFromTemplate(app, template);
}

export async function cancelPendingTasksForApplication(applicationId: string) {
  await prisma.scheduledTask.updateMany({
    where: { applicationId, status: 'pending' },
    data: { status: 'cancelled', processedAt: new Date() },
  });
}

export async function onApplicationStageChange(
  applicationId: string,
  newStage: PipelineStageId
) {
  const app = await loadApplication(applicationId);
  if (!app) return;

  await cancelPendingTasksForApplication(applicationId);

  // Real Resend email on every pipeline move (same as sendemail.js)
  await sendPipelineStageEmail(app);

  const rules = await prisma.workflowRule.findMany({
    where: { enabled: true },
    include: { template: true },
  });

  for (const rule of rules) {
    if (
      rule.triggerType === 'stage_idle' &&
      rule.triggerStage === newStage &&
      rule.delayHours &&
      rule.delayHours > 0
    ) {
      const runAt = new Date(app.stageChangedAt.getTime() + rule.delayHours * 60 * 60 * 1000);
      await prisma.scheduledTask.create({
        data: {
          ruleId: rule.id,
          applicationId: app.id,
          candidateId: app.candidateId,
          runAt,
          status: 'pending',
        },
      });
    }
  }
}

export async function processDueScheduledTasks() {
  const now = new Date();
  const due = await prisma.scheduledTask.findMany({
    where: { status: 'pending', runAt: { lte: now } },
    include: {
      rule: { include: { template: true } },
      application: { include: { candidate: true, jobDescription: true } },
    },
    take: 50,
  });

  let processed = 0;

  for (const task of due) {
    const app = task.application;
    if (!app || app.stage !== task.rule.triggerStage) {
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { status: 'cancelled', processedAt: new Date(), error: 'Stage changed' },
      });
      continue;
    }

    try {
      await sendFromTemplate(app, task.rule.template, { ruleId: task.rule.id });
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { status: 'sent', processedAt: new Date() },
      });
      processed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Send failed';
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: { status: 'failed', processedAt: new Date(), error: message },
      });
    }
  }

  return { checked: due.length, processed };
}

export async function listMessageLogs(limit = 100) {
  return prisma.messageLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      candidate: { select: { candidateName: true } },
      template: { select: { name: true, key: true } },
      rule: { select: { name: true } },
    },
  });
}

export async function listWorkflowRules() {
  return prisma.workflowRule.findMany({
    orderBy: { name: 'asc' },
    include: { template: { select: { id: true, key: true, name: true, subject: true } } },
  });
}

export async function listEmailTemplates() {
  return prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
}

export async function setWorkflowRuleEnabled(ruleId: string, enabled: boolean) {
  return prisma.workflowRule.update({
    where: { id: ruleId },
    data: { enabled },
    include: { template: true },
  });
}

export async function updateEmailTemplate(
  id: string,
  data: { subject?: string; bodyHtml?: string; bodyText?: string | null }
) {
  return prisma.emailTemplate.update({ where: { id }, data });
}
