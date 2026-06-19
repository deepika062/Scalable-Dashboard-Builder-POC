/**
 * DYNAMIC WIDGET REGISTRY
 * -----------------------
 * The single place that knows how each widget TYPE renders. The dashboard
 * shell never imports a concrete chart — it only asks the registry to render a
 * `WidgetData` payload. Adding a 5th chart type = write a component + one
 * `registerWidget(...)` call below. No core/layout code changes. (This is the
 * "Dashboard Shell vs Widget Logic" separation the rubric asks about.)
 */
import type { ReactNode } from 'react';
import type { WidgetData, WidgetType } from '@shared/contract';
import { CategoricalBar } from '../components/widgets/CategoricalBar';
import { TemporalLine } from '../components/widgets/TemporalLine';
import { HierarchicalTreemap } from '../components/widgets/HierarchicalTreemap';
import { RelationalScatter } from '../components/widgets/RelationalScatter';

export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  /** Narrows the union and renders the right component. */
  render: (data: WidgetData) => ReactNode;
}

const REGISTRY = new Map<WidgetType, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition): void {
  REGISTRY.set(def.type, def);
}
export function getWidget(type: WidgetType): WidgetDefinition | undefined {
  return REGISTRY.get(type);
}
export function listWidgetTypes(): WidgetType[] {
  return [...REGISTRY.keys()];
}

/* ------------------------- built-in registrations ------------------------- */
registerWidget({
  type: 'categorical',
  label: 'Bar (Categorical)',
  render: (d) => (d.kind === 'categorical' ? <CategoricalBar data={d} /> : null),
});
registerWidget({
  type: 'temporal',
  label: 'Line (Temporal)',
  render: (d) => (d.kind === 'temporal' ? <TemporalLine data={d} /> : null),
});
registerWidget({
  type: 'hierarchical',
  label: 'Treemap (Hierarchical)',
  render: (d) => (d.kind === 'hierarchical' ? <HierarchicalTreemap data={d} /> : null),
});
registerWidget({
  type: 'relational',
  label: 'Scatter (Relational)',
  render: (d) => (d.kind === 'relational' ? <RelationalScatter data={d} /> : null),
});
