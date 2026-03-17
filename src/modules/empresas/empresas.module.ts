/**
 * Módulo de empresas: GET/PUT /companies/me (dados da empresa do dono).
 * Depende de Prisma e Auth (JwtAuthGuard, RolesGuard para OWNER).
 */
import { Module } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmpresasController],
  providers: [EmpresasService],
  exports: [EmpresasService],
})
export class EmpresasModule {}
