import { memo } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import type { HierarchicalData } from '@shared/contract';
import { toHierarchicalView } from '../../registry/transforms';

const COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#db2777', '#7c3aed'];

/** Hierarchical part-to-whole -> treemap. */
export const HierarchicalTreemap = memo(function HierarchicalTreemap({
  data,
}: {
  data: HierarchicalData;
}) {
  const view = toHierarchicalView(data);
  return (
    <div className="chart">
      <div className="chart__subtitle">Total: {view.total}</div>
      <ResponsiveContainer width="100%" height="85%">
        <Treemap
          data={view.nodes}
          dataKey="size"
          stroke="#fff"
          fill="#4f46e5"
          content={<TreemapCell colors={COLORS} />}
          isAnimationActive={false}
        >
          <Tooltip />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
});

/** Custom cell so top-level groups get distinct colours + labels. */
function TreemapCell(props: any) {
  const { x, y, width, height, index, name, colors, depth } = props;
  const fill = colors[index % colors.length];
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: '#fff' }} />
      {depth === 1 && width > 50 && height > 18 ? (
        <text x={x + 4} y={y + 16} fill="#fff" fontSize={11}>
          {name}
        </text>
      ) : null}
    </g>
  );
}
