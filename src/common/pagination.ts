export type PaginationOptions = {
  limit?: number;
  cursor?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePaginationQuery(query: Record<string, unknown>): PaginationOptions {
  if (query.limit == null && query.cursor == null) {
    return {};
  }

  const rawLimit = Number(query.limit ?? DEFAULT_LIMIT);
  const safeLimit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = typeof query.cursor === 'string' && query.cursor.trim() ? query.cursor.trim() : undefined;

  return { limit: safeLimit, cursor };
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
