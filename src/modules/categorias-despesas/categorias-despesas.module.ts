/**
 * Módulo de categorias de despesas: listar (sistema + custom), criar, atualizar e excluir customizadas.
 * Rotas exigem JWT e role OWNER.
 */
import { Module } from '@nestjs/common';
import { CategoriasDespesasController } from './categorias-despesas.controller';
import { CategoriasDespesasService } from './categorias-despesas.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CategoriasDespesasController],
  providers: [CategoriasDespesasService],
  exports: [CategoriasDespesasService],
})
export class CategoriasDespesasModule {}
