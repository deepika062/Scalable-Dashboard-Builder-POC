/**
 * API client. Every response is validated with the SHARED Zod schema, so a
 * malformed/partial payload (or a drifted backend) is caught here and surfaced
 * as a clean error instead of crashing a chart deep in the render tree.
 */
import type { DataSourceMeta, RegistryResponse, WidgetDataResponse } from '@shared/contract';
import { widgetDataResponseSchema } from '@shared/validation';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

export async function fetchRegistry(): Promise<DataSourceMeta[]> {
  const res = await fetch(`${BASE}/registry`);
  if (!res.ok) throw new Error(`Registry request failed (${res.status})`);
  const json = (await res.json()) as RegistryResponse;
  return json.dataSources;
}

export async function fetchWidgetData(
  widgetId: string,
  dataSource: string,
): Promise<WidgetDataResponse> {
  const res = await fetch(
    `${BASE}/widgets/${encodeURIComponent(dataSource)}/data?widgetId=${encodeURIComponent(widgetId)}`,
  );
  if (!res.ok) {
    // Try to extract the server's error message; fall back to status text.
    const msg = await res
      .json()
      .then((b) => (b as { error?: string }).error)
      .catch(() => undefined);
    throw new Error(msg ?? `Request failed (${res.status})`);
  }

  const json: unknown = await res.json();
  const parsed = widgetDataResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Received malformed data that does not match the schema');
  }
  return parsed.data;
}
