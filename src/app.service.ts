import { Injectable } from '@nestjs/common';

/**
 * Serviço raiz: lógica simples de health check.
 * Retorna status e timestamp para monitoramento externo.
 */
@Injectable()
export class AppService {
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
