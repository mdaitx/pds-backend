import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Serviço Supabase no backend: usado para validar JWTs e operações de Auth/Storage.
 *
 * - Use SUPABASE_SERVICE_ROLE_KEY apenas no servidor; nunca exponha no frontend.
 * - getAuth(): validação de token (getUser), reset de senha, etc.
 * - getStorage(): upload de arquivos com permissões server-side.
 */
@Injectable()
export class SupabaseService {
  private _client: SupabaseClient | null = null;

  getClient(): SupabaseClient {
    if (!this._client) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set');
      }
      this._client = createClient(url, key, {
        auth: { persistSession: false }, // backend não mantém sessão de usuário
      });
    }
    return this._client;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuth(): any {
    return this.getClient().auth;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStorage(): any {
    return this.getClient().storage;
  }
}
