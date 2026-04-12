import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AtualizarDespesaDto {
  @ApiPropertyOptional({ description: 'ID da categoria de despesa' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: '2025-04-09' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 150.5, minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tollPlaza?: string;
}
