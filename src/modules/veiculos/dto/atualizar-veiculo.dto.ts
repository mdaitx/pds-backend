import { ApiPropertyOptional } from '@nestjs/swagger';
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
  Allow,
} from 'class-validator';
import { VehicleStatus, VehicleType } from '@prisma/client';

const PLACA_BR =
  /^[A-Za-z]{3}-?\d{4}$|^[A-Za-z]{3}-?\d[A-Za-z0-9]\d{2}$/;

export class AtualizarVeiculoDto {
  @ApiPropertyOptional({
    minLength: 7,
    maxLength: 10,
    example: 'ABC1D23',
    description: 'Placa no formato brasileiro',
  })
  @IsString()
  @IsOptional()
  @MinLength(7)
  @MaxLength(10)
  @Matches(PLACA_BR, { message: 'Placa deve ser no formato brasileiro' })
  plate?: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ minimum: 1900, maximum: 2100 })
  @IsInt()
  @IsOptional()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  nickname?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  photoUrl?: string;

  /** Cavalo mecânico: id do semi-reboque acoplado (mesma empresa). */
  @ApiPropertyOptional({ description: 'ID do semi-reboque', nullable: true })
  @Allow()
  @IsOptional()
  trailerVehicleId?: string | null;

  /** Semi-reboque: id do cavalo mecânico que o puxa. */
  @ApiPropertyOptional({ description: 'ID do cavalo mecânico', nullable: true })
  @Allow()
  @IsOptional()
  tractorVehicleId?: string | null;
}
