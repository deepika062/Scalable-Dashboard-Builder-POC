import { memo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoricalData } from '@shared/contract';
import { toCategoricalView } from '../../registry/transforms';

/** Categorical comparison -> bar chart. memo: only re-renders if `data` changes. */
export const CategoricalBar = memo(function CategoricalBar({ data }: { data: CategoricalData }) {
  const view = toCategoricalView(data);
  return (
    <div className="chart">
      <div className="chart__subtitle">{view.unit}</div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={view.rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
