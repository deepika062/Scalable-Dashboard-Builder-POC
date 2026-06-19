/**
 * SHARED API CONTRACT
 * -------------------
 * This file is the single source of truth for the data structures exchanged
 * between the backend and the frontend. Both projects import these types, so
 * any change to the contract is enforced by the compiler on BOTH sides
 * (end-to-end type safety).
 *
 * Each visualization type consumes a UNIQUE data structure (see the assignment
 * matrix): Categorical, Temporal, Hierarchical, Relational.
 */

/** The four distinct visualization families. */
export type WidgetType = 'categorical' | 'temporal' | 'hierarchical' | 'relational';

export const WIDGET_TYPES: WidgetType[] = [
  'categorical',
  'temporal',
  'hierarchical',
  'relational',
];

/* ------------------------------------------------------------------ *
 * 1. CATEGORICAL  — Comparison — simple key/value pairs
 * ------------------------------------------------------------------ */
export interface CategoricalDatum {
  label: string;
  value: number;
}
export interface CategoricalData {
  kind: 'categorical';
  /** What the values represent, e.g. "Revenue by region (USD)". */
  unit: string;
  series: CategoricalDatum[];
}

/* ------------------------------------------------------------------ *
 * 2. TEMPORAL — Time-series — ISO-8601 timestamps + trend analysis
 * ------------------------------------------------------------------ */
export interface TemporalPoint {
  /** ISO-8601 timestamp, e.g. "2026-06-19T00:00:00.000Z". */
  timestamp: string;
  value: number;
}
export interface TemporalData {
  kind: 'temporal';
  metric: string;
  points: TemporalPoint[];
}

/* ------------------------------------------------------------------ *
 * 3. HIERARCHICAL — Part-to-whole — nested tree (Treemap / Sunburst)
 * ------------------------------------------------------------------ */
export interface TreeNode {
  name: string;
  /** Leaf nodes carry a value; internal nodes aggregate their children. */
  value?: number;
  children?: TreeNode[];
}
export interface HierarchicalData {
  kind: 'hierarchical';
  root: TreeNode;
}

/* ------------------------------------------------------------------ *
 * 4. RELATIONAL — Correlation — coordinate-based (Scatter / Sankey)
 * ------------------------------------------------------------------ */
export interface RelationalPoint {
  x: number;
  y: number;
  /** Optional magnitude (bubble size). */
  z?: number;
  /** Optional grouping for colouring. */
  category?: string;
}
export interface RelationalData {
  kind: 'relational';
  xLabel: string;
  yLabel: string;
  points: RelationalPoint[];
}

/**
 * Discriminated union of every chart payload. The `kind` field is the
 * discriminant, which lets the frontend narrow types safely at runtime.
 */
export type WidgetData =
  | CategoricalData
  | TemporalData
  | HierarchicalData
  | RelationalData;

/* ------------------------------------------------------------------ *
 * API envelopes
 * ------------------------------------------------------------------ */

/** Wraps a single widget's data plus metadata. */
export interface WidgetDataResponse {
  widgetId: string;
  dataSource: string;
  data: WidgetData;
  /** ISO-8601 generation time — useful for cache/data-drift discussions. */
  generatedAt: string;
}

/** One entry in a batch request. */
export interface WidgetDataRequest {
  widgetId: string;
  type: WidgetType;
  /** Names a generator in the backend mock engine. */
  dataSource: string;
}

export interface BatchDataRequest {
  requests: WidgetDataRequest[];
}

/**
 * Batch responses are returned per-widget so that ONE failing widget never
 * fails the whole dashboard (resiliency requirement).
 */
export type BatchDataItem =
  | { widgetId: string; ok: true; response: WidgetDataResponse }
  | { widgetId: string; ok: false; error: string };

export interface BatchDataResponse {
  results: BatchDataItem[];
}

/** Metadata describing a data source the mock engine can serve. */
export interface DataSourceMeta {
  id: string;
  label: string;
  type: WidgetType;
}

export interface RegistryResponse {
  dataSources: DataSourceMeta[];
}

/* ------------------------------------------------------------------ *
 * Dashboard configuration (frontend global state, persisted)
 * ------------------------------------------------------------------ */

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  /** Maps the widget to a backend data source. */
  dataSource: string;
}

/** react-grid-layout item shape (subset we persist). */
export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardConfig {
  widgets: Record<string, WidgetConfig>;
  layout: LayoutItem[];
}
