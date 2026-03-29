import { Module } from '@nestjs/common';
import { AdiantamentosController } from './adiantamentos.controller';
import { AdiantamentosService } from './adiantamentos.service';
import { AuthModule } from '../../core/auth/auth.module';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SupabaseModule } from '../../core/supabase/supabase.module';

@Module({
  imports: [AuthModule, PrismaModule, SupabaseModule],
  controllers: [AdiantamentosController],
  providers: [AdiantamentosService],
  exports: [AdiantamentosService],
})
export class AdiantamentosModule {}
