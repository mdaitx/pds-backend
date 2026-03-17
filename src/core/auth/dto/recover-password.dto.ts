import { IsEmail } from 'class-validator';

/** Corpo da requisição POST /auth/recover-password: e-mail para envio do link de redefinição. */
export class RecoverPasswordDto {
  @IsEmail()
  email: string;
}
