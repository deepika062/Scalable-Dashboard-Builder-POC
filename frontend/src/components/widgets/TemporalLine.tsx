import { memo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TemporalData } from '@shared/contract';
import { toTemporalView } from '../../registry/transforms';

const TREND_LABEL: Record<string, string> = { up: '▲', down: '▼', flat: '▬' };
const TREND_COLOR: Record<string, string> = { up: '#16a34a', down: '#dc2626', flat: '#6b7280' };

/** Temporal time-series -> line chart with a computed trend badge. */
export const TemporalLine = memo(function TemporalLine({ data }: { data: TemporalData }) {
  const view = toTemporalView(data);
  return (
    <div className="chart">
      <div className="chart__subtitle">
        {view.metric}{' '}
        <span style={{ color: TREND_COLOR[view.trend] }}>
          {TREND_LABEL[view.trend]} {view.changePct > 0 ? '+' : ''}
          {view.changePct}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={view.rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke={TREND_COLOR[view.trend]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
