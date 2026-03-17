/**
 * Módulo global do Supabase: cliente server-side para Auth e Storage.
 * Usado pelo AuthService para validar JWT e operações de recuperação de senha.
 */
import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
