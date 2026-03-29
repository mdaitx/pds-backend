import { IsInt, IsOptional, Min } from 'class-validator';

export class FinalizarViagemDto {
  @IsOptional()
  @IsInt({ message: 'Km final deve ser um numero inteiro' })
  @Min(0)
  finalKm?: number;
}
