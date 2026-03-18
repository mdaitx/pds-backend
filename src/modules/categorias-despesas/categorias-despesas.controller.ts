import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoriasDespesasService } from './categorias-despesas.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../core/auth/auth.service';
import { Role } from '@prisma/client';
import { CriarCategoriaDespesaDto } from './dto/criar-categoria-despesa.dto';
import { AtualizarCategoriaDespesaDto } from './dto/atualizar-categoria-despesa.dto';

/**
 * CRUD de categorias de despesas: listar (sistema + custom), criar, atualizar e excluir customizadas.
 * Rotas mantidas em inglês (/expense-categories) para compatibilidade com o frontend.
 */
@Controller('expense-categories')
@UseGuards(JwtAuthGuard)
export class CategoriasDespesasController {
  constructor(private readonly categoriasDespesasService: CategoriasDespesasService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async findAll(@CurrentUser() user: AuthUser) {
    return this.categoriasDespesasService.findAll(user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CriarCategoriaDespesaDto,
  ) {
    return this.categoriasDespesasService.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarCategoriaDespesaDto,
  ) {
    return this.categoriasDespesasService.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.categoriasDespesasService.remove(user, id);
  }
}
