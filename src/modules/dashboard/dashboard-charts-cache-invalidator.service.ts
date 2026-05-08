import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { dashboardChartsCacheKey } from './dashboard-charts-cache.constants';

/**
 * Invalida o cache HTTP de gráficos (TTL) quando viagens ou despesas mudam.
 */
@Injectable()
export class DashboardChartsCacheInvalidator {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async invalidateCompany(companyId: string): Promise<void> {
    await this.cacheManager.del(dashboardChartsCacheKey(companyId));
  }
}
