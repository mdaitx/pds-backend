/**
 * Módulo global do Prisma: uma única instância de PrismaService em toda a aplicação.
 * Qualquer módulo pode injetar PrismaService sem importar PrismaModule.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
