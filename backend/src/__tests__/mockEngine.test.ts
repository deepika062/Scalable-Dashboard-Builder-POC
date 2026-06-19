import { describe, it, expect } from 'vitest';
import { generateData, listDataSources, hasDataSource } from '../mockEngine.js';
import { widgetDataSchema } from '../schemas.js';

describe('mock engine', () => {
  it('exposes at least one data source per visualization family', () => {
    const types = new Set(listDataSources().map((s) => s.type));
    expect(types).toEqual(
      new Set(['categorical', 'temporal', 'hierarchical', 'relational']),
    );
  });

  it('every registered source produces data that satisfies the contract', () => {
    for (const src of listDataSources()) {
      if (src.id === 'unstable-sensor') continue; // intentionally throws sometimes
      const data = generateData(src.id, 42);
      // Throws if the payload violates the Zod schema.
      expect(() => widgetDataSchema.parse(data)).not.toThrow();
      expect(data.kind).toBe(src.type);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateData('revenue-by-region', 7);
    const b = generateData('revenue-by-region', 7);
    expect(a).toEqual(b);
  });

  it('emits ISO-8601 timestamps for temporal data', () => {
    const data = generateData('daily-active-users', 1);
    if (data.kind !== 'temporal') throw new Error('expected temporal');
    for (const p of data.points) {
      expect(new Date(p.timestamp).toISOString()).toBe(p.timestamp);
    }
  });

  it('throws for unknown sources', () => {
    expect(hasDataSource('does-not-exist')).toBe(false);
    expect(() => generateData('does-not-exist')).toThrow(/Unknown data source/);
  });
});
