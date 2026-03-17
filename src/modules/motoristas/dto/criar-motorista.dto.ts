import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { DriverStatus } from '@prisma/client';

export class CriarMotoristaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(11, { message: 'CPF deve ter 11 dígitos' })
  @MaxLength(14)
  cpf: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  rg?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  cnh?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  commissionPct?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  pixKey?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  bankAgency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  bankAccount?: string;

  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @IsString()
  @IsOptional()
  preferredVehicleId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  photoUrl?: string;
}
