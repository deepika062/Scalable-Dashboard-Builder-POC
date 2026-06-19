# Handling Data Drift on a Live Production Stream

> *"How would you handle Data Drift if this system were connected to a live
> production stream?"*

**Data drift** = the shape, semantics, or statistical distribution of incoming
data changes over time, while the dashboard's assumptions stay fixed. For a
dashboard builder there are three distinct kinds, and each needs a different
control. The POC already contains the seeds of the strategy (a shared schema, a
validating boundary, per-widget isolation); this document explains how that scales
to production.

---

## 1. Schema drift (structural)

*A producer renames `value` → `amount`, drops `category`, or changes a type.*

**Controls**

- **Validate at the boundary, always.** Every payload is parsed with the shared
  **Zod** schema (already done here in `api/client.ts`). A drifted record fails
  fast and is surfaced as a per-widget error instead of corrupting a chart.
- **Versioned contracts.** Add a `schemaVersion` to the envelope. The transform
  layer (`registry/transforms.ts`) selects an **adapter** per version, so old and
  new shapes both map to the chart-ready view. The contract lives in `shared/`, so
  a breaking change is a compile error across both ends — drift is caught in CI,
  not in prod.
- **Backward-compatible evolution.** Prefer additive changes; treat new fields as
  optional; deprecate before removing. Use a schema registry (e.g. Confluent Schema
  Registry / JSON-Schema registry) with **compatibility checks** in the producer's
  pipeline so an incompatible schema can't be published.
- **Tolerant reads + dead-letter.** Unparseable records go to a dead-letter queue
  with the raw payload and the Zod error, so nothing is silently dropped and the
  team can triage.

## 2. Semantic drift (meaning)

*Units change (USD → cents), a category set is re-coded, timezone of timestamps
shifts.* The schema still validates, but the numbers now lie.

**Controls**

- Carry **units/metadata in the payload** (this POC already sends `unit`, `xLabel`,
  `metric`) and render them, so a unit change is visible, not silent.
- **Normalize in the transform layer**, never in the chart. One place converts
  cents→dollars, parses ISO-8601 to a canonical UTC instant, maps category codes to
  labels. Pin it with unit tests (we already test the transforms).
- **Reference-data versioning** for category/enum sets so re-codes are explicit.

## 3. Statistical / distribution drift (values)

*The schema and meaning are fine, but the distribution moves — a spike, a sensor
going offline, seasonality, a broken upstream job.*

**Controls**

- **Monitor distributions, not just liveness.** Track rolling mean/variance, null
  rate, cardinality, min/max, and freshness (lag) per stream. Alert on
  z-score / PSI (Population Stability Index) breaches. Tools: Great Expectations,
  Evidently, Soda, or a lightweight custom check in the ingestion service.
- **Surface data quality in the UI.** A widget can show a "stale / anomalous data"
  badge using the `generatedAt` timestamp we already return (freshness) plus a
  quality flag from the monitor. The user sees *why* a chart looks odd.
- **Guard the visuals.** Auto-ranging axes, outlier capping/winsorizing in the
  transform, and "no data / partial data" states (the POC already has loading /
  error / empty states per widget) prevent a single spike from making a chart
  unreadable.

---

## Streaming architecture (how it plugs in)

The current request/response design becomes the read side of a streaming pipeline:

```
producers → stream (Kafka/Kinesis) → validation + normalization service
          → (schema registry, dead-letter, drift monitors)
          → materialized store / cache (per-widget, keyed by source + window)
          → API (this service)  → WebSocket/SSE push → widgets
```

- **Push, don't poll.** Replace per-widget polling with **WebSocket/SSE**; the
  Zustand store applies incremental updates to only the affected widget's slice —
  the per-widget isolation we already have means one stream updating doesn't
  re-render the rest.
- **Bounded buffers + windowing.** Keep a rolling window per source (e.g. last N
  points / last 24h) so memory is bounded regardless of stream volume.
- **Backpressure & debouncing.** Coalesce high-frequency updates (e.g. animation-
  frame or fixed-interval flush) so the UI isn't overwhelmed.
- **Idempotency & ordering.** Key updates by `(source, timestamp)` and drop
  out-of-order/duplicate events so late data from a drifting producer can't corrupt
  the view.

## Summary

| Drift type    | Primary control                                   | Already in the POC                    |
|---------------|---------------------------------------------------|---------------------------------------|
| Schema        | Validate at boundary + versioned contracts + DLQ  | Shared Zod validation on both ends    |
| Semantic      | Units in payload + normalize in transform layer   | `unit`/`metric`/labels carried + tested transforms |
| Statistical   | Distribution monitoring + quality badges + guards | `generatedAt` freshness, per-widget error/empty states |

The throughline: **a single validated contract at the boundary, a pure transform
layer that absorbs change, and per-widget isolation so drift degrades one widget
gracefully instead of taking down the dashboard.**
