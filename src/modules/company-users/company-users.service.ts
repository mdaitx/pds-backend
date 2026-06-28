import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import type { AuthUser } from '../../shared/domain/auth-user.interface';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';

@Injectable()
export class CompanyUsersService {
  private readonly logger = new Logger(CompanyUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  /**
   * Se o utilizador já não existe no Auth do Supabase, seguimos com o delete no Prisma
   * (evita 400 quando a base local e o Auth ficam dessincronizados).
   */
  private isIgnorableSupabaseDeleteError(err: {
    message?: string;
    status?: number;
    code?: string;
  }): boolean {
    if (err.status === 404) return true;
    const code = (err.code ?? '').toLowerCase();
    if (code === 'user_not_found' || code === 'not_found') return true;
    const m = (err.message ?? '').toLowerCase();
    return (
      m.includes('user not found') ||
      m.includes('no user found') ||
      m.includes('unable to find') ||
      m.includes('does not exist')
    );
  }

  private inviteRedirectTo(): string {
    const base = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/reset-password`;
  }

  /**
   * Lista contas com login vinculadas à empresa (dono titular + membros).
   * Dono titular e administradores podem consultar.
   */
  async listStaff(user: AuthUser) {
    const companyId = await this.companyAccess.resolveCompanyId(user);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerId: true },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    const staff = await this.prisma.user.findMany({
      where: {
        OR: [{ companyId }, { id: company.ownerId }],
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        photoUrl: true,
        phone: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });

    const seen = new Map<string, (typeof staff)[0]>();
    for (const row of staff) {
      seen.set(row.id, row);
    }
    return {
      companyId,
      staff: Array.from(seen.values()).map((s) => ({
        id: s.id,
        email: s.email,
        name: s.displayName ?? null,
        photoUrl: s.photoUrl ?? null,
        phone: s.phone ?? null,
        role: s.role,
        isPrimaryOwner: s.id === company.ownerId,
      })),
    };
  }

  private async findStaffUserOrThrow(
    companyId: string,
    primaryOwnerId: string,
    memberId: string,
  ) {
    const target = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        OR: [{ companyId }, { id: primaryOwnerId }],
      },
    });
    if (!target) {
      throw new NotFoundException('Usuário não encontrado nesta empresa.');
    }
    return target;
  }

  /**
   * Associa a ficha do motorista ao usuário criado (`motoristas.user_id`).
   */
  private async linkDriverToNewStaffUser(
    companyId: string,
    newUserId: string,
    authEmail: string,
    dto: CreateCompanyUserDto,
  ): Promise<void> {
    const driverRow = await this.prisma.driver.findFirst({
      where: dto.driverId
        ? { id: dto.driverId, companyId }
        : { companyId, email: { equals: authEmail, mode: 'insensitive' } },
    });

    if (!driverRow) {
      throw new BadRequestException(
        dto.driverId
          ? 'Motorista não encontrado nesta empresa.'
          : 'Motorista não encontrado para vincular ao usuário.',
      );
    }

    if (driverRow.userId && driverRow.userId !== newUserId) {
      throw new ConflictException('Este motorista já está vinculado a outro usuário.');
    }

    await this.prisma.driver.update({
      where: { id: driverRow.id },
      data: {
        userId: newUserId,
        email: authEmail,
      },
    });
  }

  /**
   * Cria usuário no Supabase Auth + linha em usuarios (ADMIN ou OWNER co-proprietário).
   * Com senha: createUser. Sem senha: convite por e-mail (inviteUserByEmail).
   * Somente o proprietário titular pode convidar.
   */
  async createStaffUser(inviter: AuthUser, dto: CreateCompanyUserDto) {
    const companyId = await this.companyAccess.assertPrimaryOwner(inviter);

    const email = dto.email.trim().toLowerCase();
    if (dto.role === Role.DRIVER) {
      if (dto.driverId) {
        const existingDriver = await this.prisma.driver.findFirst({
          where: { id: dto.driverId, companyId },
        });
        if (!existingDriver) {
          throw new NotFoundException('Motorista não encontrado nesta empresa.');
        }
        if (existingDriver.userId) {
          throw new ConflictException('Este motorista já possui usuário vinculado.');
        }
      } else {
        const driverExists = await this.prisma.driver.findFirst({
          where: {
            companyId,
            email: { equals: email, mode: 'insensitive' },
          },
        });
        if (!driverExists) {
          const cpfClean = (dto.cpf ?? '').replace(/\D/g, '');
          if (cpfClean.length > 0 && cpfClean.length !== 11) {
            throw new BadRequestException(
              'CPF deve ter 11 dígitos quando informado.',
            );
          }
          if (cpfClean.length === 11) {
            const cpfConflict = await this.prisma.driver.findFirst({
              where: { companyId, cpf: cpfClean },
            });
            if (cpfConflict) {
              throw new ConflictException('Já existe motorista com este CPF na frota.');
            }
          }
          await this.prisma.driver.create({
            data: {
              companyId,
              name: (dto.name ?? email).trim(),
              cpf: cpfClean.length === 11 ? cpfClean : null,
              email,
              phone: dto.phone?.trim() || null,
              status: dto.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
              photoUrl: dto.photoUrl?.trim() || null,
            },
          });
        }
      }
    } else if (dto.role !== Role.ADMIN && dto.role !== Role.OWNER) {
      throw new BadRequestException('Perfil inválido.');
    }

    const password = dto.password?.trim() ?? '';
    const useInvite = password.length === 0;

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado no sistema.');
    }

    const admin = this.supabase.getClient().auth.admin;

    let supabaseUserId: string;
    let authEmail: string;

    if (useInvite) {
      const { data, error } = await admin.inviteUserByEmail(email, {
        data: { display_name: dto.name?.trim() ?? undefined },
        redirectTo: this.inviteRedirectTo(),
      });
      if (error) {
        throw new BadRequestException(
          error.message ??
            'Não foi possível enviar o convite (verifique SERVICE_ROLE_KEY, FRONTEND_URL e SMTP).',
        );
      }
      if (!data.user?.id) {
        throw new BadRequestException('Resposta inválida ao convidar usuário no Supabase.');
      }
      supabaseUserId = data.user.id;
      authEmail = (data.user.email ?? email).toLowerCase();
    } else {
      const { data, error } = await admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: dto.name?.trim() || undefined,
        },
      });
      if (error) {
        throw new BadRequestException(
          error.message ?? 'Não foi possível criar o usuário no Supabase Auth.',
        );
      }
      if (!data.user?.id) {
        throw new BadRequestException('Resposta inválida ao criar usuário no Supabase.');
      }
      supabaseUserId = data.user.id;
      authEmail = (data.user.email ?? email).toLowerCase();
    }

    try {
      const created = await this.prisma.user.create({
        data: {
          supabaseUserId,
          email: authEmail,
          displayName: dto.name?.trim() || null,
          photoUrl: dto.photoUrl?.trim() || null,
          phone: dto.phone?.trim() || null,
          role: dto.role,
          companyId,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          companyId: true,
        },
      });

      if (dto.role === Role.DRIVER) {
        await this.linkDriverToNewStaffUser(companyId, created.id, authEmail, dto);
      }

      return {
        ...created,
        invitedByEmail: useInvite,
      };
    } catch (e) {
      try {
        await admin.deleteUser(supabaseUserId);
      } catch {
        /* ignore rollback failure */
      }
      throw e;
    }
  }

  /**
   * Atualiza nome, papel e/ou senha. Troca de papel: só dono titular. Nome: dono titular ou admin (exceto dono titular alvo).
   * Qualquer membro pode alterar o próprio nome. Senha: dono titular ou admin pode alterar de outros; qualquer um pode alterar a própria.
   */
  async updateStaffMember(inviter: AuthUser, memberId: string, dto: UpdateCompanyUserDto) {
    if (dto.name === undefined && dto.role === undefined && dto.password === undefined) {
      throw new BadRequestException('Informe nome, papel ou senha para atualizar.');
    }

    const companyId = await this.companyAccess.resolveCompanyId(inviter);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerId: true },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    const primaryOwnerId = company.ownerId;
    const isPrimaryInviter = await this.companyAccess.isPrimaryOwnerOfCompany(
      inviter.id,
      companyId,
    );

    const target = await this.findStaffUserOrThrow(companyId, primaryOwnerId, memberId);

    if (dto.role !== undefined) {
      if (target.id === primaryOwnerId) {
        throw new ForbiddenException('Não é possível alterar o papel do proprietário titular.');
      }
      if (!isPrimaryInviter) {
        throw new ForbiddenException('Apenas o proprietário titular pode alterar papéis.');
      }
      if (dto.role !== Role.ADMIN && dto.role !== Role.OWNER && dto.role !== Role.DRIVER) {
        throw new BadRequestException('Papel inválido.');
      }
      if (dto.role === Role.DRIVER) {
        const byLink = await this.prisma.driver.findFirst({
          where: { companyId, userId: target.id },
        });
        const byEmail = await this.prisma.driver.findFirst({
          where: {
            companyId,
            email: { equals: target.email, mode: 'insensitive' },
          },
        });
        if (!byLink && !byEmail) {
          throw new BadRequestException(
            'Para definir perfil Motorista, o motorista deve existir na frota (mesmo e-mail ou vínculo user_id).',
          );
        }
      }
    }

    if (dto.name !== undefined && inviter.id !== memberId) {
      if (target.id === primaryOwnerId && inviter.role === Role.ADMIN) {
        throw new ForbiddenException('Administrador não pode editar o nome do proprietário titular.');
      }
      if (inviter.role === Role.OWNER && !isPrimaryInviter) {
        throw new ForbiddenException('Apenas o proprietário titular pode editar outros membros.');
      }
    }

    if (dto.password !== undefined) {
      if (inviter.id !== memberId) {
        if (!isPrimaryInviter && inviter.role !== Role.ADMIN) {
          throw new ForbiddenException('Apenas o proprietário titular ou administrador pode alterar a senha de outros usuários.');
        }
        if (target.id === primaryOwnerId && inviter.role === Role.ADMIN) {
          throw new ForbiddenException('Administrador não pode alterar a senha do proprietário titular.');
        }
      }
      if (!target.supabaseUserId) {
        throw new BadRequestException('Este usuário não possui conta de login (convite pendente).');
      }
      const { error } = await this.supabase.getClient().auth.admin.updateUserById(
        target.supabaseUserId,
        { password: dto.password.trim() },
      );
      if (error) {
        throw new BadRequestException(error.message ?? 'Não foi possível alterar a senha.');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: memberId },
      data: {
        ...(dto.name !== undefined && { displayName: dto.name.trim() || null }),
        ...(dto.role !== undefined && { role: dto.role }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        companyId: true,
      },
    });

    return updated;
  }

  /**
   * Remove conta de acesso (Supabase + usuarios). Não remove o proprietário titular.
   */
  async removeStaffMember(inviter: AuthUser, memberId: string) {
    const companyId = await this.companyAccess.assertPrimaryOwner(inviter);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerId: true },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    if (memberId === inviter.id) {
      throw new BadRequestException('Você não pode remover a si mesmo por este fluxo.');
    }
    if (memberId === company.ownerId) {
      throw new ForbiddenException('Não é possível remover o proprietário titular.');
    }

    const target = await this.findStaffUserOrThrow(companyId, company.ownerId, memberId);

    if (!target.supabaseUserId) {
      await this.prisma.driver.updateMany({
        where: { userId: memberId },
        data: { userId: null },
      });
      await this.prisma.user.delete({ where: { id: memberId } });
      return { success: true };
    }

    await this.prisma.driver.updateMany({
      where: { userId: memberId },
      data: { userId: null },
    });

    const { error: delAuthErr } = await this.supabase
      .getClient()
      .auth.admin.deleteUser(target.supabaseUserId);

    if (delAuthErr) {
      if (this.isIgnorableSupabaseDeleteError(delAuthErr)) {
        this.logger.warn(
          `Supabase Auth: utilizador ${target.supabaseUserId} já inexistente; removendo só no banco local.`,
        );
      } else {
        throw new BadRequestException(
          delAuthErr.message ?? 'Não foi possível remover o usuário no Supabase Auth.',
        );
      }
    }

    await this.prisma.user.delete({ where: { id: memberId } });
    return { success: true };
  }

  /**
   * Reenvia e-mail de convite (mesmo fluxo do primeiro convite sem senha).
   */
  async resendInvite(inviter: AuthUser, memberId: string) {
    await this.companyAccess.assertPrimaryOwner(inviter);

    const companyId = await this.companyAccess.resolveCompanyId(inviter);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerId: true },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    if (memberId === company.ownerId) {
      throw new BadRequestException('Não há convite a reenviar para o proprietário titular.');
    }

    const target = await this.findStaffUserOrThrow(companyId, company.ownerId, memberId);

    const { error } = await this.supabase.getClient().auth.admin.inviteUserByEmail(
      target.email,
      {
        data: { display_name: target.displayName ?? undefined },
        redirectTo: this.inviteRedirectTo(),
      },
    );

    if (error) {
      throw new BadRequestException(
        error.message ??
          'Não foi possível reenviar o convite (o e-mail pode já estar confirmado).',
      );
    }

    return { success: true, message: 'Convite reenviado.' };
  }
}
