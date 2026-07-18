import type { EpisodeSpec } from "@/lib/episode/schema";

type TeachingVisual = EpisodeSpec["visualizations"][number];

export type ProbabilityMetrics = {
  base: number;
  prevalence: number;
  sensitivity: number;
  specificity: number;
  diseased: number;
  healthy: number;
  truePositive: number;
  falseNegative: number;
  falsePositive: number;
  trueNegative: number;
  positivePredictiveValue: number;
};

function readRate(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return match[2] === "%" || value > 1 ? value / 100 : value;
}

function readNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function parseProbabilityMetrics(visual: TeachingVisual): ProbabilityMetrics | null {
  const text = [
    ...visual.variablesOrLabels,
    visual.concreteRepresentation,
    visual.abstractRepresentation,
    visual.learningPurpose,
  ]
    .filter(Boolean)
    .join(" · ");

  const prevalence =
    readRate(text, /(?:\bp|prevalence|患病率|基准率)\s*[=:为]?\s*(\d+(?:\.\d+)?)\s*(%?)/i) ?? null;
  const sensitivity =
    readRate(text, /(?:\bSe|sensitivity|灵敏度|命中率)\s*[=:为]?\s*(\d+(?:\.\d+)?)\s*(%?)/i) ?? null;
  const specificity =
    readRate(text, /(?:\bSp|specificity|特异度|放行率)\s*[=:为]?\s*(\d+(?:\.\d+)?)\s*(%?)/i) ?? null;

  if (prevalence === null || sensitivity === null || specificity === null) return null;
  if ([prevalence, sensitivity, specificity].some((value) => value < 0 || value > 1)) return null;

  const base = readNumber(text, /(?:总体|总计|取|共|SVG\s*)?\s*(\d{3,5})\s*(?:人|格|封|个)/i) ?? 1000;
  const diseased = base * prevalence;
  const healthy = base - diseased;
  const derivedTruePositive = diseased * sensitivity;
  const derivedFalsePositive = healthy * (1 - specificity);
  const truePositive = readNumber(text, /\bTP\s*=\s*(\d+(?:\.\d+)?)/i) ?? derivedTruePositive;
  const falsePositive = readNumber(text, /\bFP\s*=\s*(\d+(?:\.\d+)?)/i) ?? derivedFalsePositive;
  const denominator = truePositive + falsePositive;

  return {
    base,
    prevalence,
    sensitivity,
    specificity,
    diseased,
    healthy,
    truePositive,
    falseNegative: Math.max(0, diseased - truePositive),
    falsePositive,
    trueNegative: Math.max(0, healthy - falsePositive),
    positivePredictiveValue: denominator ? truePositive / denominator : 0,
  };
}

export function formatCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatPercent(value: number) {
  const percentage = value * 100;
  return `${percentage >= 10 ? percentage.toFixed(1) : percentage.toFixed(2)}%`.replace(/\.0%$/, "%");
}
