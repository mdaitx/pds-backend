import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './core/prisma/prisma.service';

/**
 * Serviço raiz: lógica simples de health check.
 * Retorna status e timestamp para monitoramento externo.
 */
@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{ status: string; checks: { database: string }; timestamp: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        checks: { database: 'ok' },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks: { database: 'unavailable' },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
