/**
 * SHARED RUNTIME VALIDATION (Zod)
 * -------------------------------
 * The same schemas validate data on BOTH ends:
 *  - backend validates every payload before it leaves the API,
 *  - frontend validates every payload it receives (guards against malformed
 *    JSON / a drifted backend).
 * `z.infer` of each schema is asserted equal to the static contract type, so
 * the validators can never silently diverge from `contract.ts`.
 */
import { z } from 'zod';
import type {
  BatchDataRequest,
  TreeNode,
  WidgetData,
  WidgetType,
} from './contract';

export const widgetTypeSchema = z.enum([
  'categorical',
  'temporal',
  'hierarchical',
  'relational',
]) satisfies z.ZodType<WidgetType>;

const categoricalSchema = z.object({
  kind: z.literal('categorical'),
  unit: z.string(),
  series: z.array(z.object({ label: z.string(), value: z.number().finite() })).min(1),
});

const temporalSchema = z.object({
  kind: z.literal('temporal'),
  metric: z.string(),
  points: z
    .array(
      z.object({
        timestamp: z.string().datetime(), // strict ISO-8601
        value: z.number().finite(),
      }),
    )
    .min(1),
});

const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    value: z.number().finite().optional(),
    children: z.array(treeNodeSchema).optional(),
  }),
);

const hierarchicalSchema = z.object({
  kind: z.literal('hierarchical'),
  root: treeNodeSchema,
});

const relationalSchema = z.object({
  kind: z.literal('relational'),
  xLabel: z.string(),
  yLabel: z.string(),
  points: z
    .array(
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
        z: z.number().finite().optional(),
        category: z.string().optional(),
      }),
    )
    .min(1),
});

/** Discriminated union of every chart payload. */
export const widgetDataSchema = z.discriminatedUnion('kind', [
  categoricalSchema,
  temporalSchema,
  hierarchicalSchema,
  relationalSchema,
]);

/** Full single-widget API envelope (used by the frontend to validate fetches). */
export const widgetDataResponseSchema = z.object({
  widgetId: z.string(),
  dataSource: z.string(),
  data: widgetDataSchema,
  generatedAt: z.string().datetime(),
});

export const batchRequestSchema = z.object({
  requests: z
    .array(
      z.object({
        widgetId: z.string().min(1),
        type: widgetTypeSchema,
        dataSource: z.string().min(1),
      }),
    )
    .min(1)
    .max(50),
}) satisfies z.ZodType<BatchDataRequest>;

// Compile-time guarantee the runtime schema equals the static contract.
type _AssertMatches = z.infer<typeof widgetDataSchema> extends WidgetData
  ? WidgetData extends z.infer<typeof widgetDataSchema>
    ? true
    : never
  : never;
export const _contractMatches: _AssertMatches = true;
