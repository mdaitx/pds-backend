import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommissionCalculationMethod } from '@prisma/client';

/**
 * DTO para atualização parcial da empresa (PUT /companies/me).
 * Todos os campos são opcionais; apenas os enviados são atualizados.
 * Validações limitam tamanho e tipo para evitar dados inválidos ou ataques.
 */
export class AtualizarEmpresaDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 200 })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Comissão padrão (%)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  defaultCommission?: number;

  @ApiPropertyOptional({ maxLength: 64, example: 'America/Sao_Paulo' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ enum: CommissionCalculationMethod })
  @IsEnum(CommissionCalculationMethod)
  @IsOptional()
  commissionMethod?: CommissionCalculationMethod;
}
