import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import type { AuthUser } from '../../shared/domain/auth-user.interface';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trips')
  trips(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.trips(user, { from, to });
  }
}
