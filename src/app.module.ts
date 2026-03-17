/**
 * Módulo raiz da aplicação NestJS.
 *
 * Estrutura: common, core (prisma, supabase, auth), modules (domínio).
 */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/prisma/prisma.module';
import { SupabaseModule } from './core/supabase/supabase.module';
import { AuthModule } from './core/auth/auth.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { EmpresasModule } from './modules/empresas/empresas.module';
import { CategoriasDespesasModule } from './modules/categorias-despesas/categorias-despesas.module';
import { VeiculosModule } from './modules/veiculos/veiculos.module';
import { MotoristasModule } from './modules/motoristas/motoristas.module';
import { ViagensModule } from './modules/viagens/viagens.module';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    AuthModule,
    OnboardingModule,
    EmpresasModule,
    CategoriasDespesasModule,
    VeiculosModule,
    MotoristasModule,
    ViagensModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
