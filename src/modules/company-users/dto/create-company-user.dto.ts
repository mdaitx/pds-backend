import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * Convite de usuário com login (admin, co-proprietário e motorista).
 * Por segurança, o fluxo envia link único por e-mail (Supabase) para definir senha no primeiro acesso.
 */
export class CreateCompanyUserDto {
  @ApiProperty({ example: 'novo@empresa.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Campo legado. Por segurança, o backend envia convite com link de primeiro acesso e não usa senha em texto.',
    minLength: 6,
    maxLength: 128,
  })
  @IsOptional()
  @ValidateIf((o) => o.password !== undefined && o.password !== '')
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;

  @ApiProperty({ enum: Role })
  @IsIn([Role.ADMIN, Role.OWNER, Role.DRIVER])
  role!: Role;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  /** Obrigatório quando role é DRIVER e o motorista ainda não existe na frota. */
  @ApiPropertyOptional({ maxLength: 14, description: 'Obrigatório em alguns fluxos de motorista novo' })
  @IsOptional()
  @IsString()
  @MaxLength(14)
  cpf?: string;

  /**
   * Quando role é DRIVER: vincular o novo login a um motorista já cadastrado (sem `user_id`).
   * Se omitido, usa o motorista com o mesmo e-mail ou cria um novo (comportamento anterior).
   */
  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  driverId?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @ApiPropertyOptional({ maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  photoUrl?: string;
}
