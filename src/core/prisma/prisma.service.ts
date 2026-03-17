import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Serviço Prisma: conexão única com o PostgreSQL (Supabase).
 *
 * - onModuleInit: abre a conexão quando o Nest sobe (evita conexões por request).
 * - onModuleDestroy: fecha a conexão no shutdown (evita conexões órfãs).
 *
 * Use este serviço em qualquer módulo que precise acessar o banco; não crie
 * novas instâncias de PrismaClient.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
