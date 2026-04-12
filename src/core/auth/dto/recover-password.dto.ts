import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/** Corpo da requisição POST /auth/recover-password: e-mail para envio do link de redefinição. */
export class RecoverPasswordDto {
  @ApiProperty({ example: 'motorista@empresa.com', description: 'E-mail da conta' })
  @IsEmail()
  email: string;
}
