/** Prefixo alinhado a `DashboardService.charts` (cache-manager.wrap). */
export const DASHBOARD_CHARTS_CACHE_KEY_PREFIX = 'dashboard:charts:v1:';

export function dashboardChartsCacheKey(companyId: string): string {
  return `${DASHBOARD_CHARTS_CACHE_KEY_PREFIX}${companyId}`;
}

/** Resumo do painel (OWNER/ADMIN) — invalidado junto aos gráficos. */
export const DASHBOARD_SUMMARY_CACHE_KEY_PREFIX = 'dashboard:summary:v1:';

export function dashboardSummaryCacheKey(companyId: string): string {
  return `${DASHBOARD_SUMMARY_CACHE_KEY_PREFIX}${companyId}`;
}

/** Versão lógica do cache de relatórios: incrementar invalida todas as chaves antigas (sem wildcard no store). */
export const REPORTS_BUMP_KEY_PREFIX = 'reports:bump:v1:';

export function reportsBumpCacheKey(companyId: string): string {
  return `${REPORTS_BUMP_KEY_PREFIX}${companyId}`;
}
