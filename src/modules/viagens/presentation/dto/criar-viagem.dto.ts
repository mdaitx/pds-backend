import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsNumber,
  IsEnum,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { TripStatus } from '@prisma/client';

export class CriarViagemDto {
  @ApiProperty({ description: 'ID do veículo (UUID)' })
  @IsString()
  vehicleId: string;

  @ApiProperty({ description: 'ID do motorista (UUID)' })
  @IsString()
  driverId: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientName?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  origin?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  destination?: string;

  @ApiProperty({ example: '2025-04-09T08:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2025-04-10T18:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Valor do frete' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  freightValue?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Km inicial' })
  @IsInt()
  @IsOptional()
  @Min(0)
  initialKm?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  loadType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: TripStatus })
  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;

  @ApiPropertyOptional({
    description: 'Viagem de deslocamento até o carregamento (sem carga / “viagem vazia”)',
  })
  @IsBoolean()
  @IsOptional()
  displacementToLoad?: boolean;
}
