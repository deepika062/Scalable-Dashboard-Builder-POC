/**
 * GLOBAL DASHBOARD STATE (Zustand + persist)
 * ------------------------------------------
 * Holds the three things the assignment calls out:
 *  - widget configurations  (`widgets`)
 *  - layout positions       (`layout`)
 *  - data-source mappings    (`widgets[id].dataSource`)
 *
 * `persist` transparently saves the whole config to LocalStorage, so the
 * dashboard survives reloads. Components subscribe with narrow selectors, so a
 * change to one slice does not re-render unrelated components (performance).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DashboardConfig,
  LayoutItem,
  WidgetConfig,
  WidgetType,
} from '@shared/contract';

interface DashboardStore extends DashboardConfig {
  addWidget: (input: { type: WidgetType; dataSource: string; title: string }) => void;
  removeWidget: (id: string) => void;
  setLayout: (layout: LayoutItem[]) => void;
  /** First-run only: seed the sample set if the dashboard is empty. */
  seedDefaults: () => void;
  /** Toolbar action: always (re)load the sample dashboard. */
  loadSampleSet: () => void;
  reset: () => void;
}

const COLS = 12;
const DEFAULT_SIZE = { w: 6, h: 8 }; // half-width, tall enough for a chart

/** The 4 sample widgets — one per visualization family. */
const SAMPLE_WIDGETS: Omit<WidgetConfig, 'id'>[] = [
  { type: 'categorical', dataSource: 'revenue-by-region', title: 'Revenue by Region' },
  { type: 'temporal', dataSource: 'daily-active-users', title: 'Daily Active Users' },
  { type: 'hierarchical', dataSource: 'org-headcount', title: 'Org Headcount' },
  { type: 'relational', dataSource: 'height-weight', title: 'Height vs Weight' },
];

/**
 * Find the first free grid slot scanning left-to-right, top-to-bottom, so
 * widgets FLOW across the full width (and fill gaps left by removed widgets)
 * instead of stacking in a single left-hand column.
 */
function nextPosition(layout: LayoutItem[], w: number, h: number): { x: number; y: number } {
  const overlaps = (x: number, y: number) =>
    layout.some(
      (l) => x < l.x + l.w && x + w > l.x && y < l.y + l.h && y + h > l.y,
    );
  for (let y = 0; ; y++) {
    for (let x = 0; x + w <= COLS; x++) {
      if (!overlaps(x, y)) return { x, y };
    }
  }
}

const sameLayout = (a: LayoutItem[], b: LayoutItem[]) =>
  JSON.stringify(a) === JSON.stringify(b);

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      widgets: {},
      layout: [],

      addWidget: ({ type, dataSource, title }) =>
        set((state) => {
          const id = crypto.randomUUID();
          const widget: WidgetConfig = { id, type, title, dataSource };
          const { x, y } = nextPosition(state.layout, DEFAULT_SIZE.w, DEFAULT_SIZE.h);
          return {
            widgets: { ...state.widgets, [id]: widget },
            layout: [...state.layout, { i: id, x, y, ...DEFAULT_SIZE }],
          };
        }),

      removeWidget: (id) =>
        set((state) => {
          const widgets = { ...state.widgets };
          delete widgets[id];
          return { widgets, layout: state.layout.filter((l) => l.i !== id) };
        }),

      // Guard against no-op updates to avoid render loops from react-grid-layout.
      setLayout: (layout) =>
        set((state) => (sameLayout(state.layout, layout) ? state : { layout })),

      seedDefaults: () => {
        if (Object.keys(get().widgets).length > 0) return;
        SAMPLE_WIDGETS.forEach((d) => get().addWidget(d));
      },

      // Always loads the sample set, replacing whatever is on the board.
      loadSampleSet: () => {
        set({ widgets: {}, layout: [] });
        SAMPLE_WIDGETS.forEach((d) => get().addWidget(d));
      },

      reset: () => set({ widgets: {}, layout: [] }),
    }),
    // version bump discards any layout persisted by the old (left-stacking) algorithm.
    { name: 'dashboard-builder-config', version: 2 },
  ),
);
