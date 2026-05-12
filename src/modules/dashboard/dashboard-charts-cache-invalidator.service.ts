import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import {
  dashboardChartsCacheKey,
  dashboardSummaryCacheKey,
  reportsBumpCacheKey,
} from './dashboard-charts-cache.constants';

/** TTL (ms) da chave de bump de relatórios — só precisa viver o suficiente para versões antigas expirarem. */
const REPORTS_BUMP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Invalida caches do dashboard e relatórios quando viagens, despesas ou acertos mudam.
 */
@Injectable()
export class DashboardChartsCacheInvalidator {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async invalidateCompany(companyId: string): Promise<void> {
    await this.cacheManager.del(dashboardChartsCacheKey(companyId));
    await this.cacheManager.del(dashboardSummaryCacheKey(companyId));
    const bumpKey = reportsBumpCacheKey(companyId);
    const prev = (await this.cacheManager.get<number>(bumpKey)) ?? 0;
    await this.cacheManager.set(bumpKey, prev + 1, REPORTS_BUMP_TTL_MS);
  }
}
