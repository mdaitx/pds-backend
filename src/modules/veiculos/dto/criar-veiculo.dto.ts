import {
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { VehicleStatus } from '@prisma/client';

/** Placa BR: 3 letras + 4 dígitos (Mercosul) ou 3 letras + 4 números (antigo). */
const PLACA_BR = /^[A-Za-z]{3}-?\d{4}$|^[A-Za-z]{3}-?[A-Za-z]\d{2}[A-Za-z0-9]$/;

export class CriarVeiculoDto {
  @IsString()
  @MinLength(7, { message: 'Placa inválida' })
  @MaxLength(10)
  @Matches(PLACA_BR, { message: 'Placa deve ser no formato brasileiro (ABC-1234 ou ABC1D23)' })
  plate: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  model: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  brand: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  nickname?: string;

  @IsEnum(VehicleStatus, { message: 'Status deve ser ACTIVE, INACTIVE ou MAINTENANCE' })
  @IsOptional()
  status?: VehicleStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  photoUrl?: string;
}
