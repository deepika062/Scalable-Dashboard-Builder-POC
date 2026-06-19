# Dashboard Builder POC

A scalable, data-driven **Dashboard Builder**: users add, arrange, resize, and
persist data-visualization widgets on a grid. The emphasis is on **architecture**
— a clean separation between the *Dashboard Shell* and the *Widget Logic*, an
**extensible widget registry**, **end-to-end type safety**, and **resiliency**.

> TL;DR — add a new chart type by writing one component + one `registerWidget()`
> call (frontend) and one `register()` call (backend). Nothing else changes.

---

## Tech stack

| Layer    | Choice                                            | Why (see [docs/ADR.md](docs/ADR.md)) |
|----------|---------------------------------------------------|--------------------------------------|
| Frontend | React 18 + TypeScript + Vite                      | Fast DX, strict typing               |
| State    | **Zustand** (+ `persist` → LocalStorage)          | Minimal boilerplate, selector-based re-renders |
| Layout   | **react-grid-layout**                             | Drag/resize grid, serializable layout |
| Charts   | **Recharts**                                      | Declarative, covers all 4 families   |
| Backend  | Node.js + **Express** + TypeScript (`tsx`)        | Required stack                       |
| Schemas  | **Zod** (shared with frontend)                    | Runtime validation + inferred types  |
| Tests    | **Vitest** (+ Supertest, Testing Library)         | One runner across both packages      |

## Repository layout

```
dashboard-builder/
├── shared/              # SINGLE SOURCE OF TRUTH for the API contract
│   ├── contract.ts      #   static TypeScript types (imported by both ends)
│   └── validation.ts    #   Zod schemas (runtime validation on both ends)
├── backend/             # Express API + extensible mock engine
│   └── src/
│       ├── mockEngine.ts    # registered dataset generators (seeded)
│       ├── routes.ts        # /registry, single + batch (concurrent) endpoints
│       ├── concurrency.ts   # bounded-concurrency helper
│       └── __tests__/       # unit (mock engine) + integration (API)
├── frontend/            # React engine
│   └── src/
│       ├── registry/widgetRegistry.tsx  # DYNAMIC widget registry
│       ├── registry/transforms.ts       # pure raw→chart transforms (unit-tested)
│       ├── store/dashboardStore.ts       # Zustand global state + persistence
│       ├── components/DashboardShell.tsx # shell: layout only, no chart knowledge
│       ├── components/WidgetContainer.tsx# data fetch + loading/error/success states
│       └── components/widgets/*          # the 4 chart components
├── docker-compose.yml
└── docs/                # ADR + Data Drift write-up
```

---

## Run it locally

### Option A — Docker (preferred)

```bash
docker compose up --build
```

- Frontend: <http://localhost:8080>
- Backend API: <http://localhost:4000/api/registry>

(nginx in the frontend container reverse-proxies `/api` → backend.)

### Option B — npm (two terminals)

Requires Node 20+.

```bash
# terminal 1 — backend
cd backend
npm install
npm start            # http://localhost:4000

# terminal 2 — frontend
cd frontend
npm install
npm run dev          # http://localhost:5173  (proxies /api → :4000)
```

---

## Tests

```bash
cd backend  && npm test     # mock-engine unit tests + API integration tests
cd frontend && npm test     # transform unit tests + widget-registry integration test
```

`npm run typecheck` in either package runs a strict `tsc --noEmit`.

---

## The four visualization types

Each consumes a **structurally unique** payload (discriminated by `kind`):

| Type           | Chart    | Data focus     | Structure                                  |
|----------------|----------|----------------|--------------------------------------------|
| `categorical`  | Bar      | Comparison     | key/value pairs                            |
| `temporal`     | Line     | Time-series    | ISO-8601 timestamps + computed trend       |
| `hierarchical` | Treemap  | Part-to-whole  | nested tree (recursively validated)        |
| `relational`   | Scatter  | Correlation    | coordinate points + computed Pearson *r*   |

---

## How the requirements are met

**Dynamic registry.** `frontend/src/registry/widgetRegistry.tsx` maps a
`WidgetType` → a render function. The shell never imports a chart; it asks the
registry to render a payload. Adding a chart type touches *only* the registry.

**State management.** `dashboardStore.ts` (Zustand) holds widget configs, layout
positions, and data-source mappings in one global store, persisted to
LocalStorage via the `persist` middleware.

**Layout persistence.** `react-grid-layout` (responsive breakpoints: 12 cols on
desktop down to 1–2 on mobile) drives drag/resize; every change is written to the
store and to LocalStorage, so the dashboard survives reloads. The desktop (`lg`)
layout is the persisted source of truth; smaller breakpoints are derived from it.

**Performance.** Per-widget data fetching isolates updates; `React.memo` on every
widget + chart; narrow Zustand selectors so dragging one widget doesn't re-render
the others; the store skips no-op layout writes to avoid render loops.

**Schema enforcement.** Zod schemas (`shared/validation.ts`) validate requests on
the way in and payloads on the way out — and their `z.infer` is asserted equal to
the static contract, so types and validators cannot drift.

**Async / concurrency.** `POST /api/widgets/batch` serves many widgets with a
bounded-concurrency pool (`concurrency.ts`) and returns a **per-widget** result so
one failure never sinks the batch.

**Extensible mock engine.** `mockEngine.ts` is a registry of seeded generators
(deterministic for tests) producing Temporal, Hierarchical, Categorical, and
Relational datasets. Add a dataset with one `register()` call.

**Resiliency.** The API returns per-widget errors; the frontend validates every
response with Zod (catches malformed JSON), shows an inline error + Retry per
widget, and wraps each widget in an **Error Boundary** so a bad chart can't crash
the dashboard. Try the `unstable-sensor` source — it fails ~50% of the time.

**End-to-end type safety.** Both ends import the same `shared/` contract.

See **[docs/ADR.md](docs/ADR.md)** for the state/charting decisions and
**[docs/DATA_DRIFT.md](docs/DATA_DRIFT.md)** for the production data-drift strategy.

---

## Adding a 5th chart type (DX)

1. Add the payload type to `shared/contract.ts` and its Zod schema to
   `shared/validation.ts`.
2. Add a generator in `backend/src/mockEngine.ts` (`register({...})`).
3. Create the chart component in `frontend/src/components/widgets/`.
4. Register it in `frontend/src/registry/widgetRegistry.tsx`
   (`registerWidget({...})`).

No changes to the shell, store, grid, or fetching logic.
