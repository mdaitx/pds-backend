import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
        auth: { persistSession: false },
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
