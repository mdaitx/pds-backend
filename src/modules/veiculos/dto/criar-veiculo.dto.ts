import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

/** Antigo: ABC1234 ou ABC-1234. Mercosul: ABC1D23 ou ABC-1D23 (LLL + dígito + alfanum. + 2 dígitos). */
const PLACA_BR =
  /^[A-Za-z]{3}-?\d{4}$|^[A-Za-z]{3}-?\d[A-Za-z0-9]\d{2}$/;

export class CriarVeiculoDto {
  @ApiProperty({
    minLength: 7,
    maxLength: 10,
    example: 'ABC1D23',
    description: 'Placa no formato brasileiro (ABC-1234 ou Mercosul)',
  })
  @IsString()
  @MinLength(7, { message: 'Placa inválida' })
  @MaxLength(10)
  @Matches(PLACA_BR, { message: 'Placa deve ser no formato brasileiro (ABC-1234 ou ABC1D23)' })
  plate: string;

  @ApiProperty({ minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  model: string;

  @ApiProperty({ minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  brand: string;

  @ApiProperty({ minimum: 1900, maximum: 2100, example: 2021 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  nickname?: string;

  @ApiPropertyOptional({
    enum: VehicleType,
    description: 'CAMINHAO, CAVALO_MECANICO ou SEMI_REBOQUE',
  })
  @IsEnum(VehicleType, {
    message: 'Tipo deve ser CAMINHAO, CAVALO_MECANICO ou SEMI_REBOQUE',
  })
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ enum: VehicleStatus, description: 'ACTIVE, INACTIVE ou MAINTENANCE' })
  @IsEnum(VehicleStatus, { message: 'Status deve ser ACTIVE, INACTIVE ou MAINTENANCE' })
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
