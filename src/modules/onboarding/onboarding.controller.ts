import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OnboardingService, OnboardingStatus } from './onboarding.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../core/auth/auth.service';
import { Role } from '@prisma/client';
import {
  CreateOnboardingCompanyDto,
  CreateOnboardingFirstVehicleDto,
  CreateOnboardingFirstDriverDto,
} from './dto/onboarding.dto';

/**
 * Rotas do wizard de onboarding: status e criação de empresa, 1º veículo e 1º motorista.
 * GET /onboarding/status disponível para qualquer autenticado; posts exigem OWNER.
 */
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /** GET /onboarding/status - passo atual do wizard; motoristas recebem completed=true. */
  @Get('status')
  async getStatus(@CurrentUser() user: AuthUser): Promise<OnboardingStatus> {
    return this.onboardingService.getStatus(user);
  }

  @Post('company')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async createCompany(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOnboardingCompanyDto,
  ) {
    return this.onboardingService.createCompany(user, dto);
  }

  @Post('first-vehicle')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async createFirstVehicle(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOnboardingFirstVehicleDto,
  ) {
    return this.onboardingService.createFirstVehicle(user, dto);
  }

  @Post('first-driver')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER)
  async createFirstDriver(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOnboardingFirstDriverDto,
  ) {
    return this.onboardingService.createFirstDriver(user, dto);
  }
}
