import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Envio opcional via SMTP (nodemailer).
 * Sem SMTP_HOST configurado, os envios são ignorados (log em debug) — não quebra fluxos da API.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  onModuleInit() {
    const host = process.env.SMTP_HOST?.trim();
    if (!host) {
      this.logger.warn(
        'SMTP_HOST não definido: e-mails transacionais (task 12) estão desligados. Configure SMTP_* no ambiente.',
      );
      return;
    }
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    this.logger.log(`SMTP configurado (${host}:${port}).`);
  }

  isEnabled(): boolean {
    return this.transporter != null;
  }

  async sendMail(params: {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`[e-mail omitido] ${params.subject} → ${JSON.stringify(params.to)}`);
      return;
    }
    const from =
      process.env.SMTP_FROM?.trim() ||
      process.env.SMTP_USER?.trim() ||
      'noreply@localhost';
    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html ?? `<pre style="font-family:sans-serif">${params.text}</pre>`,
      });
    } catch (e) {
      this.logger.error(
        `Falha ao enviar e-mail: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
