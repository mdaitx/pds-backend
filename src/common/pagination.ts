export type PaginationOptions = {
  limit?: number;
  cursor?: string;
  /** 1-based; com `limit` ativa a listagem com offset (GET /recurso?page=1&limit=20) */
  page?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
};

const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function parsePaginationQuery(query: Record<string, unknown>): PaginationOptions {
  const hasPage = query.page != null && query.page !== '';
  if (query.limit == null && query.cursor == null && !hasPage) {
    return {};
  }

  const hasExplicitLimit = query.limit != null && query.limit !== '';
  const resolvedLimit = hasExplicitLimit
    ? Number(query.limit)
    : hasPage
      ? DEFAULT_LIMIT
      : Number(query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(resolvedLimit)
    ? Math.min(Math.max(Math.trunc(resolvedLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = typeof query.cursor === 'string' && query.cursor.trim() ? query.cursor.trim() : undefined;
  const page = hasPage ? (() => {
    const p = Number(query.page);
    if (!Number.isFinite(p) || p < 1) return undefined;
    return Math.trunc(p);
  })() : undefined;

  return { limit: safeLimit, cursor, page };
}

export function paginateResult<T extends { id: string }>(
  rows: T[],
  limit: number,
): PaginatedResult<T> {
  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null,
  };
}
