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

const PLACA_BR = /^[A-Za-z]{3}-?\d{4}$|^[A-Za-z]{3}-?[A-Za-z]\d{2}[A-Za-z0-9]$/;

export class AtualizarVeiculoDto {
  @IsString()
  @IsOptional()
  @MinLength(7)
  @MaxLength(10)
  @Matches(PLACA_BR, { message: 'Placa deve ser no formato brasileiro' })
  plate?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  model?: string;

  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  brand?: string;

  @IsInt()
  @IsOptional()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  nickname?: string;

  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  photoUrl?: string;
}
