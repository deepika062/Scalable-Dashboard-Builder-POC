import { useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { DashboardShell } from './components/DashboardShell';
import { useDashboardStore } from './store/dashboardStore';

export default function App() {
  const seedDefaults = useDashboardStore((s) => s.seedDefaults);

  // First-run convenience: start with one widget of each family.
  useEffect(() => {
    seedDefaults();
  }, [seedDefaults]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Dashboard Builder</h1>
        <span className="app__subtitle">POC · drag, resize &amp; persist widgets</span>
      </header>
      <Toolbar />
      <main className="app__main">
        <DashboardShell />
      </main>
    </div>
  );
}
