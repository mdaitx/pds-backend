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
      if (/onboarding@resend\.dev|@resend\.dev/i.test(from)) {
        this.logger.warn(
          'RESEND_FROM usa o domínio de testes da Resend: só é possível entregar para o e-mail da sua conta Resend até verificar um domínio próprio (https://resend.com/domains).',
        );
      }
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
        this.logResendFailure(res.status, body);
        return;
      }
    } catch (e) {
      this.logger.error(
        `Falha ao enviar e-mail: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  /**
   * Explica 403 de domínio / modo teste da Resend sem poluir o log com JSON bruto.
   */
  private logResendFailure(status: number, body: string): void {
    let message = '';
    try {
      const j = JSON.parse(body) as { message?: string; name?: string };
      message = typeof j.message === 'string' ? j.message : '';
    } catch {
      message = body;
    }

    const isDomainOrTestingLimit =
      status === 403 &&
      /verify a domain|testing emails|only send|your own email/i.test(message);

    if (isDomainOrTestingLimit) {
      this.logger.error(
        [
          `Resend HTTP ${status} (limite de envio): ${message}`,
          'Solução: verifique um domínio em https://resend.com/domains e defina RESEND_FROM com um endereço desse domínio (ex.: "App <noreply@seudominio.com>"). Enquanto isso, em conta de testes só chega e-mail ao endereço da conta Resend.',
        ].join(' '),
      );
      return;
    }

    this.logger.error(`Resend HTTP ${status}: ${body}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
