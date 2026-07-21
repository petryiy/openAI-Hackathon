import { formatExpression } from "@/lib/math/expression";
import type { DerivativeLessonSpec, LessonSpecV1, LessonSpecV2 } from "@/lib/lesson/schema";

type Segment = DerivativeLessonSpec["segments"][number];
type Model = DerivativeLessonSpec["mathModel"];
type PolynomialModel = LessonSpecV1["mathModel"];
type SymbolicModel = LessonSpecV2["mathModel"];

export function LessonVisual({ segment, mathModel, reducedMotion = false }: { segment: Segment; mathModel: Model; reducedMotion?: boolean }) {
  const template = segment.templateId;
  const symbolic = "sourceExpression" in mathModel;
  return (
    <div className="lesson-visual" data-template={template} data-reduced-motion={reducedMotion} role="img" aria-label={`${segment.narration} ${segment.learnerShouldNotice.join("。")}`}>
      <svg viewBox="0 0 960 540" aria-hidden="true">
        <defs>
          <linearGradient id="curve" x1="0" x2="1"><stop stopColor="#71efff"/><stop offset="1" stopColor="#9c78ff"/></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect width="960" height="540" fill="#070b15" />
        <g className="visual-grid"><path d="M80 440H900M120 70V480"/><path d="M120 390H900M120 340H900M120 290H900M120 240H900M120 190H900M120 140H900M200 70V440M280 70V440M360 70V440M440 70V440M520 70V440M600 70V440M680 70V440M760 70V440M840 70V440"/></g>
        {template === "derivative_story_hook" ? <StoryHook /> : null}
        {symbolic ? <SymbolicVisual model={mathModel} template={template} /> : null}
        {!symbolic && ["derivative_secant_to_tangent", "derivative_same_value_different_slope"].includes(template) ? <SecantVisual model={mathModel} counterexample={template.includes("same_value")} /> : null}
        {template === "derivative_limit_definition" ? <LimitVisual /> : null}
        {!symbolic && ["derivative_worked_example", "derivative_algebra_expansion_repair", "derivative_cancel_h_repair"].includes(template) ? <AlgebraVisual model={mathModel} repair={template} /> : null}
        {!symbolic && template === "derivative_function_derivative_link" ? <DerivativeLink model={mathModel} /> : null}
      </svg>
      <div className="lesson-visual__badge"><span>DETERMINISTIC VISUAL</span><strong>{segment.learnerShouldNotice[0]}</strong></div>
    </div>
  );
}

function SymbolicVisual({ model, template }: { model: SymbolicModel; template: string }) {
  const source = formatExpression(model.sourceExpression); const derivative = formatExpression(model.derivativeExpression);
  const isRepair = template.includes("repair");
  if (template === "derivative_rule_story_hook") return <g className="story-hook"><path className="route" d="M145 390C300 380 435 325 585 230S720 160 805 280"/><g className="craft"><path d="M230 335l82 28-77 35-46-31z"/><circle cx="238" cy="366" r="10"/></g><text x="145" y="105">STRUCTURE CONTROLS CHANGE</text><text x="145" y="145">f(x) = {source}</text></g>;
  if (template === "derivative_expression_structure") return <g className="algebra"><text x="140" y="125">READ FROM THE OUTSIDE IN</text><rect x="145" y="175" width="670" height="105" rx="20"/><text x="180" y="238">{source}</text><path className="delta-x" d="M250 330H710"/><text x="315" y="380">primary rule: {model.primaryRule.replace("_", " ")}</text></g>;
  if (isRepair) return <g className="algebra"><text x="150" y="125">REPAIR THE RULE</text><text className="algebra-step" x="150" y="220">f(x) = {source}</text><text className="algebra-step" x="150" y="305">keep every factor, term, sign, and denominator</text><text className="algebra-step step-four" x="150" y="395">f′(x) = {derivative}</text><circle cx="470" cy="378" r="58" className="repair-mark"/></g>;
  return <g className="algebra"><text x="145" y="115">{model.primaryRule.replace("_", " ").toUpperCase()}</text><text className="algebra-step" x="145" y="205">f(x) = {source}</text><path className="delta-y" d="M475 235V315"/><text className="algebra-step step-four" x="145" y="385">f′(x) = {derivative}</text><text x="145" y="445">structure → parts → assemble → simplify</text></g>;
}

function StoryHook() {
  return <g className="story-hook"><path className="gate" d="M760 135V425M850 135V425M760 135H850M760 425H850"/><path className="route" d="M145 390C300 380 435 325 585 230S720 160 805 280"/><g className="craft"><path d="M230 335l82 28-77 35-46-31z"/><circle cx="238" cy="366" r="10"/></g><text x="145" y="105">AVERAGE IS NOT ENOUGH</text><text x="145" y="135">What is changing right now?</text></g>;
}

function SecantVisual({ model, counterexample }: { model: PolynomialModel; counterexample: boolean }) {
  if (counterexample) return <g className="counterexample"><path className="curve-one" d="M135 390C290 365 420 295 545 220S735 125 870 120"/><path className="curve-two" d="M135 155C300 190 430 250 545 300S735 370 870 385"/><circle cx="545" cy="260" r="9"/><path className="tangent-one" d="M390 360L690 155"/><path className="tangent-two" d="M390 190L690 335"/><text x="585" y="245">same value</text><text x="585" y="276">different slopes</text></g>;
  const plot = makePlot(model, false);
  const x0 = model.evaluationPoint;
  const x1 = x0 + 1.8;
  const slope = derivativeAt(model, x0);
  const tangentX0 = x0 - 1.25; const tangentX1 = x0 + 1.25;
  return <g className="secant"><path className="main-curve" d={plot.functionPath}/><circle className="point-a" cx={plot.x(x0)} cy={plot.y(evaluate(model, x0))} r="9"/><circle className="point-b" cx={plot.x(x1)} cy={plot.y(evaluate(model, x1))} r="9"/><path className="secant-line" d={`M${plot.x(x0)} ${plot.y(evaluate(model, x0))}L${plot.x(x1)} ${plot.y(evaluate(model, x1))}`}/><path className="tangent-line" d={`M${plot.x(tangentX0)} ${plot.y(evaluate(model, x0) + slope * (tangentX0 - x0))}L${plot.x(tangentX1)} ${plot.y(evaluate(model, x0) + slope * (tangentX1 - x0))}`}/><text x={plot.x(x0) - 28} y={plot.y(evaluate(model, x0)) + 30}>x={x0}</text><text className="moving-label" x={plot.x(x1) + 8} y={plot.y(evaluate(model, x1)) + 25}>x+h</text><text x="560" y="70">h → 0</text></g>;
}

function LimitVisual() {
  return <g className="limit-visual"><path className="main-curve" d="M135 405C245 400 320 370 395 315S535 190 650 130S805 85 880 82"/><circle cx="395" cy="315" r="9"/><path className="delta-x" d="M395 390H610"/><path className="delta-y" d="M610 390V165"/><text x="480" y="425">Δx = h</text><text x="630" y="290">Δy = f(x+h) − f(x)</text><g className="formula"><text x="185" y="115">f(x+h) − f(x)</text><path d="M175 132H455"/><text x="300" y="172">h</text><text x="485" y="145">→ tangent slope</text></g></g>;
}

function AlgebraVisual({ model, repair }: { model: PolynomialModel; repair: string }) {
  const [, c1, c2, c3] = model.coefficients; const a = model.evaluationPoint;
  const slope = c1 + 2 * c2 * a + 3 * c3 * a * a; const h2 = c2 + 3 * c3 * a;
  const difference = formatPolynomial([0, slope, h2, c3], "h");
  const quotient = formatPolynomial([slope, h2, c3, 0], "h");
  return <g className="algebra"><text x="160" y="135">f(x) = {formatPolynomial(model.coefficients)}, x = {a}</text><text className="algebra-step step-one" x="160" y="210">f({a}+h) − f({a})</text><text className="algebra-step step-two" x="160" y="275">= {difference}</text><text className="algebra-step step-three" x="160" y="340">({difference}) / h = {quotient}</text><text className="algebra-step step-four" x="160" y="405">h → 0  ⇒  f′({a}) = {slope}</text>{repair.includes("repair") ? <g className="repair-mark"><circle cx="425" cy={repair.includes("cancel") ? 326 : 257} r="38"/><text x="485" y={repair.includes("cancel") ? 335 : 266}>{repair.includes("cancel") ? "cancel h first" : "keep every expansion term"}</text></g> : null}</g>;
}

function DerivativeLink({ model }: { model: PolynomialModel }) {
  const plot = makePlot(model, true); const x0 = model.evaluationPoint; const slope = derivativeAt(model, x0);
  return <g className="derivative-link"><path className="main-curve" d={plot.functionPath}/><path className="derivative-curve" d={plot.derivativePath}/><circle className="tracking-point" cx={plot.x(x0)} cy={plot.y(evaluate(model, x0))} r="10"/><circle className="tracking-point" cx={plot.x(x0)} cy={plot.y(slope)} r="7"/><path className="tracking-line" d={`M${plot.x(x0)} ${plot.y(evaluate(model, x0))}V${plot.y(slope)}`}/><text x="145" y="105">f(x): where you are</text><text x="580" y="410">f′(x): how fast it changes</text></g>;
}

function evaluate(model: PolynomialModel, x: number) { return model.coefficients.reduce((sum, coefficient, degree) => sum + coefficient * x ** degree, 0); }
function derivativeAt(model: PolynomialModel, x: number) { return model.coefficients.slice(1).reduce((sum, coefficient, index) => sum + coefficient * (index + 1) * x ** index, 0); }

function makePlot(model: PolynomialModel, includeDerivative: boolean) {
  const xMin = model.evaluationPoint - 3; const xMax = model.evaluationPoint + 3;
  const samples = Array.from({ length: 81 }, (_, index) => xMin + (index / 80) * (xMax - xMin));
  const values = samples.flatMap((x) => includeDerivative ? [evaluate(model, x), derivativeAt(model, x)] : [evaluate(model, x)]);
  let yMin = Math.min(...values); let yMax = Math.max(...values); const padding = Math.max(1, (yMax - yMin) * .12);
  yMin -= padding; yMax += padding;
  const x = (value: number) => 140 + ((value - xMin) / (xMax - xMin)) * 710;
  const y = (value: number) => 420 - ((value - yMin) / (yMax - yMin)) * 330;
  const path = (fn: (value: number) => number) => samples.map((value, index) => `${index === 0 ? "M" : "L"}${x(value).toFixed(1)} ${y(fn(value)).toFixed(1)}`).join("");
  return { x, y, functionPath: path((value) => evaluate(model, value)), derivativePath: path((value) => derivativeAt(model, value)) };
}

function formatPolynomial(coefficients: [number, number, number, number], variable = "x") {
  const terms: string[] = [];
  for (let degree = 3; degree >= 0; degree -= 1) {
    const coefficient = coefficients[degree]; if (coefficient === 0) continue;
    const magnitude = Math.abs(coefficient); const power = degree > 1 ? ["", "", "²", "³"][degree] : "";
    const term = degree === 0 ? String(magnitude) : `${magnitude === 1 ? "" : magnitude}${variable}${power}`;
    terms.push(`${terms.length === 0 ? coefficient < 0 ? "−" : "" : coefficient < 0 ? " − " : " + "}${term}`);
  }
  return terms.join("") || "0";
}
