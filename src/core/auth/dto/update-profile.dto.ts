import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

/** Corpo PATCH /auth/me — atualização do próprio usuário. */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'URL pública da foto (ou null para remover)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @IsUrl({ require_protocol: true })
  photoUrl?: string | null;
}
