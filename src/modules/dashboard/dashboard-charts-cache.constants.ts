/** Prefixo alinhado a `DashboardService.charts` (cache-manager.wrap). */
export const DASHBOARD_CHARTS_CACHE_KEY_PREFIX = 'dashboard:charts:v1:';

export function dashboardChartsCacheKey(companyId: string): string {
  return `${DASHBOARD_CHARTS_CACHE_KEY_PREFIX}${companyId}`;
}
