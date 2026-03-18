import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsNumber,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { TripStatus } from '@prisma/client';

export class CriarViagemDto {
  @IsString()
  vehicleId: string;

  @IsString()
  driverId: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  clientName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  origin?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  destination?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  freightValue?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  initialKm?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  loadType?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(TripStatus)
  @IsOptional()
  status?: TripStatus;
}
