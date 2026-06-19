import { describe, it, expect } from 'vitest';
import type {
  CategoricalData,
  HierarchicalData,
  RelationalData,
  TemporalData,
} from '@shared/contract';
import {
  pearson,
  toCategoricalView,
  toHierarchicalView,
  toRelationalView,
  toTemporalView,
} from '../registry/transforms';

describe('toCategoricalView', () => {
  it('sorts descending and reports the max', () => {
    const data: CategoricalData = {
      kind: 'categorical',
      unit: 'Units',
      series: [
        { label: 'A', value: 10 },
        { label: 'B', value: 30 },
        { label: 'C', value: 20 },
      ],
    };
    const view = toCategoricalView(data);
    expect(view.rows.map((r) => r.label)).toEqual(['B', 'C', 'A']);
    expect(view.max).toBe(30);
  });
});

describe('toTemporalView', () => {
  const mk = (pairs: [string, number][]): TemporalData => ({
    kind: 'temporal',
    metric: 'm',
    points: pairs.map(([timestamp, value]) => ({ timestamp, value })),
  });

  it('sorts by timestamp regardless of input order', () => {
    const view = toTemporalView(
      mk([
        ['2026-01-03T00:00:00.000Z', 3],
        ['2026-01-01T00:00:00.000Z', 1],
        ['2026-01-02T00:00:00.000Z', 2],
      ]),
    );
    expect(view.rows.map((r) => r.value)).toEqual([1, 2, 3]);
  });

  it('detects an upward trend', () => {
    const view = toTemporalView(
      mk([
        ['2026-01-01T00:00:00.000Z', 100],
        ['2026-01-02T00:00:00.000Z', 150],
      ]),
    );
    expect(view.trend).toBe('up');
    expect(view.changePct).toBe(50);
  });

  it('detects a downward trend', () => {
    const view = toTemporalView(
      mk([
        ['2026-01-01T00:00:00.000Z', 200],
        ['2026-01-02T00:00:00.000Z', 100],
      ]),
    );
    expect(view.trend).toBe('down');
    expect(view.changePct).toBe(-50);
  });

  it('treats negligible change as flat', () => {
    const view = toTemporalView(
      mk([
        ['2026-01-01T00:00:00.000Z', 100],
        ['2026-01-02T00:00:00.000Z', 100.5],
      ]),
    );
    expect(view.trend).toBe('flat');
  });
});

describe('toHierarchicalView', () => {
  it('flattens a tree and sums leaf values', () => {
    const data: HierarchicalData = {
      kind: 'hierarchical',
      root: {
        name: 'root',
        children: [
          { name: 'A', children: [{ name: 'A1', value: 5 }, { name: 'A2', value: 10 }] },
          { name: 'B', value: 15 },
        ],
      },
    };
    const view = toHierarchicalView(data);
    expect(view.total).toBe(30);
    expect(view.nodes).toHaveLength(2);
    expect(view.nodes[0]?.children).toHaveLength(2);
    expect(view.nodes[1]?.size).toBe(15);
  });
});

describe('pearson + toRelationalView', () => {
  it('returns +1 for a perfectly positive correlation', () => {
    expect(
      pearson([
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
      ]),
    ).toBe(1);
  });

  it('returns -1 for a perfectly negative correlation', () => {
    expect(
      pearson([
        { x: 1, y: 6 },
        { x: 2, y: 4 },
        { x: 3, y: 2 },
      ]),
    ).toBe(-1);
  });

  it('groups points by category', () => {
    const data: RelationalData = {
      kind: 'relational',
      xLabel: 'x',
      yLabel: 'y',
      points: [
        { x: 1, y: 1, category: 'A' },
        { x: 2, y: 2, category: 'B' },
        { x: 3, y: 3, category: 'A' },
      ],
    };
    const view = toRelationalView(data);
    expect(view.series).toHaveLength(2);
    expect(view.series.find((s) => s.category === 'A')?.points).toHaveLength(2);
  });
});
