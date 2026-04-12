import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum AdvanceMethodDto {
  CASH = 'CASH',
  PIX = 'PIX',
  TRANSFER = 'TRANSFER',
}

/**
 * DTO para criar adiantamento (vale) na viagem.
 * Recibo opcional.
 */
export class CriarAdiantamentoDto {
  @ApiProperty({ description: 'ID da viagem (UUID)' })
  @IsString()
  tripId: string;

  @ApiProperty({ example: 800, minimum: 0.01 })
  @IsNumber()
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @ApiProperty({ example: '2025-04-09' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AdvanceMethodDto, description: 'CASH, PIX ou TRANSFER' })
  @IsEnum(AdvanceMethodDto, { message: 'Método deve ser CASH, PIX ou TRANSFER' })
  method: AdvanceMethodDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  /** URL do recibo no Supabase Storage (opcional) */
  @ApiPropertyOptional({ description: 'URL do recibo no Supabase Storage' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
