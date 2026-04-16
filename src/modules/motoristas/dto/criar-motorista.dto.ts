import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DriverStatus } from '@prisma/client';

export class CriarMotoristaDto {
  @ApiProperty({ minLength: 2, maxLength: 200, example: 'João Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ minLength: 11, maxLength: 14 })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => (o.cpf ?? '').trim().length > 0)
  @MinLength(11, { message: 'CPF deve ter 11 dígitos' })
  @MaxLength(14)
  cpf?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  rg?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  cnh?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Comissão (%)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  commissionPct?: number;

  @ApiProperty({ minimum: 0, description: 'Salário mensal fixo (BRL), para relatórios por motorista' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  monthlySalary: number;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  pixKey?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  bankAgency?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  bankAccount?: string;

  @ApiPropertyOptional({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  @IsOptional()
  status?: DriverStatus;

  @ApiPropertyOptional({ description: 'ID do veículo preferido' })
  @IsString()
  @IsOptional()
  preferredVehicleId?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  photoUrl?: string;

  /** Vincular esta ficha a um usuário motorista já existente na empresa (opcional). */
  @ApiPropertyOptional({ description: 'ID do usuário já existente para vincular' })
  @IsString()
  @IsOptional()
  linkedUserId?: string;
}
