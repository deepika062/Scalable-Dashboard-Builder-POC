/**
 * Backend re-exports the SHARED validation schemas, so the API validates
 * against exactly the same Zod definitions the frontend uses. (Single source
 * of truth — see ../../shared/validation.ts.)
 */
export {
  widgetDataSchema,
  widgetDataResponseSchema,
  batchRequestSchema,
  widgetTypeSchema,
} from '../../shared/validation.js';
