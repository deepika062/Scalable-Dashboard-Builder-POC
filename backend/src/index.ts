import { createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 4000);

createApp().listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] API listening on http://localhost:${PORT}/api`);
});
