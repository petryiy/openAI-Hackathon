import { createHash, randomUUID } from "node:crypto";
import { parsePolynomial, polynomialCoefficients } from "@/lib/math/polynomial";
import { LessonSpecSchema, type LessonSpec } from "@/lib/lesson/schema";
import { isSupportedDerivativeSource, seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";

export class UnsupportedCalculusScopeError extends Error {
  code = "UNSUPPORTED_CALCULUS_SCOPE" as const;
}

function extractModel(source: string) {
  const expressionMatch = source.match(/f\s*\(\s*x\s*\)\s*=\s*([^,;\n]+?)(?=\s+at\s+x\s*=|$)/i);
  const pointMatch = source.match(/at\s+x\s*=\s*(-?\d+)/i);
  if (!expressionMatch) return seededDerivativeLesson.mathModel;
  try {
    const coefficients = polynomialCoefficients(parsePolynomial(expressionMatch[1]));
    const evaluationPoint = pointMatch ? Number(pointMatch[1]) : 1;
    if (!coefficients || coefficients.some((value) => !Number.isInteger(value) || Math.abs(value) > 12) || Math.abs(evaluationPoint) > 6) throw new Error("out of range");
    return { coefficients, evaluationPoint, variable: "x" as const };
  } catch {
    throw new UnsupportedCalculusScopeError("Use an integer-coefficient polynomial of degree three or less, with an evaluation point from -6 to 6.");
  }
}

function formatPolynomial(coefficients: [number, number, number, number], variable = "x") {
  const terms: string[] = [];
  for (let degree = 3; degree >= 0; degree -= 1) {
    const coefficient = coefficients[degree];
    if (coefficient === 0) continue;
    const magnitude = Math.abs(coefficient);
    const factor = degree === 0 ? String(magnitude) : `${magnitude === 1 ? "" : magnitude}${variable}${degree > 1 ? `^${degree}` : ""}`;
    terms.push(`${terms.length === 0 ? coefficient < 0 ? "-" : "" : coefficient < 0 ? " - " : " + "}${factor}`);
  }
  return terms.join("") || "0";
}

function workedExampleCopy(model: LessonSpec["mathModel"]) {
  const [, c1, c2, c3] = model.coefficients;
  const a = model.evaluationPoint;
  const slope = c1 + 2 * c2 * a + 3 * c3 * a * a;
  const h2 = c2 + 3 * c3 * a;
  const difference = formatPolynomial([0, slope, h2, c3], "h");
  const quotient = formatPolynomial([slope, h2, c3, 0], "h");
  const formula = formatPolynomial(model.coefficients);
  return {
    narration: `For f of x equals ${formula} at x equals ${a}, full expansion gives a function-value difference of ${difference}. Divide by h and cancel to get ${quotient}. As h tends to zero, the slope tends to ${slope}.`,
    transcript: `f(x)=${formula}, x=${a}; f(${a}+h)-f(${a})=${difference}; divide by h to get ${quotient}; therefore f′(${a})=${slope}.`,
    learnerShouldNotice: ["Cancel h before taking the limit", `The final ${slope} is a tangent slope, not a function value`],
  };
}

export function buildDerivativeLesson(sourceInput: string, locale: "en"): LessonSpec {
  if (!isSupportedDerivativeSource(sourceInput)) {
    throw new UnsupportedCalculusScopeError("This version supports only derivatives, instantaneous rate of change, and polynomials of degree three or less. Try the seeded derivative example.");
  }
  const mathModel = extractModel(sourceInput);
  const segments = seededDerivativeLesson.segments.map((segment) => segment.id === "example" ? { ...segment, ...workedExampleCopy(mathModel) } : segment);
  const usesSeedAudio = JSON.stringify(mathModel) === JSON.stringify(seededDerivativeLesson.mathModel);
  return LessonSpecSchema.parse({
    ...seededDerivativeLesson,
    id: `lesson-${randomUUID()}`,
    locale,
    sourceInput,
    mathModel,
    segments,
    checkpoints: seededDerivativeLesson.checkpoints.map((checkpoint) => checkpoint.id === "checkpoint-meaning"
      ? { ...checkpoint, prompt: `If two functions have the same value at x=${mathModel.evaluationPoint}, must they also have the same derivative there?` }
      : checkpoint),
    assets: {
      segments: segments.map((segment) => ({
        segmentId: segment.id,
        videoUrl: usesSeedAudio ? `/lesson-assets/derivative-seed/${segment.id}.mp4` : null,
        audioUrl: usesSeedAudio ? `/lesson-assets/derivative-seed/${segment.id}.mp3` : null,
        posterUrl: usesSeedAudio ? `/lesson-assets/derivative-seed/${segment.id}.png` : null,
        captionsUrl: usesSeedAudio ? `/lesson-assets/derivative-seed/${segment.id}.vtt` : null,
        durationMs: segment.durationMs,
        checksum: usesSeedAudio ? seededDerivativeLesson.assets.segments.find((asset) => asset.segmentId === segment.id)!.checksum : createHash("sha256").update(`${segment.templateId}:${segment.transcript}`).digest("hex").slice(0, 16),
        renderMode: usesSeedAudio ? "manim" as const : "svg_fallback" as const,
      })),
    },
  });
}
