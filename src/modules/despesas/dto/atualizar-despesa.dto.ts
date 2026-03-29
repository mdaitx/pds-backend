import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AtualizarDespesaDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

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

  @IsOptional()
  @IsString()
  tollPlaza?: string;
}
