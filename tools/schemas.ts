import { z } from 'zod';
import { FilingStatusSchema, W2Schema } from '../tax/schemas.js';

/** The five questions the agent may ask. The budget guardrail counts ask_question calls. */
export const QuestionIdSchema = z.enum([
  'filing_status',
  'dependents',
  'other_income',
  'extra_withholding',
  'anything_else',
]);
export type QuestionId = z.infer<typeof QuestionIdSchema>;

export const RecordW2Schema = z.object({ w2: W2Schema });

/** A correction to the already-recorded W-2. Any subset of fields may be supplied. */
export const UpdateW2Schema = z.object({ w2: W2Schema.partial() });

export const AskQuestionSchema = z.object({
  questionId: QuestionIdSchema,
  text: z.string().min(1).describe('The friendly question to show the user.'),
});

/** Records what the agent learned from an answer. Any subset of fields may be supplied. */
export const RecordAnswerSchema = z.object({
  filingStatus: FilingStatusSchema.optional(),
  qualifyingChildrenUnder17: z.number().int().nonnegative().optional(),
  otherDependents: z.number().int().nonnegative().optional(),
  additionalIncome: z.number().nonnegative().optional(),
  additionalWithholding: z.number().nonnegative().optional(),
  spouseName: z.string().optional(),
  spouseSSN: z.string().optional(),
  notes: z.string().optional(),
});

export const ComputeReturnSchema = z.object({});
export const FinalizeAndRenderSchema = z.object({});

export const TOOL_INPUT_SCHEMAS = {
  record_w2: RecordW2Schema,
  update_w2: UpdateW2Schema,
  ask_question: AskQuestionSchema,
  record_answer: RecordAnswerSchema,
  compute_return: ComputeReturnSchema,
  finalize_and_render: FinalizeAndRenderSchema,
} as const;

export type ToolName = keyof typeof TOOL_INPUT_SCHEMAS;

const DESCRIPTIONS: Record<ToolName, string> = {
  record_w2:
    "Record the user's W-2. Call this as soon as you have their W-2 numbers (box 1 wages and box 2 federal withholding at minimum).",
  update_w2:
    "Update one or more fields of the already-recorded W-2 when the user corrects a detail (for example a changed SSN, name, wages, or withholding). Pass only the fields that change; the rest stay as recorded.",
  ask_question:
    'Ask the user one of the five allowed questions. You may ask at most five questions total; the system enforces this. Pass the questionId and the warm, plain-language text you want to show.',
  record_answer:
    "Record structured facts learned from the user's reply (filing status, number of qualifying children under 17, other dependents, additional income, extra federal withholding such as estimated payments, spouse name and SSN for a joint return, or freeform notes). Supply only the fields you learned.",
  compute_return:
    'Compute the 2025 Form 1040 from the recorded W-2 and answers. Requires a W-2 and a filing status. Returns the line-by-line result including refund or balance due.',
  finalize_and_render:
    'Fill the official IRS 2025 Form 1040 PDF with the computed return and make it downloadable. Call this only after compute_return has succeeded.',
};

/** Strip JSON Schema dialect noise Anthropic does not need; force the object shape it requires. */
function toAnthropicSchema(
  schema: z.ZodType,
): { type: 'object'; properties: Record<string, unknown> } & Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<string, unknown>;
  delete json.$schema;
  return {
    ...json,
    type: 'object',
    properties: (json.properties as Record<string, unknown>) ?? {},
  };
}

/** Tool definitions in the shape the Anthropic Messages API expects. */
export const ANTHROPIC_TOOLS = (Object.keys(TOOL_INPUT_SCHEMAS) as ToolName[]).map((name) => ({
  name,
  description: DESCRIPTIONS[name],
  input_schema: toAnthropicSchema(TOOL_INPUT_SCHEMAS[name]),
}));
