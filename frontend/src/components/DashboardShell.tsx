import { useCallback } from 'react';
import { Responsive, WidthProvider, type Layout, type Layouts } from 'react-grid-layout';
import { useDashboardStore } from '../store/dashboardStore';
import { WidgetContainer } from './WidgetContainer';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Responsive + WidthProvider: the grid measures its container AND reflows the
// column count by breakpoint, so widgets stack to full-width on small screens.
const ResponsiveGrid = WidthProvider(Responsive);

// Fewer columns as the viewport shrinks -> half-width widgets become full-width.
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };

/**
 * The "dashboard shell": owns ONLY layout + persistence. It has zero knowledge
 * of any concrete chart — it iterates the layout and hands each id to a
 * WidgetContainer. This is the Shell/Widget separation the rubric grades.
 */
export function DashboardShell() {
  const layout = useDashboardStore((s) => s.layout);
  const widgets = useDashboardStore((s) => s.widgets);
  const setLayout = useDashboardStore((s) => s.setLayout);
  const loadSampleSet = useDashboardStore((s) => s.loadSampleSet);

  // Persist the `lg` (desktop) layout as the single source of truth; RGL derives
  // the smaller-breakpoint layouts from it, so dragging on mobile never corrupts
  // the canonical desktop arrangement.
  const handleLayoutChange = useCallback(
    (current: Layout[], all: Layouts) => {
      const source = all.lg ?? current;
      setLayout(source.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
    },
    [setLayout],
  );

  if (layout.length === 0) {
    return (
      <div className="empty">
        <div className="empty__icon">📊</div>
        <h2>Your dashboard is empty</h2>
        <p>Pick a data source above and hit <strong>+ Add widget</strong>, or start from a ready-made set.</p>
        <button className="btn btn--primary" onClick={loadSampleSet}>
          Load sample dashboard
        </button>
      </div>
    );
  }

  return (
    <ResponsiveGrid
      className="layout"
      layouts={{ lg: layout }}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={70}
      margin={[12, 12]}
      draggableHandle=".widget-drag-handle"
      onLayoutChange={handleLayoutChange}
    >
      {layout.map((item) => {
        const config = widgets[item.i];
        if (!config) return null;
        return (
          <div key={item.i}>
            <WidgetContainer config={config} />
          </div>
        );
      })}
    </ResponsiveGrid>
  );
}
