import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import { DriverAuthService } from '../../core/driver-auth/driver-auth.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarAdiantamentoDto } from './dto/criar-adiantamento.dto';
import { AtualizarAdiantamentoDto } from './dto/atualizar-adiantamento.dto';

@Injectable()
export class AdiantamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly driverAuth: DriverAuthService,
  ) {}

  /**
   * Verifica se o usuário pode acessar a viagem.
   * OWNER: viagem da empresa do dono.
   * DRIVER: viagem onde o motorista é o driver.
   */
  private async ensureCanAccessTrip(
    user: AuthUser,
    tripId: string,
  ): Promise<{ tripId: string; companyId: string }> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }

    if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      const companyId = await this.companyAccess.resolveCompanyId(user);
      if (companyId !== trip.companyId) {
        throw new ForbiddenException('Viagem não pertence à sua empresa');
      }
      return { tripId, companyId: trip.companyId };
    }

    if (user.role === Role.DRIVER) {
      const ctx = await this.driverAuth.findDriverForAuthUser(user);
      if (!ctx || ctx.id !== trip.driverId) {
        throw new ForbiddenException(
          'Você só pode adicionar adiantamentos às suas viagens',
        );
      }
      return { tripId, companyId: trip.companyId };
    }

    throw new ForbiddenException('Acesso negado');
  }

  async findByTrip(user: AuthUser, tripId: string) {
    await this.ensureCanAccessTrip(user, tripId);
    const advances = await this.prisma.advance.findMany({
      where: { tripId },
      orderBy: { date: 'desc' },
    });
    return advances.map((a) => ({
      ...a,
      amount: Number(a.amount),
    }));
  }

  async findByDriver(user: AuthUser, driverId: string) {
    if (user.role !== Role.OWNER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas gestores da frota podem ver histórico por motorista');
    }
    const companyId = await this.companyAccess.resolveCompanyId(user);
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
    });
    if (!driver) {
      throw new NotFoundException('Motorista não encontrado');
    }
    const advances = await this.prisma.advance.findMany({
      where: { trip: { driverId } },
      include: { trip: { select: { code: true } } },
      orderBy: { date: 'desc' },
      take: 50,
    });
    return advances.map((a) => ({
      ...a,
      amount: Number(a.amount),
    }));
  }

  async create(user: AuthUser, dto: CriarAdiantamentoDto) {
    const { tripId } = await this.ensureCanAccessTrip(user, dto.tripId);

    const created = await this.prisma.advance.create({
      data: {
        tripId,
        amount: new Decimal(dto.amount),
        date: new Date(dto.date),
        method: dto.method,
        description: dto.description?.trim() || undefined,
        receiptUrl: dto.receiptUrl?.trim() || undefined,
      },
    });
    return {
      ...created,
      amount: Number(created.amount),
    };
  }

  async update(user: AuthUser, id: string, dto: AtualizarAdiantamentoDto) {
    const advance = await this.prisma.advance.findUnique({
      where: { id },
      include: { trip: true },
    });
    if (!advance) {
      throw new NotFoundException('Adiantamento não encontrado');
    }
    await this.ensureCanAccessTrip(user, advance.tripId);

    const updated = await this.prisma.advance.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined && { amount: new Decimal(dto.amount) }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.method !== undefined && { method: dto.method }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.receiptUrl !== undefined && {
          receiptUrl: dto.receiptUrl?.trim() || null,
        }),
      },
    });
    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async remove(user: AuthUser, id: string) {
    const advance = await this.prisma.advance.findUnique({
      where: { id },
    });
    if (!advance) {
      throw new NotFoundException('Adiantamento não encontrado');
    }
    await this.ensureCanAccessTrip(user, advance.tripId);
    await this.prisma.advance.delete({ where: { id } });
    return { success: true };
  }
}
