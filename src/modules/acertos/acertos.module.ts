import { Module } from '@nestjs/common';
import { AcertosController } from './acertos.controller';
import { AcertosService } from './acertos.service';
import { AuthModule } from '../../core/auth/auth.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [AuthModule, PrismaModule, DashboardModule],
  controllers: [AcertosController],
  providers: [AcertosService],
  exports: [AcertosService],
})
export class AcertosModule {}