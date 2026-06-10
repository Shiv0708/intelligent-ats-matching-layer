import { Resend } from 'resend';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  providerId?: string;
  dryRun: boolean;
  error?: string;
}

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM?.trim();
  const resend = getResend();

  if (!resend || !from) {
    console.info('[email:dry-run]', {
      to: input.to,
      subject: input.subject,
      reason: !resend ? 'RESEND_API_KEY missing' : 'EMAIL_FROM missing',
    });
    return { ok: true, dryRun: true };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    });

    if (result.error) {
      return { ok: false, dryRun: false, error: result.error.message };
    }

    return { ok: true, dryRun: false, providerId: result.data?.id };
  } catch (e) {
    return {
      ok: false,
      dryRun: false,
      error: e instanceof Error ? e.message : 'Failed to send email',
    };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
