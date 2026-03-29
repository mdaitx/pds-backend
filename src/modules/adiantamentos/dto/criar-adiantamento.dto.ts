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
  @IsString()
  tripId: string;

  @IsNumber()
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @IsDateString()
  date: string;

  @IsEnum(AdvanceMethodDto, { message: 'Método deve ser CASH, PIX ou TRANSFER' })
  method: AdvanceMethodDto;

  @IsOptional()
  @IsString()
  description?: string;

  /** URL do recibo no Supabase Storage (opcional) */
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
