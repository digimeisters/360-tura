/**
 * Supabase (PostgREST) vraća najviše 1000 redova po upitu, ma koliki bio
 * .limit() - analitika i izveštaji su zato tiho brojali samo poslednjih 1000
 * događaja. Ovo čita stranu po stranu (.range) dok ne stigne do kraja ili do
 * `max` redova.
 */

const PAGE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PageResult<T>,
  max: number
): Promise<{ data: T[]; error: { message: string; code?: string } | null; truncated: boolean }> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const to = Math.min(from + PAGE, max) - 1;
    const { data, error } = await page(from, to);
    if (error) return { data: rows, error, truncated: false };
    rows.push(...(data ?? []));
    if (!data || data.length < to - from + 1) return { data: rows, error: null, truncated: false };
  }
  return { data: rows, error: null, truncated: true };
}
