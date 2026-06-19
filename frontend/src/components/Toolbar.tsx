import { useEffect, useMemo, useState } from 'react';
import type { DataSourceMeta } from '@shared/contract';
import { fetchRegistry } from '../api/client';
import { useDashboardStore } from '../store/dashboardStore';

/**
 * Toolbar: loads available data sources from the backend registry and lets the
 * user add any of them as a widget. The picker is fully data-driven — register
 * a new source on the backend and it appears here automatically.
 */
export function Toolbar() {
  const [sources, setSources] = useState<DataSourceMeta[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const addWidget = useDashboardStore((s) => s.addWidget);
  const reset = useDashboardStore((s) => s.reset);
  const loadSampleSet = useDashboardStore((s) => s.loadSampleSet);
  const count = useDashboardStore((s) => s.layout.length);

  useEffect(() => {
    fetchRegistry()
      .then((s) => {
        setSources(s);
        setSelected((prev) => prev || s[0]?.id || '');
      })
      .catch((e: unknown) => setError((e as Error).message));
  }, []);

  const selectedMeta = useMemo(
    () => sources.find((s) => s.id === selected),
    [sources, selected],
  );

  const handleAdd = () => {
    if (!selectedMeta) return;
    addWidget({
      type: selectedMeta.type,
      dataSource: selectedMeta.id,
      title: selectedMeta.label,
    });
  };

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <label htmlFor="source">Data source</label>
        <select
          id="source"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={sources.length === 0}
        >
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} · {s.type}
            </option>
          ))}
        </select>
        <button className="btn btn--primary" onClick={handleAdd} disabled={!selectedMeta}>
          + Add widget
        </button>
      </div>

      <div className="toolbar__group">
        <span className="toolbar__count">{count} widget{count === 1 ? '' : 's'}</span>
        <button className="btn" onClick={loadSampleSet}>Load sample set</button>
        <button className="btn btn--danger" onClick={reset} disabled={count === 0}>
          Clear
        </button>
      </div>

      {error && <span className="toolbar__error">Registry error: {error}</span>}
    </div>
  );
}
