import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService, AuthUser } from './auth.service';
import { RegisterProfileDto } from './dto/register-profile.dto';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Retorna o usuário atual (valida JWT e cria registro em users se não existir).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return user;
  }

  /**
   * Registra/atualiza o perfil (role) após o primeiro login.
   */
  @Post('register-profile')
  @UseGuards(JwtAuthGuard)
  async registerProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterProfileDto,
  ): Promise<AuthUser> {
    const role = dto.role ?? user.role;
    return this.authService.registerProfile(user.supabaseUserId, role);
  }

  /**
   * Envia e-mail de recuperação de senha (Supabase Auth).
   */
  @Post('recover-password')
  async recoverPassword(@Body() dto: RecoverPasswordDto): Promise<{ message: string }> {
    return this.authService.recoverPassword(dto.email);
  }

  /**
   * Rota protegida por role (exemplo: só OWNER ou ADMIN).
   */
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  adminOnly(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
