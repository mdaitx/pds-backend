import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Passo 1 do onboarding: criação da empresa. */
export class CreateOnboardingCompanyDto {
  @IsString()
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(200)
  name: string;

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

/** Passo 2: primeiro veículo. Placa 7 caracteres (ex: ABC1D23). */
export class CreateOnboardingFirstVehicleDto {
  @IsString()
  @MinLength(7, { message: 'Placa deve ter 7 caracteres (ex: ABC1D23)' })
  @MaxLength(7)
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
  @Type(() => Number)
  @Min(1900)
  @Max(2100)
  year: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nickname?: string;
}

/** Passo 3: primeiro motorista. CPF 11–14 caracteres (com ou sem formatação). */
export class CreateOnboardingFirstDriverDto {
  @IsString()
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(11, { message: 'CPF deve ter 11 dígitos' })
  @MaxLength(14)
  cpf: string;

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
  commissionPct?: number;
}
