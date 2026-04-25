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
import { DespesasModule } from './modules/despesas/despesas.module';
import { AdiantamentosModule } from './modules/adiantamentos/adiantamentos.module';
import { AcertosModule } from './modules/acertos/acertos.module';
import { CompanyAccessModule } from './core/company-access/company-access.module';
import { CompanyUsersModule } from './modules/company-users/company-users.module';
import { MailModule } from './core/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    NotificationsModule,
    SubscriptionModule,
    SupabaseModule,
    CompanyAccessModule,
    AuthModule,
    OnboardingModule,
    EmpresasModule,
    CategoriasDespesasModule,
    VeiculosModule,
    MotoristasModule,
    ViagensModule,
    DespesasModule,
    AdiantamentosModule,
    AcertosModule,
    CompanyUsersModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

