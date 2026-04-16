import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VehicleType } from '@prisma/client';

/** Passo 1 do onboarding: criação da empresa. */
export class CreateOnboardingCompanyDto {
  @ApiProperty({ minLength: 2, maxLength: 200, example: 'Transportes Silva' })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(200)
  name: string;

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
}

/** Passo 2: primeiro veículo. Placa 7 caracteres (ex: ABC1D23). */
export class CreateOnboardingFirstVehicleDto {
  @ApiProperty({ minLength: 7, maxLength: 7, example: 'ABC1D23' })
  @IsString()
  @MinLength(7, { message: 'Placa deve ter 7 caracteres (ex: ABC1D23)' })
  @MaxLength(7)
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

  @ApiProperty({ example: 2022, minimum: 1900, maximum: 2100 })
  @IsInt()
  @Type(() => Number)
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nickname?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;
}

/** Passo 3: primeiro motorista. CPF 11–14 caracteres (com ou sem formatação). */
export class CreateOnboardingFirstDriverDto {
  @ApiProperty({ minLength: 3, maxLength: 200 })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  @MaxLength(200)
  name: string;

  @ApiProperty({ minLength: 11, maxLength: 14, example: '12345678901' })
  @IsString()
  @MinLength(11, { message: 'CPF deve ter 11 dígitos' })
  @MaxLength(14)
  cpf: string;

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

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Comissão (%)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  commissionPct?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Salário mensal fixo (BRL)' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  monthlySalary?: number;
}
