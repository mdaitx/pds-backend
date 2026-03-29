import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Role } from '@prisma/client';

/**
 * Convite de usuário com login (admin ou co-proprietário). Motorista continua em POST /drivers.
 * Sem `password`: envia convite por e-mail (Supabase) para definir senha no primeiro acesso.
 */
export class CreateCompanyUserDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.password !== undefined && o.password !== '')
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;

  @IsIn([Role.ADMIN, Role.OWNER, Role.DRIVER])
  role!: Role;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  /** Obrigatório quando role é DRIVER e o motorista ainda não existe na frota. */
  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  /**
   * Quando role é DRIVER: vincular o novo login a um motorista já cadastrado (sem `user_id`).
   * Se omitido, usa o motorista com o mesmo e-mail ou cria um novo (comportamento anterior).
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  driverId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;
}
