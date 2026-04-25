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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ViagensService } from '../application/viagens.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { parsePaginationQuery } from '../../../common/pagination';
import type { AuthUser } from '../../../shared/domain/auth-user.interface';
import { CriarViagemDto } from './dto/criar-viagem.dto';
import { AtualizarViagemDto } from './dto/atualizar-viagem.dto';

@ApiTags('Viagens')
@ApiBearerAuth('access-token')
@Controller('trips')
@UseGuards(JwtAuthGuard)
export class ViagensController {
  constructor(private readonly viagensService: ViagensService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.DRIVER)
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query() query?: Record<string, unknown>,
  ) {
    return this.viagensService.findAll(user, status, parsePaginationQuery(query ?? {}));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.DRIVER)
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.viagensService.findOne(user, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CriarViagemDto) {
    return this.viagensService.create(user, {
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      clientName: dto.clientName,
      origin: dto.origin,
      destination: dto.destination,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      freightValue: dto.freightValue,
      initialKm: dto.initialKm,
      loadType: dto.loadType,
      notes: dto.notes,
      status: dto.status,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AtualizarViagemDto,
  ) {
    return this.viagensService.update(user, id, {
      vehicleId: dto.vehicleId,
      driverId: dto.driverId,
      clientName: dto.clientName,
      origin: dto.origin,
      destination: dto.destination,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
      freightValue: dto.freightValue,
      initialKm: dto.initialKm,
      loadType: dto.loadType,
      notes: dto.notes,
      status: dto.status,
    });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.viagensService.remove(user, id);
  }
}
