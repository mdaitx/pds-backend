import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AcertosService } from './acertos.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../shared/domain/auth-user.interface';
import { FinalizarViagemDto } from './dto/finalizar-viagem.dto';

@ApiTags('Acertos')
@ApiBearerAuth('access-token')
@Controller('settlements')
@UseGuards(JwtAuthGuard)
export class AcertosController {
  constructor(private readonly acertosService: AcertosService) {}

  @Post('finalize/:tripId')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async finalize(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
    @Body() dto: FinalizarViagemDto,
  ) {
    return this.acertosService.finalize(user, tripId, dto.finalKm);
  }

  @Get('trip/:tripId')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.DRIVER)
  async findByTrip(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
  ) {
    return this.acertosService.findByTrip(user, tripId);
  }

  @Post('pay/:tripId')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async markAsPaid(
    @CurrentUser() user: AuthUser,
    @Param('tripId') tripId: string,
  ) {
    return this.acertosService.markAsPaid(user, tripId);
  }
}