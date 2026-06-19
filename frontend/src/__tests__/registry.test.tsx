import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CategoricalData, WidgetData, WidgetType } from '@shared/contract';
import {
  getWidget,
  listWidgetTypes,
  registerWidget,
} from '../registry/widgetRegistry';

describe('widget registry (integration)', () => {
  it('registers all four required visualization types', () => {
    const types = listWidgetTypes();
    for (const t of ['categorical', 'temporal', 'hierarchical', 'relational'] as WidgetType[]) {
      expect(types).toContain(t);
    }
  });

  it('renders the correct component for a payload via the registry', () => {
    const data: CategoricalData = {
      kind: 'categorical',
      unit: 'USD (k)',
      series: [{ label: 'North', value: 12 }],
    };
    const def = getWidget('categorical');
    expect(def).toBeDefined();
    render(<>{def!.render(data)}</>);
    // The categorical widget renders its unit as a subtitle.
    expect(screen.getByText('USD (k)')).toBeInTheDocument();
  });

  it('lets a 5th chart type be added without touching the shell (extensibility)', () => {
    const funnelType = 'funnel' as unknown as WidgetType;
    registerWidget({
      type: funnelType,
      label: 'Funnel (custom)',
      render: (_d: WidgetData) => <div data-testid="funnel">funnel widget</div>,
    });

    const def = getWidget(funnelType);
    expect(def?.label).toBe('Funnel (custom)');
    render(<>{def!.render({} as WidgetData)}</>);
    expect(screen.getByTestId('funnel')).toBeInTheDocument();
  });

  it('a renderer ignores a mismatched payload kind (type safety guard)', () => {
    const def = getWidget('temporal');
    // Feed categorical data to the temporal renderer -> renders nothing, no crash.
    const data = { kind: 'categorical' } as unknown as WidgetData;
    const { container } = render(<>{def!.render(data)}</>);
    expect(container).toBeEmptyDOMElement();
  });
});
