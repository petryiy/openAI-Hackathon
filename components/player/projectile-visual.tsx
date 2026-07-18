export type ProjectileMode = "trajectory" | "split_experiment" | "gravity";

export function ProjectileVisual({ mode }: { mode: ProjectileMode }) {
  if (mode === "split_experiment") return <SplitExperiment />;
  if (mode === "gravity") return <GravityComparison />;
  return <CoreTrajectory />;
}

function CoreTrajectory() {
  return (
    <div className="teaching-visual" role="img" aria-label="Two capsules launched horizontally at different speeds land at the same time; the faster capsule travels twice as far.">
      <div className="visual-heading"><span>TRAJECTORY DISPLAY / SAME HEIGHT + SAME g</span><strong>What changes?</strong></div>
      <svg viewBox="0 0 620 310" aria-hidden="true">
        <defs>
          <marker id="cyan-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="var(--cyan)" /></marker>
          <marker id="amber-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="var(--amber)" /></marker>
        </defs>
        <line className="ground-line" x1="44" y1="266" x2="582" y2="266" />
        <line className="height-guide" x1="70" y1="55" x2="70" y2="266" />
        <text className="svg-muted" x="48" y="165">h</text>
        <path className="trajectory trajectory--slow" d="M70 55 C170 55 194 130 260 266" />
        <path className="trajectory trajectory--fast" d="M70 55 C280 55 410 130 540 266" />
        <line className="vector vector--cyan" x1="76" y1="70" x2="158" y2="70" markerEnd="url(#cyan-arrow)" />
        <line className="vector vector--cyan" x1="76" y1="40" x2="238" y2="40" markerEnd="url(#cyan-arrow)" />
        <text className="svg-cyan" x="112" y="92">vₓ</text>
        <text className="svg-cyan" x="145" y="30">2vₓ</text>
        <line className="vector vector--amber pulse" x1="90" y1="82" x2="90" y2="140" markerEnd="url(#amber-arrow)" />
        <text className="svg-amber" x="101" y="123">g</text>
        <line className="sync-line" x1="170" y1="143" x2="338" y2="143" />
        <circle className="time-dot slow" cx="170" cy="143" r="6" />
        <circle className="time-dot fast" cx="338" cy="143" r="6" />
        <text className="svg-muted" x="234" y="133">same t</text>
        <line className="sync-line" x1="260" y1="266" x2="540" y2="266" />
        <circle className="landing-dot" cx="260" cy="266" r="8" />
        <circle className="landing-dot" cx="540" cy="266" r="8" />
        <text className="svg-amber" x="350" y="292">same landing time</text>
        <text className="svg-cyan" x="162" y="250">x</text>
        <text className="svg-cyan" x="438" y="250">2x</text>
      </svg>
      <div className="visual-equation"><span>t = √(2h/g)</span><span className="equation-arrow">→</span><strong>x = vₓt</strong></div>
    </div>
  );
}

function SplitExperiment() {
  return (
    <div className="teaching-visual" role="img" aria-label="A dropped spanner and a horizontally launched capsule have synchronized vertical motion and land at the same time.">
      <div className="visual-heading"><span>SAFE TEST / TWO OBJECTS</span><strong>Watch the amber height</strong></div>
      <svg viewBox="0 0 620 310" aria-hidden="true">
        <line className="panel-divider" x1="310" y1="24" x2="310" y2="282" />
        <text className="svg-label" x="92" y="40">DROP</text>
        <text className="svg-label" x="401" y="40">LAUNCH</text>
        <line className="ground-line" x1="42" y1="260" x2="278" y2="260" />
        <line className="ground-line" x1="342" y1="260" x2="578" y2="260" />
        <path className="drop-path" d="M158 60 L158 260" />
        <path className="trajectory trajectory--fast" d="M370 60 C436 60 496 128 550 260" />
        {[0, 1, 2].map((item) => {
          const y = [60, 122, 220][item];
          const x = [370, 449, 531][item];
          return <g key={item}><line className="sync-line" x1="158" y1={y} x2={x} y2={y} /><circle className="time-dot slow" cx="158" cy={y} r="7" /><circle className="time-dot fast" cx={x} cy={y} r="7" /><text className="svg-amber" x="285" y={y - 8}>t{item}</text></g>;
        })}
        <text className="svg-muted" x="62" y="289">no horizontal speed</text>
        <text className="svg-cyan" x="407" y="289">horizontal speed ≠ fall speed</text>
      </svg>
      <div className="visual-callout"><span className="amber-dot" />Vertical motion stays in lockstep.</div>
    </div>
  );
}

function GravityComparison() {
  return (
    <div className="teaching-visual" role="img" aria-label="With weaker gravity, a capsule remains in flight longer and travels farther horizontally at the same speed.">
      <div className="visual-heading"><span>GRAVITY FAULT / SAME vₓ</span><strong>Changed condition</strong></div>
      <svg viewBox="0 0 620 310" aria-hidden="true">
        <line className="ground-line" x1="42" y1="264" x2="582" y2="264" />
        <path className="trajectory trajectory--normal-g" d="M72 62 C180 62 230 146 294 264" />
        <path className="trajectory trajectory--low-g" d="M72 62 C250 62 408 130 554 264" />
        <text className="svg-amber" x="246" y="232">g</text>
        <text className="svg-amber" x="468" y="222">0.5g</text>
        <line className="time-bracket" x1="294" y1="281" x2="554" y2="281" />
        <text className="svg-cyan" x="350" y="302">extra time → extra x</text>
        <circle className="landing-dot" cx="294" cy="264" r="8" />
        <circle className="landing-dot" cx="554" cy="264" r="8" />
        <g className="causal-chain">
          <rect x="104" y="96" width="92" height="42" rx="10" /><text x="128" y="123">g ↓</text>
          <text x="204" y="123">→</text>
          <rect x="226" y="96" width="92" height="42" rx="10" /><text x="250" y="123">t ↑</text>
          <text x="326" y="123">→</text>
          <rect x="348" y="96" width="92" height="42" rx="10" /><text x="372" y="123">x ↑</text>
        </g>
      </svg>
      <div className="visual-equation"><span>t = √(2h/g)</span><span className="equation-arrow">→</span><strong>x = vₓt</strong></div>
    </div>
  );
}

export function TransferVisual() {
  return (
    <div className="transfer-visual" role="img" aria-label="Two balls roll off the same table with different horizontal speeds.">
      <svg viewBox="0 0 620 220" aria-hidden="true">
        <path className="table-shape" d="M70 72 H300 V92 H104 V210 H84 V92 H70Z" />
        <circle className="ball ball-a" cx="238" cy="58" r="13" />
        <circle className="ball ball-b" cx="285" cy="58" r="13" />
        <path className="transfer-path path-a" d="M238 58 C320 58 330 142 356 200" />
        <path className="transfer-path path-b" d="M285 58 C420 58 488 142 552 200" />
        <line className="ground-line" x1="72" y1="200" x2="580" y2="200" />
        <text className="svg-label" x="204" y="34">A · vₓ</text>
        <text className="svg-label" x="280" y="34">B · 2vₓ</text>
        <text className="svg-muted" x="396" y="188">same height</text>
      </svg>
    </div>
  );
}
