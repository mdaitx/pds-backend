import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO para criar despesa na viagem.
 * Comprovante obrigatório para despesas > R$ 100.
 */
export class CriarDespesaDto {
  @ApiProperty({ description: 'ID da viagem (UUID)' })
  @IsString()
  tripId: string;

  @ApiProperty({ description: 'ID da categoria de despesa' })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: '2025-04-09' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 89.9, minimum: 0.01 })
  @IsNumber()
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  /** URL do comprovante no Supabase Storage (obrigatório se amount > 100) */
  @ApiPropertyOptional({ description: 'URL do comprovante no Supabase Storage' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Litros (combustível)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  liters?: number;

  @ApiPropertyOptional({ description: 'Preço por litro' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerLiter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gasStation?: string;

  @ApiPropertyOptional({ description: 'Nome do pedágio' })
  @IsOptional()
  @IsString()
  tollPlaza?: string;
}
