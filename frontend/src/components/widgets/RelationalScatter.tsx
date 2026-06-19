import { memo } from 'react';
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { RelationalData } from '@shared/contract';
import { toRelationalView } from '../../registry/transforms';

const COLORS = ['#4f46e5', '#db2777', '#16a34a', '#d97706'];

/** Relational correlation -> scatter plot, with a computed Pearson r. */
export const RelationalScatter = memo(function RelationalScatter({
  data,
}: {
  data: RelationalData;
}) {
  const view = toRelationalView(data);
  return (
    <div className="chart">
      <div className="chart__subtitle">Pearson r = {view.correlation}</div>
      <ResponsiveContainer width="100%" height="85%">
        <ScatterChart margin={{ top: 8, right: 16, bottom: 12, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            type="number"
            dataKey="x"
            name={view.xLabel}
            tick={{ fontSize: 10 }}
            label={{ value: view.xLabel, position: 'insideBottom', offset: -6, fontSize: 10 }}
          />
          <YAxis type="number" dataKey="y" name={view.yLabel} tick={{ fontSize: 10 }} />
          <ZAxis type="number" dataKey="z" range={[20, 120]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {view.series.map((s, i) => (
            <Scatter key={s.category} name={s.category} data={s.points} fill={COLORS[i % COLORS.length]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
});
