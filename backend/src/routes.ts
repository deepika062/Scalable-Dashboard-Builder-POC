/**
 * HTTP routes. Every response is validated against the Zod contract before it
 * leaves the server, so the API can never emit data that violates the schema.
 */
import { Router, type Request, type Response } from 'express';
import type {
  BatchDataItem,
  BatchDataResponse,
  RegistryResponse,
  WidgetDataResponse,
} from '../../shared/contract.js';
import { generateData, hasDataSource, listDataSources } from './mockEngine.js';
import { batchRequestSchema, widgetDataSchema } from './schemas.js';
import { delay, mapWithConcurrency } from './concurrency.js';

export const router = Router();

const MAX_CONCURRENCY = 4;

/** Build + validate a single widget response (throws on unknown/failed source). */
function buildResponse(widgetId: string, dataSource: string): WidgetDataResponse {
  const raw = generateData(dataSource);
  // Output guard: prove the payload matches the contract before sending.
  const data = widgetDataSchema.parse(raw);
  return {
    widgetId,
    dataSource,
    data,
    generatedAt: new Date().toISOString(),
  };
}

/** Health check. */
router.get('/health', (_req, res) => res.json({ status: 'ok' }));

/** Registry of available data sources (drives the "Add widget" picker). */
router.get('/registry', (_req, res: Response<RegistryResponse>) => {
  res.json({ dataSources: listDataSources() });
});

/** Single widget data — GET /api/widgets/:dataSource/data */
router.get('/widgets/:dataSource/data', async (req: Request, res: Response) => {
  const dataSource = String(req.params.dataSource);
  const widgetId = String(req.query.widgetId ?? dataSource);

  if (!hasDataSource(dataSource)) {
    return res.status(404).json({ error: `Unknown data source: "${dataSource}"` });
  }
  await delay(150 + Math.floor(Math.random() * 250)); // simulate latency
  try {
    return res.json(buildResponse(widgetId, dataSource));
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }
});

/**
 * Batch endpoint — POST /api/widgets/batch
 * Serves many widgets concurrently (bounded) and returns a PER-WIDGET result.
 * One failing widget yields `{ ok: false }` for that item only; the rest still
 * succeed. This is the backbone of the dashboard's resiliency.
 */
router.post('/widgets/batch', async (req: Request, res: Response) => {
  const parsed = batchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid batch request', details: parsed.error.flatten() });
  }

  const results = await mapWithConcurrency<typeof parsed.data.requests[number], BatchDataItem>(
    parsed.data.requests,
    MAX_CONCURRENCY,
    async ({ widgetId, dataSource }) => {
      await delay(150 + Math.floor(Math.random() * 250));
      if (!hasDataSource(dataSource)) {
        return { widgetId, ok: false, error: `Unknown data source: "${dataSource}"` };
      }
      try {
        return { widgetId, ok: true, response: buildResponse(widgetId, dataSource) };
      } catch (err) {
        return { widgetId, ok: false, error: (err as Error).message };
      }
    },
  );

  const body: BatchDataResponse = { results };
  return res.json(body);
});
