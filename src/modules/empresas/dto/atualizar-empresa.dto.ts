import {
  IsString,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para atualização parcial da empresa (PUT /companies/me).
 * Todos os campos são opcionais; apenas os enviados são atualizados.
 * Validações limitam tamanho e tipo para evitar dados inválidos ou ataques.
 */
export class AtualizarEmpresaDto {
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(200)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  document?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  defaultCommission?: number;
}
