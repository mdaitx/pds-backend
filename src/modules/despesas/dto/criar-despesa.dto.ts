import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO para criar despesa na viagem.
 * Comprovante obrigatório para despesas > R$ 100.
 */
export class CriarDespesaDto {
  @IsString()
  tripId: string;

  @IsString()
  categoryId: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  /** URL do comprovante no Supabase Storage (obrigatório se amount > 100) */
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  // Campos específicos combustível
  @IsOptional()
  @IsNumber()
  @Min(0)
  liters?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerLiter?: number;

  @IsOptional()
  @IsString()
  gasStation?: string;

  // Campo específico pedágio
  @IsOptional()
  @IsString()
  tollPlaza?: string;
}
