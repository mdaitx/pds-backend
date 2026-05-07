import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, TripStatus } from '@prisma/client';
import type { AuthUser } from '../../../shared/domain/auth-user.interface';
import { CompanyAccessService } from '../../../core/company-access/company-access.service';
import { NotificationEventsService } from '../../notifications/notification-events.service';
import { SubscriptionService } from '../../subscription/subscription.service';
import { MAX_LIMIT, type PaginationOptions } from '../../../common/pagination';
import type { IViagemRepository } from '../domain/ports/viagem.repository.port';
import type { CriarViagemInput, AtualizarViagemInput } from '../domain/ports/viagem.repository.port';

export const VIAGEM_REPOSITORY = Symbol('IViagemRepository');

/**
 * Caso de uso (Application Layer) - Viagens.
 * Orquestra a lógica de negócio e delega persistência ao repositório.
 */
@Injectable()
export class ViagensService {
  constructor(
    @Inject(VIAGEM_REPOSITORY)
    private readonly viagemRepository: IViagemRepository,
    private readonly companyAccess: CompanyAccessService,
    private readonly notificationEvents: NotificationEventsService,
    private readonly subscription: SubscriptionService,
  ) {}

  private async getCompanyId(user: AuthUser): Promise<string> {
    try {
      return await this.companyAccess.resolveCompanyId(user);
    } catch {
      throw new BadRequestException('Cadastre a empresa antes de criar viagens');
    }
  }

  async findAll(
    user: AuthUser,
    status?: string,
    pagination: PaginationOptions = {},
    search?: string,
  ) {
    if (user.role !== Role.OWNER && user.role !== Role.DRIVER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Acesso negado');
    }
    const tripStatus =
      status && Object.values(TripStatus).includes(status as TripStatus)
        ? (status as TripStatus)
        : undefined;
    const q = search?.trim() || undefined;

    const hasPage = pagination.page != null && pagination.page >= 1;
    const hasLimit = pagination.limit != null;
    if (hasPage && hasLimit) {
      return this.viagemRepository.findListPage(user, {
        status: tripStatus,
        search: q,
        page: pagination.page!,
        pageSize: pagination.limit!,
      });
    }
    if (q && !hasPage) {
      return this.viagemRepository.findListPage(user, {
        status: tripStatus,
        search: q,
        page: 1,
        pageSize: hasLimit ? pagination.limit! : MAX_LIMIT,
      });
    }
    if (hasLimit) {
      return this.viagemRepository.findMany(user, tripStatus, {
        limit: pagination.limit!,
        cursor: pagination.cursor,
      });
    }
    return this.viagemRepository.findMany(user, tripStatus);
  }

  async findOne(user: AuthUser, id: string) {
    const trip = await this.viagemRepository.findById(user, id);
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }
    return trip;
  }

  async startTrip(user: AuthUser, id: string) {
    const trip = await this.viagemRepository.findById(user, id);
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }
    await this.subscription.assertOperationalAccess(trip.companyId);
    if (trip.status !== TripStatus.PENDING) {
      throw new BadRequestException('Só é possível iniciar viagens em “Aguardando”.');
    }
    return this.viagemRepository.update(id, trip.companyId, { status: TripStatus.IN_PROGRESS });
  }

  async setDeliveryReceipt(user: AuthUser, id: string, url: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      throw new BadRequestException('Informe a URL do comprovante de entrega.');
    }
    const trip = await this.viagemRepository.findById(user, id);
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }
    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Não é possível alterar o comprovante neste status da viagem.');
    }
    await this.subscription.assertOperationalAccess(trip.companyId);
    return this.viagemRepository.update(id, trip.companyId, { deliveryReceiptUrl: trimmed });
  }

  async create(user: AuthUser, dto: CriarViagemInput) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);

    const vehicleOk = await this.viagemRepository.validateVehicle(dto.vehicleId, companyId);
    if (!vehicleOk) {
      throw new BadRequestException('Veículo não encontrado');
    }

    const driverOk = await this.viagemRepository.validateDriver(dto.driverId, companyId);
    if (!driverOk) {
      throw new BadRequestException('Motorista não encontrado');
    }

    if (dto.status === TripStatus.COMPLETED) {
      throw new BadRequestException(
        'Viagem não pode ser criada como concluída. Finalize pela rota de acerto após a viagem.',
      );
    }

    const created = await this.viagemRepository.create(companyId, {
      ...dto,
      startDate: dto.startDate instanceof Date ? dto.startDate : new Date(dto.startDate),
      endDate: dto.endDate ? (dto.endDate instanceof Date ? dto.endDate : new Date(dto.endDate)) : undefined,
    });
    void this.notificationEvents.onTripCreated(created.id);
    return created;
  }

  async update(user: AuthUser, id: string, dto: AtualizarViagemInput) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const trip = await this.viagemRepository.findById(user, id);
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }

    if (dto.vehicleId) {
      const vehicleOk = await this.viagemRepository.validateVehicle(dto.vehicleId, companyId);
      if (!vehicleOk) throw new BadRequestException('Veículo não encontrado');
    }
    if (dto.driverId) {
      const driverOk = await this.viagemRepository.validateDriver(dto.driverId, companyId);
      if (!driverOk) throw new BadRequestException('Motorista não encontrado');
    }

    if (
      dto.status === TripStatus.COMPLETED &&
      trip.status !== TripStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Para concluir a viagem e gerar o acerto, use POST /settlements/finalize/:tripId (km final opcional). Não altere o status manualmente para Concluída.',
      );
    }

    const updateData: AtualizarViagemInput = { ...dto };
    if (dto.startDate && !(dto.startDate instanceof Date)) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate !== undefined && dto.endDate !== null && !(dto.endDate instanceof Date)) {
      updateData.endDate = new Date(dto.endDate);
    }

    return this.viagemRepository.update(id, companyId, updateData);
  }

  async remove(user: AuthUser, id: string) {
    const companyId = await this.getCompanyId(user);
    await this.subscription.assertOperationalAccess(companyId);
    const trip = await this.viagemRepository.findById(user, id);
    if (!trip) {
      throw new NotFoundException('Viagem não encontrada');
    }
    await this.viagemRepository.delete(id, companyId);
    return { success: true };
  }
}
