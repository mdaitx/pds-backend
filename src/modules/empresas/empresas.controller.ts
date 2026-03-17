import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../core/auth/auth.service';
import { Role } from '@prisma/client';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';

/**
 * Rotas de empresa do dono: GET/PUT /companies/me.
 * Todas as rotas exigem JWT e role OWNER (RolesGuard).
 * Rota mantida em inglês (/companies) para compatibilidade com o frontend.
 */
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async getMyCompany(@CurrentUser() user: AuthUser) {
    return this.empresasService.findMyCompany(user);
  }

  @Put('me')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async updateMyCompany(
    @CurrentUser() user: AuthUser,
    @Body() dto: AtualizarEmpresaDto,
  ) {
    return this.empresasService.updateMyCompany(user, dto);
  }
}
