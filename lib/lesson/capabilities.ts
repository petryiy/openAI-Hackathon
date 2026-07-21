import { createHash, randomUUID } from "node:crypto";
import {
  classifyDerivativeCapability, differentiate, formatExpression, parseMathExpression, simplify, substituteExpression,
  type DerivativeCapability as MathCapability, type ExpressionAst,
} from "@/lib/math/expression";
import { LessonSpecV2Schema, type DerivativeCapability, type LessonSpecV2, type ManimTemplateId } from "@/lib/lesson/schema";

type CapabilityDefinition = {
  ruleTemplate: ManimTemplateId;
  remediationTemplate: ManimTemplateId;
  ruleLabel: string;
  commonError: string;
  transferSource: string;
};

export const DERIVATIVE_CAPABILITIES: Record<DerivativeCapability, CapabilityDefinition> = {
  power: { ruleTemplate: "derivative_power_sum_rule", remediationTemplate: "derivative_standard_function_repair", ruleLabel: "power rule", commonError: "keeping the old exponent", transferSource: "x^5" },
  sum: { ruleTemplate: "derivative_power_sum_rule", remediationTemplate: "derivative_standard_function_repair", ruleLabel: "sum rule", commonError: "dropping one term", transferSource: "x^3+sin(x)" },
  product: { ruleTemplate: "derivative_product_rule", remediationTemplate: "derivative_product_repair", ruleLabel: "product rule", commonError: "multiplying the two derivatives", transferSource: "x^3*cos(x)" },
  quotient: { ruleTemplate: "derivative_quotient_rule", remediationTemplate: "derivative_quotient_repair", ruleLabel: "quotient rule", commonError: "reversing the numerator order", transferSource: "(x^2+2)/(x+1)" },
  chain: { ruleTemplate: "derivative_chain_rule", remediationTemplate: "derivative_missing_inner_repair", ruleLabel: "chain rule", commonError: "forgetting the inner derivative", transferSource: "(x^2+2)^2" },
  standard_function: { ruleTemplate: "derivative_standard_function_rule", remediationTemplate: "derivative_standard_function_repair", ruleLabel: "standard-function rule", commonError: "using the wrong standard derivative", transferSource: "cos(x)" },
};

function children(node: ExpressionAst): ExpressionAst[] {
  if (node.type === "add") return node.terms;
  if (node.type === "multiply") return node.factors;
  if (node.type === "divide") return [node.numerator, node.denominator];
  if (node.type === "power") return [node.base];
  if (node.type === "function") return [node.argument];
  return [];
}

function activeParts(source: ExpressionAst, capability: DerivativeCapability) {
  if (capability === "chain") return source.type === "power" ? [source.base] : source.type === "function" ? [source.argument] : [source];
  if (capability === "product" && source.type === "multiply") return source.factors.length === 2 ? source.factors : [simplify({ type: "multiply", factors: source.factors.slice(0, -1) }), source.factors.at(-1)!];
  if (capability === "quotient" && source.type === "divide") return [source.numerator, source.denominator];
  if (capability === "sum" && source.type === "add") return source.terms.length === 2 ? source.terms : [source.terms[0], simplify({ type: "add", terms: source.terms.slice(1) })];
  return [source];
}

function buildPractice(source: ExpressionAst, derivative: ExpressionAst, capability: DerivativeCapability, evaluationPoint?: number) {
  const parts = activeParts(source, capability);
  const partNames = capability === "chain" ? ["inner"] : capability === "quotient" ? ["numerator", "denominator"] : capability === "product" ? ["u", "v"] : ["active-part", "second-part"];
  const fields = parts.map((part, index) => ({ id: partNames[index] ?? `part-${index + 1}`, label: partNames[index] ?? `Part ${index + 1}`, placeholder: formatExpression(part), expected: part }));
  const derivativeFields = parts.map((part, index) => ({ id: `${partNames[index] ?? `part-${index + 1}`}-prime`, label: `Derivative of ${partNames[index] ?? `part ${index + 1}`}`, placeholder: "Enter an expression in x", expected: differentiate(part) }));
  return {
    id: `guided-${capability}`,
    prompt: `Differentiate f(x)=${formatExpression(source)} using the ${DERIVATIVE_CAPABILITIES[capability].ruleLabel}.`,
    sourceExpression: source,
    steps: [
      { id: "decompose", kind: "decompose" as const, prompt: "Step 1: Identify the part or parts controlled by the rule.", fields },
      { id: "differentiate-parts", kind: "differentiate_parts" as const, prompt: "Step 2: Differentiate those parts.", fields: derivativeFields },
      { id: "assemble", kind: "assemble" as const, prompt: "Step 3: Assemble the derivative rule without skipping a factor.", fields: [{ id: "assembled", label: "Assembled derivative", placeholder: "Combine the differentiated parts", expected: derivative }] },
      { id: "simplify", kind: "simplify" as const, prompt: evaluationPoint === undefined ? "Step 4: Simplify the final derivative." : `Step 4: Evaluate the derivative at x=${evaluationPoint}.`, fields: [{ id: "result", label: evaluationPoint === undefined ? "Final derivative" : "Slope at the specified point", placeholder: evaluationPoint === undefined ? "Enter f'(x)" : `Enter f'(${evaluationPoint})`, expected: evaluationPoint === undefined ? derivative : substituteExpression(derivative, { numerator: evaluationPoint, denominator: 1 }) }] },
    ],
  };
}

function domainNotes(source: ExpressionAst) {
  const notes: string[] = [];
  const visit = (node: ExpressionAst) => {
    if (node.type === "divide") notes.push(`The denominator ${formatExpression(node.denominator)} must not equal zero.`);
    if (node.type === "function" && node.name === "ln") notes.push(`The input ${formatExpression(node.argument)} must be positive.`);
    children(node).forEach(visit);
  };
  visit(source); return Array.from(new Set(notes));
}

function remediationCheck(capability: DerivativeCapability) {
  const values: Record<DerivativeCapability, [string, string]> = {
    chain: ["For the inner function u=x^2+2, enter u′.", "2x"],
    product: ["Before rebuilding a product rule, differentiate u=x^2.", "2x"],
    quotient: ["If the denominator is v=x+1, enter the squared denominator v^2.", "(x+1)^2"],
    standard_function: ["Enter the derivative of sin(x).", "cos(x)"],
    sum: ["Differentiate the single term x^3.", "3x^2"],
    power: ["Differentiate the single term x^5.", "5x^4"],
  };
  return { prompt: values[capability][0], expectedExpression: parseMathExpression(values[capability][1]) };
}

export function buildSymbolicDerivativeLesson(sourceInput: string, source: ExpressionAst, task: "differentiate" | "slope_at_point", evaluationPoint?: number): LessonSpecV2 {
  const capability = classifyDerivativeCapability(source) as MathCapability as DerivativeCapability;
  const definition = DERIVATIVE_CAPABILITIES[capability];
  const derivative = differentiate(source);
  const pointResult = evaluationPoint === undefined ? undefined : substituteExpression(derivative, { numerator: evaluationPoint, denominator: 1 });
  const sourceText = formatExpression(source); const derivativeText = formatExpression(derivative);
  const transferSource = parseMathExpression(definition.transferSource); const transferDerivative = differentiate(transferSource);
  const segments: LessonSpecV2["segments"] = [
    { id: "hook", kind: "hook", templateId: "derivative_rule_story_hook", durationMs: 10_000, narration: `A navigation system must predict how ${sourceText} is changing now. The structure of the function determines which derivative rule will keep that prediction reliable.`, transcript: `The structure of f(x)=${sourceText} determines the derivative rule.`, learnerShouldNotice: ["The function structure selects the rule"] },
    { id: "structure", kind: "intuition", templateId: "derivative_expression_structure", durationMs: 13_000, narration: `Read the expression from the outside inward. Its main operation points to the ${definition.ruleLabel}. Mark each active part before differentiating anything.`, transcript: `Read f(x)=${sourceText} from the outside inward and identify the ${definition.ruleLabel}.`, learnerShouldNotice: ["Identify structure before calculating"], checkpointId: "checkpoint-rule" },
    { id: "rule", kind: "derivation", templateId: definition.ruleTemplate, durationMs: 16_000, narration: `Apply the ${definition.ruleLabel} to the verified parts. Every displayed formula comes from the same symbolic expression, so no factor or sign is invented by the narration.`, transcript: `Apply the ${definition.ruleLabel} to the verified expression structure.`, learnerShouldNotice: ["Keep every required derivative factor"] },
    { id: "example", kind: "worked_example", templateId: "derivative_rule_worked_example", durationMs: 19_000, narration: `For f of x equals ${sourceText}, assemble the rule one part at a time. After exact simplification, the derivative is ${derivativeText}.${pointResult ? ` At x equals ${evaluationPoint}, the verified slope is ${formatExpression(pointResult)}.` : ""}`, transcript: `f(x)=${sourceText}; f'(x)=${derivativeText}.${pointResult ? ` f'(${evaluationPoint})=${formatExpression(pointResult)}.` : ""}`, learnerShouldNotice: [`The verified derivative is ${derivativeText}`, `Avoid ${definition.commonError}`], checkpointId: "checkpoint-error" },
    { id: "summary", kind: "summary", templateId: "derivative_rule_summary", durationMs: 13_000, narration: `The derivative follows the expression tree, not a memorized visual guess. Identify the main operation, differentiate its parts, assemble the rule, and only then simplify.`, transcript: `Structure → differentiate parts → assemble → simplify.`, learnerShouldNotice: ["The same four decisions transfer to a new function"] },
  ];
  const id = `lesson-${randomUUID()}`;
  return LessonSpecV2Schema.parse({
    schemaVersion: 2, id, locale: "en", sourceInput,
    objective: evaluationPoint === undefined ? `Differentiate ${sourceText} with the ${definition.ruleLabel} and explain why each factor appears.` : `Find the slope of ${sourceText} at x=${evaluationPoint} with the ${definition.ruleLabel}.`,
    capability,
    storyHook: { setting: "A live navigation model under a short decision window", task: `Predict the instantaneous change of ${sourceText}`, consequence: "A missing factor or reversed sign sends the model along the wrong path" },
    mathModel: { sourceExpression: source, task, evaluationPoint: evaluationPoint === undefined ? undefined : { numerator: evaluationPoint, denominator: 1 }, primaryRule: capability, derivativeExpression: derivative, ruleApplications: [{ rule: capability, source, result: derivative }], domainNotes: domainNotes(source) },
    segments,
    checkpoints: [
      { id: "checkpoint-rule", afterSegmentId: "structure", prompt: `Which rule controls the outer structure of ${sourceText}?`, options: [
        { id: "correct-rule", label: definition.ruleLabel.replace(/^./, (letter) => letter.toUpperCase()), correctness: "correct" },
        { id: "power-only", label: capability === "power" ? "Product rule" : "Power rule only", correctness: "incorrect", misconceptionCode: "WRONG_DERIVATIVE_RULE" },
        { id: "unsure", label: "I am not sure yet", correctness: "uncertain", misconceptionCode: "WRONG_DERIVATIVE_RULE" },
      ] },
      { id: "checkpoint-error", afterSegmentId: "example", prompt: `Would a result produced by ${definition.commonError} be reliable?`, options: [
        { id: "no", label: "No — that loses a required relationship", correctness: "correct" },
        { id: "yes", label: "Yes — simplification makes it equivalent", correctness: "incorrect", misconceptionCode: capability === "chain" ? "MISSING_INNER_DERIVATIVE" : capability === "product" ? "PRODUCT_OF_DERIVATIVES" : capability === "quotient" ? "QUOTIENT_ORDER_REVERSED" : "STANDARD_DERIVATIVE_ERROR" },
        { id: "unsure", label: "I am not sure yet", correctness: "uncertain" },
      ] },
    ],
    guidedPractice: buildPractice(source, derivative, capability, evaluationPoint),
    remediationCheck: remediationCheck(capability),
    remediation: {
      WRONG_DERIVATIVE_RULE: definition.remediationTemplate, OUTER_INNER_REVERSED: "derivative_missing_inner_repair",
      MISSING_INNER_DERIVATIVE: "derivative_missing_inner_repair", PRODUCT_OF_DERIVATIVES: "derivative_product_repair",
      MISSING_PRODUCT_TERM: "derivative_product_repair", QUOTIENT_ORDER_REVERSED: "derivative_quotient_repair",
      MISSING_DENOMINATOR_SQUARE: "derivative_quotient_repair", STANDARD_DERIVATIVE_ERROR: "derivative_standard_function_repair",
      ALGEBRA_SIMPLIFICATION_ERROR: "derivative_rule_worked_example",
    },
    transferTask: { id: "transfer", prompt: evaluationPoint === undefined ? `Without hints, differentiate g(x)=${formatExpression(transferSource)}. Enter only g'(x).` : `Without hints, find the slope of g(x)=${formatExpression(transferSource)} at x=${evaluationPoint}.`, sourceExpression: transferSource, expectedExpression: evaluationPoint === undefined ? transferDerivative : substituteExpression(transferDerivative, { numerator: evaluationPoint, denominator: 1 }) },
    assets: { segments: segments.map((segment) => ({ segmentId: segment.id, videoUrl: null, audioUrl: null, posterUrl: null, captionsUrl: null, durationMs: segment.durationMs, checksum: createHash("sha256").update(`${segment.templateId}:${sourceText}:${segment.transcript}`).digest("hex"), renderMode: "svg_fallback" as const })) },
  });
}
