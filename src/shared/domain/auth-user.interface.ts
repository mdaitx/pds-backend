import { Role } from '@prisma/client';

/**
 * Usuário autenticado após validação do JWT.
 * Interface de domínio compartilhada para evitar acoplamento com AuthService.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  supabaseUserId: string;
  /** Empresa da frota (admin / co-proprietário); dono titular costuma resolver via Company.ownerId. */
  companyId?: string | null;
}
