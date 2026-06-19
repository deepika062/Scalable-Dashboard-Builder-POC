import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

describe('widget API (integration)', () => {
  it('lists the data-source registry', async () => {
    const res = await request(app).get('/api/registry');
    expect(res.status).toBe(200);
    expect(res.body.dataSources.length).toBeGreaterThanOrEqual(4);
  });

  it('serves a single widget with contract-shaped data', async () => {
    const res = await request(app).get('/api/widgets/revenue-by-region/data');
    expect(res.status).toBe(200);
    expect(res.body.data.kind).toBe('categorical');
    expect(Array.isArray(res.body.data.series)).toBe(true);
  });

  it('404s for an unknown single source', async () => {
    const res = await request(app).get('/api/widgets/nope/data');
    expect(res.status).toBe(404);
  });

  it('serves a batch and isolates per-widget failures', async () => {
    const res = await request(app)
      .post('/api/widgets/batch')
      .send({
        requests: [
          { widgetId: 'w1', type: 'categorical', dataSource: 'revenue-by-region' },
          { widgetId: 'w2', type: 'temporal', dataSource: 'does-not-exist' },
        ],
      });
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.results.map((r: any) => [r.widgetId, r]));
    expect(byId.w1.ok).toBe(true);
    expect(byId.w2.ok).toBe(false); // one failure does not break the other
    expect(byId.w2.error).toMatch(/Unknown data source/);
  });

  it('rejects a malformed batch request with 400', async () => {
    const res = await request(app).post('/api/widgets/batch').send({ requests: [] });
    expect(res.status).toBe(400);
  });
});
