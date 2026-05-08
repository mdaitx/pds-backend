import { Module } from '@nestjs/common';
import { ViagensController } from './presentation/viagens.controller';
import { ViagensService, VIAGEM_REPOSITORY } from './application/viagens.service';
import { ViagemPrismaRepository } from './infrastructure/persistence/viagem.prisma.repository';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../../core/auth/auth.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, AuthModule, DashboardModule],
  controllers: [ViagensController],
  providers: [
    ViagensService,
    {
      provide: VIAGEM_REPOSITORY,
      useClass: ViagemPrismaRepository,
    },
  ],
  exports: [ViagensService],
})
export class ViagensModule {}
