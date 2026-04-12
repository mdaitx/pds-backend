import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FinalizarViagemDto {
  @ApiPropertyOptional({
    example: 125430,
    description: 'Quilometragem do odômetro ao finalizar a viagem',
  })
  @IsOptional()
  @IsInt({ message: 'Km final deve ser um numero inteiro' })
  @Min(0)
  finalKm?: number;
}
