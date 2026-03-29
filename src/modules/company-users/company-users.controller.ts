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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { AuthUser } from '../../shared/domain/auth-user.interface';
import { CompanyUsersService } from './company-users.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';

@Controller('company-users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyUsersController {
  constructor(private readonly companyUsersService: CompanyUsersService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  list(@CurrentUser() user: AuthUser) {
    return this.companyUsersService.listStaff(user);
  }

  @Post()
  @Roles(Role.OWNER)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCompanyUserDto) {
    return this.companyUsersService.createStaffUser(user, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyUserDto,
  ) {
    return this.companyUsersService.updateStaffMember(user, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companyUsersService.removeStaffMember(user, id);
  }

  @Post(':id/resend-invite')
  @Roles(Role.OWNER)
  resendInvite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.companyUsersService.resendInvite(user, id);
  }
}
