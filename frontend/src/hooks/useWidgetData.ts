/**
 * Per-widget data fetching. Each widget owns its own request lifecycle, so one
 * widget loading/refreshing/failing never blocks or re-renders the others
 * (isolation == resiliency + performance).
 */
import { useCallback, useEffect, useState } from 'react';
import type { WidgetData } from '@shared/contract';
import { fetchWidgetData } from '../api/client';

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; data: WidgetData; generatedAt: string }
  | { status: 'error'; error: string };

export function useWidgetData(widgetId: string, dataSource: string) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetchWidgetData(widgetId, dataSource)
      .then((res) => {
        if (alive) setState({ status: 'success', data: res.data, generatedAt: res.generatedAt });
      })
      .catch((err: unknown) => {
        if (alive) setState({ status: 'error', error: (err as Error).message });
      });
    return () => {
      alive = false; // ignore late responses (avoids setState on unmounted widget)
    };
  }, [widgetId, dataSource, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, refetch };
}
