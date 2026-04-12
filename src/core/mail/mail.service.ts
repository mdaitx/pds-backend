import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * E-mails transacionais via API Resend (HTTPS). Sem RESEND_API_KEY + RESEND_FROM, apenas log em debug.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private resendApiKey: string | null = null;
  private resendFrom: string | null = null;

  onModuleInit() {
    const key = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM?.trim();
    if (key && from) {
      this.resendApiKey = key;
      this.resendFrom = from;
      this.logger.log('Envio de e-mail ativo (Resend).');
    } else {
      this.logger.log(
        'E-mails transacionais desligados (defina RESEND_API_KEY e RESEND_FROM — ver documentação).',
      );
    }
  }

  isEnabled(): boolean {
    return this.resendApiKey != null && this.resendFrom != null;
  }

  async sendMail(params: {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    if (!this.resendApiKey || !this.resendFrom) {
      this.logger.debug(`[e-mail omitido] ${params.subject} → ${JSON.stringify(params.to)}`);
      return;
    }
    const toList = Array.isArray(params.to) ? params.to : [params.to];
    const html =
      params.html ??
      `<pre style="font-family:system-ui,sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(
        params.text,
      )}</pre>`;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.resendFrom,
          to: toList,
          subject: params.subject,
          text: params.text,
          html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Resend HTTP ${res.status}: ${body}`);
        return;
      }
    } catch (e) {
      this.logger.error(
        `Falha ao enviar e-mail: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
