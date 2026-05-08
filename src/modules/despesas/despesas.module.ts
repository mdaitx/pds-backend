import { Module } from '@nestjs/common';
import { DespesasController } from './despesas.controller';
import { DespesasService } from './despesas.service';
import { AuthModule } from '../../core/auth/auth.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [AuthModule, PrismaModule, SupabaseModule, DashboardModule],
  controllers: [DespesasController],
  providers: [DespesasService],
  exports: [DespesasService],
})
export class DespesasModule {}
