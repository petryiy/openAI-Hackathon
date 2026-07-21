import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ModelConfigurationError, resolveReasoningEffort } from "@/lib/ai/provider";
import { formatExpression } from "@/lib/math/expression";
import { LessonSpecV2Schema, type LessonSpecV2 } from "@/lib/lesson/schema";

const BridgeSchema = z.string().trim().min(8).max(160);
const SegmentIdSchema = z.enum(["hook", "structure", "rule", "example", "summary"]);

export const DerivativeLanguagePlanSchema = z.object({
  setting: z.string().trim().min(8).max(100),
  task: z.string().trim().min(8).max(120),
  consequence: z.string().trim().min(8).max(120),
  bridges: z.array(z.object({ segmentId: SegmentIdSchema, text: BridgeSchema }).strict()).length(5),
}).strict();

export type DerivativeLanguagePlan = z.infer<typeof DerivativeLanguagePlanSchema>;

function requestTimeout() {
  const value = Number(process.env.OPENAI_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 30_000 && value <= 600_000 ? value : 240_000;
}

export function applyDerivativeLanguagePlan(lesson: LessonSpecV2, plan: DerivativeLanguagePlan): LessonSpecV2 {
  const ids = plan.bridges.map((bridge) => bridge.segmentId);
  if (new Set(ids).size !== 5 || !lesson.segments.every((segment) => ids.includes(segment.id as typeof ids[number]))) throw new Error("The language plan must contain one bridge for every fixed lesson segment.");
  if (plan.bridges.some((bridge) => /[=^<>$\\{}\[\]0-9]/.test(bridge.text))) throw new Error("Language bridges may not introduce formulas, numbers, markup, or code.");
  const bridgeMap = new Map<string, string>(plan.bridges.map((bridge) => [bridge.segmentId, bridge.text]));
  return LessonSpecV2Schema.parse({
    ...lesson,
    storyHook: { setting: plan.setting, task: plan.task, consequence: plan.consequence },
    segments: lesson.segments.map((segment) => {
      const bridge = bridgeMap.get(segment.id);
      return bridge ? { ...segment, narration: `${bridge} ${segment.narration}` } : segment;
    }),
  });
}

export async function planDerivativeLessonLanguage(lesson: LessonSpecV2): Promise<LessonSpecV2> {
  if (!process.env.OPENAI_API_KEY) {
    throw new ModelConfigurationError("Add OPENAI_API_KEY to generate a dynamic derivative lesson. The seeded derivative lesson remains available without it.");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: requestTimeout(), maxRetries: 0 });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    reasoning: { mode: "standard", effort: resolveReasoningEffort() },
    input: [
      { role: "system", content: "You write short English narrative bridges for a student derivative lesson. Mathematics is already verified and rendered by code. Never write formulas, numbers, code, LaTeX, HTML, answers, derivative claims, or new mathematical facts. Return only the requested structured language plan." },
      { role: "user", content: JSON.stringify({ objective: lesson.objective, capability: lesson.capability, verifiedSource: formatExpression(lesson.mathModel.sourceExpression), segmentPurposes: lesson.segments.map((segment) => ({ id: segment.id, kind: segment.kind })), direction: "Use one coherent, light mission setting. Each bridge should be one short sentence and should motivate the verified explanation that follows." }) },
    ],
    text: { verbosity: "low", format: zodTextFormat(DerivativeLanguagePlanSchema, "derivative_language_plan") },
  });
  if (!response.output_parsed) throw new Error("The model did not return a complete derivative language plan.");
  return applyDerivativeLanguagePlan(lesson, response.output_parsed);
}
