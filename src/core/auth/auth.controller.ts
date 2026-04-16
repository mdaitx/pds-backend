import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService, AuthUser } from './auth.service';
import { RegisterProfileDto } from './dto/register-profile.dto';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UPLOAD_MAX_FILE_BYTES } from '../../common/constants/upload-limits';

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

  /** Atualiza dados do próprio usuário (ex.: remover foto com `{ "photoUrl": null }`). */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar perfil (próprio usuário)' })
  async patchMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto): Promise<AuthUser> {
    return this.authService.updateMyProfile(user, dto);
  }

  /** Upload de foto de perfil (JPEG/PNG/WebP); atualiza `photo_url` no banco. */
  @Post('upload-photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_MAX_FILE_BYTES } }))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload foto de perfil' })
  async uploadProfilePhoto(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<AuthUser> {
    if (!file?.buffer) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    return this.authService.uploadProfilePhoto(user, file);
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
