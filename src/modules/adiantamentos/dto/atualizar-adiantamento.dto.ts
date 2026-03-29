import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum AdvanceMethodDto {
  CASH = 'CASH',
  PIX = 'PIX',
  TRANSFER = 'TRANSFER',
}

export class AtualizarAdiantamentoDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(AdvanceMethodDto)
  method?: AdvanceMethodDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
