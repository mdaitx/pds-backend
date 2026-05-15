import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Canal de e-mail transacional desativado.
 * Mantemos o serviço para não quebrar fluxos que chamam `sendMail`, mas sem provedor externo.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  onModuleInit() {
    this.logger.log('Canal de e-mail transacional interno desativado.');
  }

  isEnabled(): boolean {
    return false;
  }

  async sendMail(params: {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    this.logger.debug(
      `[e-mail desativado] assunto="${params.subject}" destino=${JSON.stringify(params.to)}`,
    );
  }
}
