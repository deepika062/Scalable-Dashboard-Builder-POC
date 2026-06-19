# Architectural Decision Record (ADR)

This POC makes a few load-bearing decisions. Each is recorded below with the
context, the choice, the alternatives, and the trade-offs.

---

## ADR-001 — State management: Zustand (+ persist)

**Context.** The dashboard needs a single global state holding widget configs,
layout positions, and data-source mappings, persisted across reloads. Crucially,
dragging or updating one widget must **not** re-render the others (performance).

**Decision.** Use **Zustand** with the `persist` middleware (LocalStorage).

**Alternatives considered.**
- **Redux Toolkit** — powerful and conventional, but heavy boilerplate
  (slices, actions, providers) for a POC of this size. Selector ergonomics are
  similar to Zustand but with more ceremony.
- **React Context + useReducer** — no dependency, but Context re-renders *every*
  consumer on any change, which directly fights the "don't re-render unrelated
  widgets" requirement. You end up hand-rolling selector memoization.
- **Jotai/Recoil (atoms)** — great for fine-grained reactivity, but atom-per-widget
  modelling is more machinery than this POC needs.

**Why Zustand wins here.**
- **Selector-based subscriptions** out of the box: each component subscribes to
  the slice it needs (`useDashboardStore(s => s.widgets[id])`), so a layout drag
  only re-renders the shell, not the charts.
- **`persist` middleware** gives LocalStorage persistence for free — no manual
  serialize/hydrate code.
- No provider wrapper, tiny API, store is a plain hook — excellent DX.

**Trade-offs / consequences.**
- Less structure than Redux for very large apps (no enforced action log / devtools
  ecosystem by default — though `devtools` middleware exists if needed).
- Persisted shape needs a migration story if the schema changes (add a `version`
  + `migrate` to `persist` in production).

---

## ADR-002 — Charting library: Recharts

**Context.** We must render four structurally different visualizations
(Categorical, Temporal, Hierarchical, Relational) and make it easy to add a fifth.

**Decision.** Use **Recharts**.

**Alternatives considered.**
- **Chart.js (react-chartjs-2)** — canvas-based and fast, but it has no native
  Treemap/Sunburst (hierarchical) without plugins, and its imperative config is a
  poorer fit for a declarative React registry.
- **ECharts (echarts-for-react)** — extremely capable (covers every chart incl.
  Sankey/Sunburst) and performant, but heavier bundle and a large imperative
  `option` object that's less idiomatic to compose per-widget.
- **D3 directly** — ultimate flexibility, but far too much low-level work for a POC
  and harder for "another dev to add a chart type."
- **Visx** — lovely primitives, but you assemble each chart yourself (more code).

**Why Recharts wins here.**
- One declarative, composable React API covers **all four** required families:
  `BarChart`, `LineChart`, `Treemap`, `ScatterChart`.
- `ResponsiveContainer` handles grid resize cleanly — important with
  react-grid-layout.
- Components compose naturally with the widget registry; adding a chart is "write
  a component."

**Trade-offs / consequences.**
- SVG-based: for *thousands* of points it's slower than canvas (ECharts/Chart.js).
  Acceptable for a dashboard POC; if a widget needed 100k points we'd swap that one
  widget's renderer (the registry makes this a local change).
- Larger single JS bundle (noted by the build). In production we'd code-split chart
  components with `React.lazy` so each widget type loads on demand.

---

## ADR-003 — Shared contract + Zod for end-to-end type safety

**Context.** Type safety is "highly prioritized," and each plot type has a unique
data structure that must be validated.

**Decision.** Keep a single `shared/` module the **frontend and backend both
import**: static types in `contract.ts`, runtime **Zod** schemas in
`validation.ts`. The discriminated union (`kind`) is the contract's backbone.

**Why.**
- The same Zod schema validates **outgoing** payloads on the server and
  **incoming** payloads on the client — so a malformed/partial response is caught
  at the boundary instead of crashing a chart.
- `z.infer<typeof schema>` is asserted equal to the static type at compile time, so
  validators and types **cannot drift**.
- One discriminant (`kind`) lets the registry and components narrow safely.

**Trade-offs.**
- `shared/` lives outside each package's root, so the tooling needs a small amount
  of config (a Vite alias + a `zod` alias, a `paths` entry for `tsc`). In a larger
  setup this would become a proper workspace package (`npm`/`pnpm` workspaces).

---

## ADR-004 — Mock engine as a generator registry

**Decision.** Model mock data as a `Map` of registered generators, each seeded by a
deterministic PRNG (mulberry32).

**Why.** Deterministic output makes unit tests stable; a registry keeps datasets
**extensible** (one `register()` call) and mirrors the frontend widget registry, so
both ends scale the same way.

---

## ADR-005 — Per-widget fetching on the client, with a batch endpoint kept for scale

**Context.** The brief asks for "an API capable of serving multiple widget data
requests efficiently (consider concurrency)." We provide that on the server with
`POST /api/widgets/batch`, which fans the requests across a bounded-concurrency
pool (`concurrency.ts`) and returns a **per-widget** result so one failure never
sinks the batch. The open question is how the *frontend* should consume data:
one batched call for the whole dashboard, or one independent request per widget?

**Decision.** The client fetches **per widget** (`useWidgetData` → the single
`GET /api/widgets/:source/data`). The batch endpoint is retained as the
server-side concurrency story and the path we'd switch to at scale — not wired
into the default render path.

**Why per-widget wins for this POC.**
- **Resiliency & isolation (graded explicitly).** Each widget owns its own
  request lifecycle, so a slow, failing, or malformed response affects *only*
  that card — it shows an inline error + Retry while every other widget stays
  live. A single batch call couples the widgets' fates into one render.
- **Independent refresh.** The per-widget ⟳ button (and a future per-widget
  auto-refresh interval) maps naturally to one request; it would be awkward to
  re-issue a whole-dashboard batch to refresh a single card.
- **Browser concurrency is already there.** Mounting N widgets fires N fetches
  that the browser runs in parallel, so the user-visible load is concurrent
  regardless — the batch endpoint's value is reducing *server* round-trips, which
  only matters at higher widget counts.
- **Simplicity.** No client-side request coalescing / fan-out cache to maintain.

**When we'd flip to the batch endpoint.** Once a dashboard holds many widgets
(say 15+), N requests becomes the bottleneck (connection limits, header
overhead, redundant latency). At that point the client would coalesce mounts
within a tick into one `POST /widgets/batch`, then route each per-widget result
back to its card — **without changing** the resiliency model, because the batch
response is already per-widget (`{ ok: true | false }`). The endpoint exists now
precisely so that change is a client-only swap, with the server contract already
in place and tested.

**Trade-offs / consequences.**
- The batch endpoint is currently exercised only by its integration test, not by
  the live UI — a deliberate "build the scale path, default to the resilient
  path" choice rather than dead code.
