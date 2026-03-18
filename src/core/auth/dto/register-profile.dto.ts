import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

/** Corpo da requisição POST /auth/register-profile: define a role do usuário (Dono ou Motorista). */
export class RegisterProfileDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
