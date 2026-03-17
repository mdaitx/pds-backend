import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ViagensService } from './viagens.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../core/auth/auth.service';
import { Role } from '@prisma/client';
import { CriarViagemDto } from './dto/criar-viagem.dto';
import { AtualizarViagemDto } from './dto/atualizar-viagem.dto';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class ViagensController {
  constructor(private readonly viagensService: ViagensService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    return this.viagensService.findAll(user, status);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.viagensService.findOne(user, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CriarViagemDto) {
    return this.viagensService.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarViagemDto,
  ) {
    return this.viagensService.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.viagensService.remove(user, id);
  }
}
