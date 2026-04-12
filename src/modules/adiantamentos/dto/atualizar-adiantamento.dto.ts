import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum AdvanceMethodDto {
  CASH = 'CASH',
  PIX = 'PIX',
  TRANSFER = 'TRANSFER',
}

export class AtualizarAdiantamentoDto {
  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: '2025-04-09' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: AdvanceMethodDto })
  @IsOptional()
  @IsEnum(AdvanceMethodDto)
  method?: AdvanceMethodDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL do recibo no Supabase Storage' })
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
