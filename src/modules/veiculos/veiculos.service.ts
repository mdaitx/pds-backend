import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { VehicleType, type Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CompanyAccessService } from '../../core/company-access/company-access.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { paginateResult, type PaginationOptions } from '../../common/pagination';
import { CriarVeiculoDto } from './dto/criar-veiculo.dto';
import { AtualizarVeiculoDto } from './dto/atualizar-veiculo.dto';
import { SubscriptionService } from '../subscription/subscription.service';

const pairSelect = {
  id: true,
  plate: true,
  brand: true,
  model: true,
  vehicleType: true,
} as const;

type PairSummary = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  vehicleType: VehicleType;
};

type VehicleWithTrailer = Prisma.VehicleGetPayload<{
  include: { trailerVehicle: { select: typeof pairSelect } };
}>;

@Injectable()
export class VeiculosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    private readonly subscription: SubscriptionService,
  ) {}

  private async getCompanyId(user: AuthUser): Promise<string> {
    return this.companyAccess.resolveCompanyId(user);
  }

  private mapOne(v: VehicleWithTrailer, tractorVehicle: PairSummary | null) {
    const { trailerVehicle, ...rest } = v;
    return {
      ...rest,
      photoUrl: v.photoUrl ?? undefined,
      trailerVehicle: trailerVehicle ?? undefined,
      tractorVehicle: tractorVehicle ?? undefined,
    };
  }

  /** Só um cavalo por semi-reboque. */
  private async setCavaloTrailer(companyId: string, cavaloId: string, semiId: string | null) {
    await this.prisma.$transaction(async (tx) => {
      if (semiId) {
        const semi = await tx.vehicle.findFirst({ where: { id: semiId, companyId } });
        if (!semi) throw new BadRequestException('Semi-reboque não encontrado.');
        if (semi.vehicleType !== VehicleType.SEMI_REBOQUE) {
          throw new BadRequestException('Selecione um veículo do tipo semi-reboque.');
        }
        await tx.vehicle.updateMany({
          where: { companyId, trailerVehicleId: semiId, id: { not: cavaloId } },
          data: { trailerVehicleId: null },
        });
      }
      await tx.vehicle.update({
        where: { id: cavaloId },
        data: { trailerVehicleId: semiId },
      });
    });
  }

  private async findTractorForSemi(companyId: string, semiId: string) {
    return this.prisma.vehicle.findFirst({
      where: { companyId, trailerVehicleId: semiId },
      select: pairSelect,
    });
  }

  private async attachTractorsToSemis(
    companyId: string,
    list: VehicleWithTrailer[],
  ): Promise<Map<string, PairSummary | null>> {
    const semiIds = list.filter((v) => v.vehicleType === VehicleType.SEMI_REBOQUE).map((v) => v.id);
    const map = new Map<string, PairSummary | null>();
    if (!semiIds.length) return map;
    const tractors = await this.prisma.vehicle.findMany({
      where: { companyId, trailerVehicleId: { in: semiIds } },
      select: { ...pairSelect, trailerVehicleId: true },
    });
    for (const s of semiIds) {
      map.set(s, null);
    }
    for (const t of tractors) {
      if (t.trailerVehicleId) {
        const summary: PairSummary = {
          id: t.id,
          plate: t.plate,
          brand: t.brand,
          model: t.model,
          vehicleType: t.vehicleType,
        };
        map.set(t.trailerVehicleId, summary);
      }
    }
    return map;
  }

  async findAll(user: AuthUser, pagination: PaginationOptions = {}) {
    const companyId = await this.getCompanyId(user);
    const list = await this.prisma.vehicle.findMany({
      where: { companyId },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { id: 'asc' }],
      include: { trailerVehicle: { select: pairSelect } },
      ...(pagination.limit ? { take: pagination.limit + 1 } : {}),
      ...(pagination.cursor ? { cursor: { id: pagination.cursor }, skip: 1 } : {}),
    });
    const tractorBySemi = await this.attachTractorsToSemis(companyId, list);
    const mapped = list.map((v) =>
      this.mapOne(v, tractorBySemi.get(v.id) ?? null),
    );
    return pagination.limit ? paginateResult(mapped, pagination.limit) : mapped;
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: { trailerVehicle: { select: pairSelect } },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    const tractor =
      vehicle.vehicleType === VehicleType.SEMI_REBOQUE
        ? await this.findTractorForSemi(companyId, id)
        : null;
    return this.mapOne(vehicle, tractor);
  }

  async create(user: AuthUser, dto: CriarVeiculoDto) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertCanAddVehicle(companyId);
    const plate = dto.plate.replace(/\s/g, '').toUpperCase().replace(/-/g, '');
    const plateFormatted = plate.length === 7 ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;

    const existing = await this.prisma.vehicle.findFirst({
      where: { companyId, plate: { in: [plate, plateFormatted] } },
    });
    if (existing) {
      throw new ConflictException('Já existe um veículo com esta placa');
    }

    const type = dto.vehicleType ?? VehicleType.CAMINHAO;

    if (dto.trailerVehicleId && type !== VehicleType.CAVALO_MECANICO) {
      throw new BadRequestException('O campo semi-reboque só se aplica a cavalos mecânicos.');
    }
    if (dto.tractorVehicleId && type !== VehicleType.SEMI_REBOQUE) {
      throw new BadRequestException('O campo cavalo mecânico só se aplica a semi-reboques.');
    }

    let initialTrailerId: string | null = null;
    if (type === VehicleType.CAVALO_MECANICO && dto.trailerVehicleId) {
      const semi = await this.prisma.vehicle.findFirst({
        where: { id: dto.trailerVehicleId, companyId },
      });
      if (!semi) throw new BadRequestException('Semi-reboque não encontrado.');
      if (semi.vehicleType !== VehicleType.SEMI_REBOQUE) {
        throw new BadRequestException('Selecione um veículo do tipo semi-reboque.');
      }
      initialTrailerId = dto.trailerVehicleId;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      if (initialTrailerId) {
        await tx.vehicle.updateMany({
          where: { companyId, trailerVehicleId: initialTrailerId },
          data: { trailerVehicleId: null },
        });
      }
      return tx.vehicle.create({
        data: {
          companyId,
          plate: plateFormatted,
          model: dto.model.trim(),
          brand: dto.brand.trim(),
          year: dto.year,
          nickname: dto.nickname?.trim() || undefined,
          vehicleType: type,
          status: dto.status ?? 'ACTIVE',
          photoUrl: dto.photoUrl || undefined,
          trailerVehicleId:
            type === VehicleType.CAVALO_MECANICO ? initialTrailerId : null,
        },
        include: { trailerVehicle: { select: pairSelect } },
      });
    });

    if (type === VehicleType.SEMI_REBOQUE && dto.tractorVehicleId) {
      const cavalo = await this.prisma.vehicle.findFirst({
        where: { id: dto.tractorVehicleId, companyId },
      });
      if (!cavalo) throw new BadRequestException('Cavalo mecânico não encontrado.');
      if (cavalo.vehicleType !== VehicleType.CAVALO_MECANICO) {
        throw new BadRequestException('Selecione um veículo do tipo cavalo mecânico.');
      }
      await this.setCavaloTrailer(companyId, dto.tractorVehicleId, created.id);
    }

    void this.subscription.syncBillableSeatsAfterVehicleChange(companyId);
    return this.findOne(user, created.id);
  }

  async update(user: AuthUser, id: string, dto: AtualizarVeiculoDto) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    let plateFormatted: string | undefined;
    if (dto.plate !== undefined) {
      const plate = dto.plate.replace(/\s/g, '').toUpperCase().replace(/-/g, '');
      plateFormatted = plate.length === 7 ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
      const existing = await this.prisma.vehicle.findFirst({
        where: {
          companyId,
          plate: { in: [plate, plateFormatted] },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Já existe um veículo com esta placa');
      }
    }

    const nextType = dto.vehicleType ?? vehicle.vehicleType;

    if (
      dto.trailerVehicleId !== undefined &&
      dto.trailerVehicleId !== null &&
      dto.trailerVehicleId !== '' &&
      nextType !== VehicleType.CAVALO_MECANICO
    ) {
      throw new BadRequestException('O campo semi-reboque só se aplica a cavalos mecânicos.');
    }
    if (
      dto.tractorVehicleId !== undefined &&
      dto.tractorVehicleId !== null &&
      dto.tractorVehicleId !== '' &&
      nextType !== VehicleType.SEMI_REBOQUE
    ) {
      throw new BadRequestException('O campo cavalo mecânico só se aplica a semi-reboques.');
    }

    if (vehicle.vehicleType === VehicleType.SEMI_REBOQUE && nextType !== VehicleType.SEMI_REBOQUE) {
      await this.prisma.vehicle.updateMany({
        where: { companyId, trailerVehicleId: id },
        data: { trailerVehicleId: null },
      });
    }

    const trailerForRow: string | null | undefined =
      nextType === VehicleType.CAMINHAO || nextType === VehicleType.SEMI_REBOQUE
        ? null
        : dto.trailerVehicleId !== undefined
          ? dto.trailerVehicleId && dto.trailerVehicleId !== ''
            ? dto.trailerVehicleId
            : null
          : undefined;

    if (trailerForRow && trailerForRow === id) {
      throw new BadRequestException('Não é possível acoplar o veículo a si mesmo.');
    }
    if (trailerForRow) {
      const semi = await this.prisma.vehicle.findFirst({
        where: { id: trailerForRow, companyId },
      });
      if (!semi) throw new BadRequestException('Semi-reboque não encontrado.');
      if (semi.vehicleType !== VehicleType.SEMI_REBOQUE) {
        throw new BadRequestException('Selecione um veículo do tipo semi-reboque.');
      }
    }

    const updateData: Prisma.VehicleUncheckedUpdateInput = {};
    if (plateFormatted !== undefined) updateData.plate = plateFormatted;
    if (dto.model !== undefined) updateData.model = dto.model.trim();
    if (dto.brand !== undefined) updateData.brand = dto.brand.trim();
    if (dto.year !== undefined) updateData.year = dto.year;
    if (dto.nickname !== undefined) updateData.nickname = dto.nickname?.trim() || null;
    if (dto.vehicleType !== undefined) updateData.vehicleType = dto.vehicleType;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.photoUrl !== undefined) updateData.photoUrl = dto.photoUrl || null;

    if (nextType === VehicleType.CAMINHAO || nextType === VehicleType.SEMI_REBOQUE) {
      updateData.trailerVehicleId = null;
    } else if (trailerForRow !== undefined) {
      updateData.trailerVehicleId = trailerForRow;
    }

    const newTrailerToClaim =
      nextType === VehicleType.CAVALO_MECANICO && typeof trailerForRow === 'string' && trailerForRow
        ? trailerForRow
        : null;

    await this.prisma.$transaction(async (tx) => {
      if (newTrailerToClaim) {
        await tx.vehicle.updateMany({
          where: { companyId, trailerVehicleId: newTrailerToClaim, id: { not: id } },
          data: { trailerVehicleId: null },
        });
      }
      await tx.vehicle.update({
        where: { id },
        data: updateData,
      });
    });

    if (nextType === VehicleType.SEMI_REBOQUE && dto.tractorVehicleId !== undefined) {
      const raw = dto.tractorVehicleId;
      if (raw === null || raw === '') {
        await this.prisma.vehicle.updateMany({
          where: { companyId, trailerVehicleId: id },
          data: { trailerVehicleId: null },
        });
      } else {
        if (raw === id) {
          throw new BadRequestException('Não é possível acoplar o veículo a si mesmo.');
        }
        const cavalo = await this.prisma.vehicle.findFirst({
          where: { id: raw, companyId },
        });
        if (!cavalo) throw new BadRequestException('Cavalo mecânico não encontrado.');
        if (cavalo.vehicleType !== VehicleType.CAVALO_MECANICO) {
          throw new BadRequestException('Selecione um veículo do tipo cavalo mecânico.');
        }
        await this.setCavaloTrailer(companyId, raw, id);
      }
    }

    void this.subscription.syncBillableSeatsAfterVehicleChange(companyId);
    return this.findOne(user, id);
  }

  async remove(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const tripsCount = await this.prisma.trip.count({
      where: { vehicleId: id, companyId },
    });
    if (tripsCount > 0) {
      throw new ConflictException(
        `Não é possível excluir este veículo: existem ${tripsCount} viagem(ns) vinculada(s). Remova ou altere as viagens antes.`,
      );
    }

    if (vehicle.vehicleType === VehicleType.SEMI_REBOQUE) {
      await this.prisma.vehicle.updateMany({
        where: { companyId, trailerVehicleId: id },
        data: { trailerVehicleId: null },
      });
    }

    await this.prisma.vehicle.delete({ where: { id } });
    void this.subscription.syncBillableSeatsAfterVehicleChange(companyId);
    return { success: true };
  }
}
