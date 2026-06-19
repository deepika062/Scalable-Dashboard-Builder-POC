/**
 * EXTENSIBLE MOCK ENGINE
 * ----------------------
 * Datasets are produced by registered generators. To add a new dataset you
 * call `register(...)` once — nothing else in the system changes. Generators
 * receive a seeded PRNG so output is deterministic (important for unit tests)
 * while still looking varied.
 */
import type {
  CategoricalData,
  DataSourceMeta,
  HierarchicalData,
  RelationalData,
  TemporalData,
  TreeNode,
  WidgetData,
} from '../../shared/contract.js';

/* --------------------------- seeded PRNG --------------------------- */
// mulberry32 — tiny, fast, deterministic. Same seed => same dataset.
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const randInt = (rng: Rng, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;
const round = (n: number, dp = 2) => Number(n.toFixed(dp));

/* --------------------------- generator registry --------------------------- */
type Generator = (rng: Rng) => WidgetData;
interface SourceDef {
  meta: DataSourceMeta;
  generate: Generator;
}

const registry = new Map<string, SourceDef>();

/** Public extension point: register a new dataset generator. */
export function register(def: SourceDef): void {
  registry.set(def.meta.id, def);
}

export function listDataSources(): DataSourceMeta[] {
  return [...registry.values()].map((s) => s.meta);
}

export function hasDataSource(id: string): boolean {
  return registry.has(id);
}

/**
 * Produce a dataset. `seed` keeps output deterministic; when omitted we vary
 * by clock so repeated calls look "live".
 */
export function generateData(id: string, seed?: number): WidgetData {
  const def = registry.get(id);
  if (!def) throw new Error(`Unknown data source: "${id}"`);
  const rng = makeRng(seed ?? Date.now() % 2147483647);
  return def.generate(rng);
}

/* ============================================================= *
 *  Built-in generators — one per visualization family (and more,
 *  to prove the registry is genuinely dynamic).
 * ============================================================= */

/* 1. CATEGORICAL — simple key/value comparison */
function categorical(unit: string, labels: string[], max: number): (rng: Rng) => CategoricalData {
  return (rng): CategoricalData => ({
    kind: 'categorical',
    unit,
    series: labels.map((label) => ({ label, value: randInt(rng, 5, max) })),
  });
}
register({
  meta: { id: 'revenue-by-region', label: 'Revenue by Region', type: 'categorical' },
  generate: categorical('USD (k)', ['North', 'South', 'East', 'West', 'Central'], 900),
});
register({
  meta: { id: 'sales-by-category', label: 'Sales by Product Category', type: 'categorical' },
  generate: categorical('Units', ['Laptops', 'Phones', 'Tablets', 'Audio', 'Wearables'], 1200),
});

/* 2. TEMPORAL — ISO-8601 time series with a trend + noise */
function temporal(metric: string, days: number, base: number, trend: number): (rng: Rng) => TemporalData {
  return (rng): TemporalData => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const points = Array.from({ length: days }, (_, i) => {
      const ts = new Date(now - (days - 1 - i) * dayMs);
      const noise = (rng() - 0.5) * base * 0.3;
      return {
        timestamp: ts.toISOString(), // ISO-8601
        value: round(Math.max(0, base + trend * i + noise)),
      };
    });
    return { kind: 'temporal', metric, points };
  };
}
register({
  meta: { id: 'daily-active-users', label: 'Daily Active Users (30d)', type: 'temporal' },
  generate: temporal('DAU', 30, 4000, 60),
});
register({
  meta: { id: 'cpu-utilization', label: 'CPU Utilisation % (14d)', type: 'temporal' },
  generate: temporal('CPU %', 14, 45, 1.2),
});

/* 3. HIERARCHICAL — nested tree (part-to-whole) */
register({
  meta: { id: 'org-headcount', label: 'Org Headcount Breakdown', type: 'hierarchical' },
  generate: (rng): HierarchicalData => {
    const leaf = (name: string, min: number, max: number): TreeNode => ({
      name,
      value: randInt(rng, min, max),
    });
    const root: TreeNode = {
      name: 'Company',
      children: [
        { name: 'Engineering', children: [leaf('Frontend', 8, 20), leaf('Backend', 8, 20), leaf('Platform', 4, 12)] },
        { name: 'Sales', children: [leaf('Inbound', 5, 15), leaf('Outbound', 5, 15)] },
        { name: 'Operations', children: [leaf('Support', 6, 18), leaf('Finance', 3, 9), leaf('HR', 2, 6)] },
      ],
    };
    return { kind: 'hierarchical', root };
  },
});
register({
  meta: { id: 'storage-breakdown', label: 'Disk Storage Breakdown', type: 'hierarchical' },
  generate: (rng): HierarchicalData => ({
    kind: 'hierarchical',
    root: {
      name: 'Disk',
      children: [
        { name: 'System', children: [{ name: 'OS', value: randInt(rng, 20, 60) }, { name: 'Apps', value: randInt(rng, 10, 40) }] },
        { name: 'User', children: [{ name: 'Media', value: randInt(rng, 50, 200) }, { name: 'Docs', value: randInt(rng, 5, 30) }] },
        { name: 'Free', value: randInt(rng, 100, 400) },
      ],
    },
  }),
});

/* 4. RELATIONAL — coordinate-based correlation (scatter) */
register({
  meta: { id: 'height-weight', label: 'Height vs Weight (correlation)', type: 'relational' },
  generate: (rng): RelationalData => ({
    kind: 'relational',
    xLabel: 'Height (cm)',
    yLabel: 'Weight (kg)',
    points: Array.from({ length: 60 }, () => {
      const height = randInt(rng, 150, 200);
      const weight = round((height - 100) * 0.9 + (rng() - 0.5) * 20);
      return {
        x: height,
        y: weight,
        z: randInt(rng, 18, 32), // BMI bucket -> bubble size
        category: rng() > 0.5 ? 'Group A' : 'Group B',
      };
    }),
  }),
});
register({
  meta: { id: 'ad-spend-vs-revenue', label: 'Ad Spend vs Revenue', type: 'relational' },
  generate: (rng): RelationalData => ({
    kind: 'relational',
    xLabel: 'Ad Spend (USD k)',
    yLabel: 'Revenue (USD k)',
    points: Array.from({ length: 50 }, () => {
      const spend = randInt(rng, 1, 100);
      return {
        x: spend,
        y: round(spend * (1.8 + rng()) + (rng() - 0.5) * 30),
        z: randInt(rng, 1, 10),
        category: ['Search', 'Social', 'Display'][randInt(rng, 0, 2)],
      };
    }),
  }),
});

/* A deliberately UNSTABLE source so the frontend's per-widget error handling
 * (resiliency requirement) can be demonstrated live. */
register({
  meta: { id: 'unstable-sensor', label: 'Unstable Sensor (fails ~50%)', type: 'temporal' },
  generate: (rng): TemporalData => {
    if (rng() < 0.5) throw new Error('Sensor offline — upstream timeout');
    return temporal('Sensor', 20, 100, -0.5)(rng);
  },
});
