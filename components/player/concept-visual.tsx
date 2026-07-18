import type { EpisodeSpec } from "@/lib/episode/schema";
import {
  formatCount,
  formatPercent,
  parseProbabilityMetrics,
  type ProbabilityMetrics,
} from "@/lib/episode/visual-metrics";

type TeachingVisual = EpisodeSpec["visualizations"][number];

export function ConceptVisual({ visual }: { visual: TeachingVisual }) {
  const metrics = parseProbabilityMetrics(visual);

  if (metrics && ["spatial_model", "probability_model"].includes(visual.type)) {
    return <PopulationModel visual={visual} metrics={metrics} />;
  }
  if (metrics && visual.type === "side_by_side_comparison") {
    return <ContingencyTable visual={visual} metrics={metrics} />;
  }
  if (metrics && ["process_animation", "diagram"].includes(visual.type)) {
    return <ProbabilityTree visual={visual} metrics={metrics} />;
  }
  return <StructuredDiagram visual={visual} />;
}

function VisualHeader({ visual, label }: { visual: TeachingVisual; label: string }) {
  return (
    <div className="visual-heading concept-visual-heading">
      <span>{label} / DETERMINISTIC SVG</span>
      <strong>{visual.learnerShouldNotice[0] ?? visual.learningPurpose}</strong>
    </div>
  );
}

function PopulationModel({ visual, metrics }: { visual: TeachingVisual; metrics: ProbabilityMetrics }) {
  const cellCount = 1000;
  const scale = cellCount / metrics.base;
  const diseasedCells = Math.round(metrics.diseased * scale);
  const truePositiveCells = Math.round(metrics.truePositive * scale);
  const falsePositiveCells = Math.round(metrics.falsePositive * scale);
  const ppv = formatPercent(metrics.positivePredictiveValue);

  return (
    <div className="teaching-visual concept-visual" role="img" aria-label={`${visual.learningPurpose} True positives ${formatCount(metrics.truePositive)}, false positives ${formatCount(metrics.falsePositive)}, positive predictive value ${ppv}.`}>
      <VisualHeader visual={visual} label={`${formatCount(metrics.base)}-UNIT MODEL`} />
      <div className="population-layout">
        <svg className="population-grid" viewBox="0 0 408 258" aria-hidden="true">
          {Array.from({ length: cellCount }, (_, index) => {
            const column = index % 40;
            const row = Math.floor(index / 40);
            const diseased = index < diseasedCells;
            const positive = index < truePositiveCells || (index >= diseasedCells && index < diseasedCells + falsePositiveCells);
            return (
              <rect
                key={index}
                x={column * 10 + 4}
                y={row * 10 + 4}
                width="7.2"
                height="7.2"
                rx="1.4"
                className={`${diseased ? "population-diseased" : "population-healthy"} ${positive ? "population-positive" : ""}`}
              />
            );
          })}
        </svg>
        <div className="probability-summary">
          <div className="probability-legend"><span><i className="legend-diseased" />Condition</span><span><i className="legend-healthy" />No condition</span><span><i className="legend-positive" />Positive result</span></div>
          <div className="metric-pair"><span>True positive<strong>{formatCount(metrics.truePositive)}</strong></span><span>False positive<strong>{formatCount(metrics.falsePositive)}</strong></span></div>
          <div className="ppv-result"><small>Among all positive results</small><strong>{ppv}</strong><span>{formatCount(metrics.truePositive)} ÷ ({formatCount(metrics.truePositive)} + {formatCount(metrics.falsePositive)})</span></div>
        </div>
      </div>
    </div>
  );
}

function ContingencyTable({ visual, metrics }: { visual: TeachingVisual; metrics: ProbabilityMetrics }) {
  const ppv = formatPercent(metrics.positivePredictiveValue);
  return (
    <div className="teaching-visual concept-visual" role="img" aria-label={`${visual.learningPurpose} Two by two table: true positive ${formatCount(metrics.truePositive)}, false positive ${formatCount(metrics.falsePositive)}.`}>
      <VisualHeader visual={visual} label="CONDITION × TEST RESULT" />
      <div className="contingency-layout">
        <div className="contingency-table" aria-hidden="true">
          <span className="table-corner">{formatCount(metrics.base)} total</span><strong>Positive</strong><strong>Negative</strong>
          <strong>Condition</strong><span className="cell-positive cell-diseased">TP<b>{formatCount(metrics.truePositive)}</b></span><span className="cell-diseased">FN<b>{formatCount(metrics.falseNegative)}</b></span>
          <strong>No condition</strong><span className="cell-positive cell-healthy">FP<b>{formatCount(metrics.falsePositive)}</b></span><span className="cell-healthy">TN<b>{formatCount(metrics.trueNegative)}</b></span>
        </div>
        <div className="condition-switch"><span>P(positive | condition)<b>{formatPercent(metrics.sensitivity)}</b></span><i>≠</i><span>P(condition | positive)<b>{ppv}</b></span><small>The question changes which group becomes the denominator.</small></div>
      </div>
    </div>
  );
}

function ProbabilityTree({ visual, metrics }: { visual: TeachingVisual; metrics: ProbabilityMetrics }) {
  const p = formatPercent(metrics.prevalence);
  const notP = formatPercent(1 - metrics.prevalence);
  return (
    <div className="teaching-visual concept-visual" role="img" aria-label={`${visual.learningPurpose} The positive result has two paths, with weights ${formatCount(metrics.truePositive)} and ${formatCount(metrics.falsePositive)} per ${formatCount(metrics.base)}.`}>
      <VisualHeader visual={visual} label="PATH WEIGHTS" />
      <svg className="probability-tree" viewBox="0 0 680 300" aria-hidden="true">
        <g className="tree-lines"><path d="M92 150 L260 78 M92 150 L260 222 M300 78 L498 50 M300 78 L498 112 M300 222 L498 190 M300 222 L498 252" /></g>
        <g className="tree-node tree-root"><rect x="26" y="126" width="132" height="48" rx="14" /><text x="92" y="155">{formatCount(metrics.base)} cases</text></g>
        <g className="tree-node"><rect x="218" y="53" width="124" height="50" rx="14" /><text x="280" y="75">Condition</text><text className="tree-number" x="280" y="92">{p}</text></g>
        <g className="tree-node"><rect x="218" y="197" width="124" height="50" rx="14" /><text x="280" y="219">No condition</text><text className="tree-number" x="280" y="236">{notP}</text></g>
        <g className="tree-endpoint tree-endpoint-positive"><rect x="478" y="28" width="170" height="46" rx="13" /><text x="563" y="48">Positive</text><text className="tree-number" x="563" y="65">TP {formatCount(metrics.truePositive)}</text></g>
        <g className="tree-endpoint"><rect x="478" y="90" width="170" height="46" rx="13" /><text x="563" y="118">Negative · {formatCount(metrics.falseNegative)}</text></g>
        <g className="tree-endpoint tree-endpoint-positive"><rect x="478" y="168" width="170" height="46" rx="13" /><text x="563" y="188">Positive</text><text className="tree-number" x="563" y="205">FP {formatCount(metrics.falsePositive)}</text></g>
        <g className="tree-endpoint"><rect x="478" y="230" width="170" height="46" rx="13" /><text x="563" y="258">Negative · {formatCount(metrics.trueNegative)}</text></g>
        <text className="tree-branch-label" x="367" y="53">× {formatPercent(metrics.sensitivity)}</text>
        <text className="tree-branch-label" x="367" y="103">× {formatPercent(1 - metrics.sensitivity)}</text>
        <text className="tree-branch-label" x="367" y="184">× {formatPercent(1 - metrics.specificity)}</text>
        <text className="tree-branch-label" x="367" y="253">× {formatPercent(metrics.specificity)}</text>
      </svg>
      <div className="visual-equation"><span>positive paths: {formatCount(metrics.truePositive)} + {formatCount(metrics.falsePositive)}</span><span className="equation-arrow">→</span><strong>PPV {formatPercent(metrics.positivePredictiveValue)}</strong></div>
    </div>
  );
}

function StructuredDiagram({ visual }: { visual: TeachingVisual }) {
  const steps = (visual.learnerShouldNotice.length ? visual.learnerShouldNotice : visual.variablesOrLabels).slice(0, 4);
  return (
    <div className="teaching-visual concept-visual structured-diagram" role="img" aria-label={`${visual.learningPurpose}. ${steps.join(". ")}`}>
      <VisualHeader visual={visual} label={visual.type.replaceAll("_", " ").toUpperCase()} />
      <div className="structured-diagram-flow" aria-hidden="true">
        {steps.map((step, index) => <div key={`${step}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p>{index < steps.length - 1 ? <i>→</i> : null}</div>)}
      </div>
      <div className="diagram-abstraction"><small>Representation</small><strong>{visual.abstractRepresentation ?? visual.concreteRepresentation ?? visual.deterministicFallback}</strong></div>
    </div>
  );
}
