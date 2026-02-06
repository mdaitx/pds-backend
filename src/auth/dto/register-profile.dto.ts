import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterProfileDto {
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
