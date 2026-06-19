/**
 * DATA TRANSFORMATION LAYER (pure, fully unit-tested)
 * ---------------------------------------------------
 * Turns raw API payloads into chart-ready shapes. Keeping this logic pure and
 * separate from the React components means it is trivial to test and reuse, and
 * the components stay dumb. Each function maps ONE contract type to the props
 * its chart needs.
 */
import type {
  CategoricalData,
  HierarchicalData,
  RelationalData,
  TemporalData,
  TreeNode,
} from '@shared/contract';

/* ----------------------------- Categorical ----------------------------- */
export interface CategoricalView {
  unit: string;
  rows: { label: string; value: number }[];
  max: number;
}
export function toCategoricalView(data: CategoricalData): CategoricalView {
  // Sort descending so the comparison reads top-to-bottom.
  const rows = [...data.series].sort((a, b) => b.value - a.value);
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  return { unit: data.unit, rows, max };
}

/* ------------------------------ Temporal ------------------------------- */
export type TrendDirection = 'up' | 'down' | 'flat';
export interface TemporalView {
  metric: string;
  rows: { t: number; label: string; value: number }[];
  trend: TrendDirection;
  changePct: number;
}
export function toTemporalView(data: TemporalData): TemporalView {
  // Parse ISO-8601 -> epoch and sort chronologically (defensive: don't trust order).
  const rows = data.points
    .map((p) => ({
      t: Date.parse(p.timestamp),
      label: new Date(p.timestamp).toLocaleDateString(),
      value: p.value,
    }))
    .sort((a, b) => a.t - b.t);

  const first = rows[0]?.value ?? 0;
  const last = rows[rows.length - 1]?.value ?? 0;
  const changePct = first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100;
  const trend: TrendDirection = changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'flat';

  return { metric: data.metric, rows, trend, changePct: Number(changePct.toFixed(1)) };
}

/* ----------------------------- Hierarchical ---------------------------- */
// Recharts' Treemap wants nested { name, size?, children? } with `size` on leaves.
export interface TreemapNode {
  name: string;
  size?: number;
  children?: TreemapNode[];
}
export interface HierarchicalView {
  nodes: TreemapNode[];
  total: number;
}
function mapNode(node: TreeNode): TreemapNode {
  if (node.children && node.children.length > 0) {
    return { name: node.name, children: node.children.map(mapNode) };
  }
  return { name: node.name, size: node.value ?? 0 };
}
function sumLeaves(node: TreeNode): number {
  if (node.children && node.children.length > 0) {
    return node.children.reduce((s, c) => s + sumLeaves(c), 0);
  }
  return node.value ?? 0;
}
export function toHierarchicalView(data: HierarchicalData): HierarchicalView {
  const root = data.root;
  const nodes = root.children ? root.children.map(mapNode) : [mapNode(root)];
  return { nodes, total: sumLeaves(root) };
}

/* ------------------------------ Relational ----------------------------- */
export interface RelationalView {
  xLabel: string;
  yLabel: string;
  // One series per category (drives multi-colour scatter).
  series: { category: string; points: { x: number; y: number; z: number }[] }[];
  /** Pearson correlation coefficient across ALL points (-1..1). */
  correlation: number;
}
export function pearson(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxy = 0, sx2 = 0, sy2 = 0;
  for (const { x, y } of points) {
    sx += x; sy += y; sxy += x * y; sx2 += x * x; sy2 += y * y;
  }
  const denom = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));
  if (denom === 0) return 0;
  return Number(((n * sxy - sx * sy) / denom).toFixed(3));
}
export function toRelationalView(data: RelationalData): RelationalView {
  const groups = new Map<string, { x: number; y: number; z: number }[]>();
  for (const p of data.points) {
    const key = p.category ?? 'All';
    const arr = groups.get(key) ?? [];
    arr.push({ x: p.x, y: p.y, z: p.z ?? 6 });
    groups.set(key, arr);
  }
  return {
    xLabel: data.xLabel,
    yLabel: data.yLabel,
    series: [...groups.entries()].map(([category, points]) => ({ category, points })),
    correlation: pearson(data.points),
  };
}
