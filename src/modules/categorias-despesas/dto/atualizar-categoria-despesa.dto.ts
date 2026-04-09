import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

/** Corpo da requisição PATCH /expense-categories/:id - atualização parcial; todos opcionais. */
export class AtualizarCategoriaDespesaDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ example: '#3366CC', description: 'Cor em formato #RRGGBB' })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor deve ser no formato #RRGGBB' })
  color?: string;
}
