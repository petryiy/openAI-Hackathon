import { buildSymbolicDerivativeLesson } from "@/lib/lesson/capabilities";
import { CHAIN_RULE_SAMPLE, DERIVATIVE_SAMPLE } from "@/lib/lesson/constants";
import { seededChainRuleLesson } from "@/lib/lesson/seeded-chain-rule";
import { seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";
import { evaluateExpression, parseMathExpression } from "@/lib/math/expression";
import type { DerivativeLessonSpec } from "@/lib/lesson/schema";

export class UnsupportedCalculusScopeError extends Error {
  code = "UNSUPPORTED_CALCULUS_SCOPE" as const;
}

const UNSUPPORTED_TOPICS = /\b(integral|integrate|limit|multivariable|partial derivative|implicit|related rates?|piecewise|arcsin|arccos|arctan)\b/i;
const DERIVATIVE_INTENT = /\b(derivative|differentiate|instantaneous (?:rate|change)|rate of change|slope|chain rule|product rule|quotient rule|power rule)\b/i;

/**
 * The flagship derivative pipeline handles inputs that clearly ask for a
 * one-variable derivative and stay inside the supported grammar. Everything
 * else (any other topic, or a PDF upload) routes to the generic whiteboard
 * pipeline instead of being rejected.
 */
export function isDerivativeScope(source: string): boolean {
  return DERIVATIVE_INTENT.test(source) && !UNSUPPORTED_TOPICS.test(source);
}

function extractExpression(source: string) {
  const equation = source.match(/(?:f|g|y)\s*\(?(?:x)?\)?\s*=\s*(.+)/i);
  let candidate = equation?.[1] ?? source.match(/(?:differentiate|derivative of)\s+(.+)/i)?.[1];
  if (!candidate && /chain rule/i.test(source)) candidate = "(x^2+1)^3";
  if (!candidate && /product rule/i.test(source)) candidate = "x^2*sin(x)";
  if (!candidate && /quotient rule/i.test(source)) candidate = "(x^2+1)/(x-1)";
  if (!candidate && /power rule/i.test(source)) candidate = "x^4";
  if (!candidate) throw new UnsupportedCalculusScopeError("Enter a supported one-variable derivative expression, such as f(x)=(x^2+1)^3.");
  return candidate
    .replace(/\s+(?:at|when)\s+x\s*=.*$/i, "")
    .replace(/\s+and\s+(?:explain|show|use).*$/i, "")
    .replace(/\s+(?:using|with)\s+(?:the\s+)?(?:power|sum|product|quotient|chain)\s+rule.*$/i, "")
    .replace(/[?.]+$/, "").trim();
}

function extractEvaluationPoint(source: string) {
  const match = source.match(/(?:at|when)\s+x\s*=\s*(-?\d+)/i);
  if (!match) return undefined;
  const point = Number(match[1]);
  if (!Number.isInteger(point) || point < -6 || point > 6) throw new UnsupportedCalculusScopeError("The evaluation point must be an integer from -6 to 6.");
  return point;
}

export function buildDerivativeLesson(sourceInput: string, locale: "en"): DerivativeLessonSpec {
  if (locale !== "en") throw new UnsupportedCalculusScopeError("Only English lessons are supported.");
  if (sourceInput.trim() === DERIVATIVE_SAMPLE) return seededDerivativeLesson;
  if (sourceInput.trim() === CHAIN_RULE_SAMPLE) return seededChainRuleLesson;
  if (!DERIVATIVE_INTENT.test(sourceInput) || UNSUPPORTED_TOPICS.test(sourceInput)) {
    throw new UnsupportedCalculusScopeError("This version supports one-variable derivatives using power, sum, product, quotient, standard-function, and simple chain rules. Try f(x)=(x^2+1)^3.");
  }
  try {
    const expression = parseMathExpression(extractExpression(sourceInput));
    const evaluationPoint = extractEvaluationPoint(sourceInput);
    if (evaluationPoint !== undefined && !Number.isFinite(evaluateExpression(expression, evaluationPoint))) {
      throw new UnsupportedCalculusScopeError("The function must be defined at the requested evaluation point.");
    }
    return buildSymbolicDerivativeLesson(sourceInput, expression, evaluationPoint === undefined ? "differentiate" : "slope_at_point", evaluationPoint);
  } catch (error) {
    if (error instanceof UnsupportedCalculusScopeError) throw error;
    throw new UnsupportedCalculusScopeError((error as Error).message || "The derivative expression is outside the supported capability registry.");
  }
}
