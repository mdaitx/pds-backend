import { TripStatus } from '@prisma/client';
import type { PaginatedResult, PaginationOptions } from '../../../../common/pagination';
import type { AuthUser } from '../../../../shared/domain/auth-user.interface';

/** Listagem com offset, totais e contadores para abas (mesma busca, sem filtro de status) */
export type ListTripsPageInput = {
  status?: TripStatus;
  search?: string;
  page: number;
  pageSize: number;
};

export type TripsListResult = {
  items: ViagemComRelacoes[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    all: number;
    byStatus: Record<TripStatus, number>;
  };
};

/** Dados para criar uma viagem (camada de aplicação) */
export interface CriarViagemInput {
  vehicleId: string;
  driverId: string;
  clientName?: string;
  origin?: string;
  destination?: string;
  startDate: Date;
  endDate?: Date;
  freightValue?: number;
  initialKm?: number;
  loadType?: string;
  notes?: string;
  status?: TripStatus;
}

/** Dados para atualizar uma viagem (parcial) */
export interface AtualizarViagemInput {
  vehicleId?: string;
  driverId?: string;
  clientName?: string;
  origin?: string;
  destination?: string;
  startDate?: Date;
  endDate?: Date | null;
  freightValue?: number;
  initialKm?: number;
  loadType?: string;
  notes?: string;
  status?: TripStatus;
}

/** Representação da viagem retornada pela camada de persistência */
export interface ViagemComRelacoes {
  id: string;
  code: string;
  vehicleId: string;
  driverId: string;
  companyId: string;
  clientName: string | null;
  origin: string | null;
  destination: string | null;
  startDate: Date;
  endDate: Date | null;
  freightValue: number | null;
  initialKm: number | null;
  finalKm: number | null;
  loadType: string | null;
  notes: string | null;
  status: TripStatus;
  vehicle?: { id: string; plate: string; brand: string; model: string; vehicleType?: string };
  driver?: { id: string; name: string };
}

/**
 * Porta (interface) do repositório de viagens.
 * A camada de aplicação depende desta interface, não da implementação Prisma.
 */
export interface IViagemRepository {
  getCompanyIdByOwner(userId: string): Promise<string>;
  generateTripCode(companyId: string): Promise<string>;
  findMany(user: AuthUser, status?: TripStatus): Promise<ViagemComRelacoes[]>;
  findMany(
    user: AuthUser,
    status: TripStatus | undefined,
    pagination: Required<Pick<PaginationOptions, 'limit'>> & Pick<PaginationOptions, 'cursor'>,
  ): Promise<PaginatedResult<ViagemComRelacoes>>;
  findListPage(user: AuthUser, input: ListTripsPageInput): Promise<TripsListResult>;
  findById(user: AuthUser, id: string): Promise<ViagemComRelacoes | null>;
  create(companyId: string, data: CriarViagemInput): Promise<ViagemComRelacoes>;
  update(id: string, companyId: string, data: AtualizarViagemInput): Promise<ViagemComRelacoes>;
  delete(id: string, companyId: string): Promise<void>;
  validateVehicle(vehicleId: string, companyId: string): Promise<boolean>;
  validateDriver(driverId: string, companyId: string): Promise<boolean>;
}
