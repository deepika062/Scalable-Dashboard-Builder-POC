import '@testing-library/jest-dom/vitest';

// jsdom lacks ResizeObserver, which Recharts' ResponsiveContainer relies on.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverMock as unknown as typeof ResizeObserver);
