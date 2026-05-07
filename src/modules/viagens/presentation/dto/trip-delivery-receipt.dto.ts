import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class TripDeliveryReceiptDto {
  @ApiProperty({ description: 'URL pública do comprovante de entrega (após upload)' })
  @IsString()
  @MinLength(8, { message: 'URL inválida' })
  @MaxLength(4096)
  url: string;
}
