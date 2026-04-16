import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

/** Papéis permitidos no primeiro cadastro (nunca ADMIN — vem só de convite pela empresa). */
const REGISTER_PROFILE_ROLES = [Role.OWNER, Role.DRIVER] as const;

/** Corpo da requisição POST /auth/register-profile: define a role do usuário (Dono ou Motorista). */
export class RegisterProfileDto {
  @ApiPropertyOptional({
    enum: REGISTER_PROFILE_ROLES,
    description: 'Dono ou Motorista (omitir para manter o atual)',
  })
  @IsIn(REGISTER_PROFILE_ROLES)
  @IsOptional()
  role?: Role;
}
