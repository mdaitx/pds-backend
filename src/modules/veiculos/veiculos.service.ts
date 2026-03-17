import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import type { AuthUser } from '../../core/auth/auth.service';
import { CriarVeiculoDto } from './dto/criar-veiculo.dto';
import { AtualizarVeiculoDto } from './dto/atualizar-veiculo.dto';

@Injectable()
export class VeiculosService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCompanyId(user: AuthUser): Promise<string> {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Apenas donos podem acessar veículos');
    }
    const company = await this.prisma.company.findUnique({
      where: { ownerId: user.id },
    });
    if (!company) {
      throw new BadRequestException('Cadastre a empresa antes de cadastrar veículos');
    }
    return company.id;
  }

  async findAll(user: AuthUser) {
    const companyId = await this.getCompanyId(user);
    const list = await this.prisma.vehicle.findMany({
      where: { companyId },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
    });
    return list.map((v) => ({
      ...v,
      photoUrl: v.photoUrl ?? undefined,
    }));
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    return { ...vehicle, photoUrl: vehicle.photoUrl ?? undefined };
  }

  async create(user: AuthUser, dto: CriarVeiculoDto) {
    const companyId = await this.getCompanyId(user);
    const plate = dto.plate.replace(/\s/g, '').toUpperCase().replace(/-/g, '');
    const plateFormatted = plate.length === 7 ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;

    const existing = await this.prisma.vehicle.findFirst({
      where: { companyId, plate: { in: [plate, plateFormatted] } },
    });
    if (existing) {
      throw new ConflictException('Já existe um veículo com esta placa');
    }

    const created = await this.prisma.vehicle.create({
      data: {
        companyId,
        plate: plateFormatted,
        model: dto.model.trim(),
        brand: dto.brand.trim(),
        year: dto.year,
        nickname: dto.nickname?.trim() || undefined,
        status: dto.status ?? 'ACTIVE',
        photoUrl: dto.photoUrl || undefined,
      },
    });
    return { ...created, photoUrl: created.photoUrl ?? undefined };
  }

  async update(user: AuthUser, id: string, dto: AtualizarVeiculoDto) {
    const companyId = await this.getCompanyId(user);
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

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(plateFormatted !== undefined && { plate: plateFormatted }),
        ...(dto.model !== undefined && { model: dto.model.trim() }),
        ...(dto.brand !== undefined && { brand: dto.brand.trim() }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.nickname !== undefined && { nickname: dto.nickname?.trim() || null }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl || null }),
      },
    });
    return { ...updated, photoUrl: updated.photoUrl ?? undefined };
  }

  async remove(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }
    await this.prisma.vehicle.delete({ where: { id } });
    return { success: true };
  }
}
