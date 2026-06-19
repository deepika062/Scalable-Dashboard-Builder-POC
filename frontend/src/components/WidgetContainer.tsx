import { memo } from 'react';
import type { WidgetConfig } from '@shared/contract';
import { useDashboardStore } from '../store/dashboardStore';
import { useWidgetData } from '../hooks/useWidgetData';
import { getWidget } from '../registry/widgetRegistry';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

/**
 * The "widget logic" half of the system: owns data fetching + all UI states
 * (loading / error / empty / success) and delegates the actual chart to the
 * registry. memo() ensures it only re-renders when ITS OWN config changes —
 * dragging another widget (which mutates `layout`) does not touch it.
 */
export const WidgetContainer = memo(function WidgetContainer({
  config,
}: {
  config: WidgetConfig;
}) {
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const fetch = useWidgetData(config.id, config.dataSource);
  const definition = getWidget(config.type);

  return (
    <div className="widget">
      {/* Drag handle — only the header drags, so charts stay interactive. */}
      <header className="widget__header widget-drag-handle">
        <div className="widget__titles">
          <span className="widget__title">{config.title}</span>
          <span className="widget__source">{config.dataSource}</span>
        </div>
        <div className="widget__actions">
          <button title="Refresh" onClick={fetch.refetch} aria-label="refresh">
            ⟳
          </button>
          <button title="Remove" onClick={() => removeWidget(config.id)} aria-label="remove">
            ✕
          </button>
        </div>
      </header>

      <div className="widget__body">
        <WidgetErrorBoundary resetKey={fetch.status}>
          {fetch.status === 'loading' && (
            <div className="widget__state widget__state--loading">Loading…</div>
          )}

          {fetch.status === 'error' && (
            <div className="widget__state widget__state--error">
              <strong>Couldn’t load data</strong>
              <span>{fetch.error}</span>
              <button onClick={fetch.refetch}>Retry</button>
            </div>
          )}

          {fetch.status === 'success' &&
            (definition ? (
              definition.render(fetch.data)
            ) : (
              <div className="widget__state widget__state--error">
                No renderer registered for type “{config.type}”
              </div>
            ))}
        </WidgetErrorBoundary>
      </div>
    </div>
  );
});
