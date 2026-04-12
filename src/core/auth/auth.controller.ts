import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService, AuthUser } from './auth.service';
import { RegisterProfileDto } from './dto/register-profile.dto';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * Rotas de autenticação e perfil.
 *
 * - /auth/me: usuário atual (requer JWT).
 * - /auth/register-profile: define role após primeiro login (requer JWT).
 * - /auth/recover-password: envia e-mail de recuperação (público).
 * - /auth/admin-only: exemplo de rota restrita por role.
 */
@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Retorna o usuário atual; valida JWT e cria registro em users se for primeiro acesso. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async me(@CurrentUser() user: AuthUser): Promise<AuthUser> {
    return user;
  }

  /** Registra/atualiza o perfil (role) após o primeiro login (Dono ou Motorista). */
  @Post('register-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async registerProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterProfileDto,
  ): Promise<AuthUser> {
    const role = dto.role ?? user.role;
    return this.authService.registerProfile(user.supabaseUserId, role);
  }

  /** Envia e-mail de recuperação de senha; não requer autenticação. */
  @Post('recover-password')
  @ApiOperation({ summary: 'Recuperação de senha (público, sem Bearer)' })
  async recoverPassword(@Body() dto: RecoverPasswordDto): Promise<{ message: string }> {
    return this.authService.recoverPassword(dto.email);
  }

  /** Exemplo de rota protegida por role: só OWNER ou ADMIN. */
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth('access-token')
  adminOnly(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
