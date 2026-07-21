# Aha

> Aha turns derivative questions into cinematic visual lessons that diagnose mistakes and adapt the next explanation.

Paste a supported derivative question and Aha verifies it symbolically, asks GPT-5.6 for a constrained English mission, renders a segmented Manim or SVG explanation, pauses twice to diagnose understanding, then checks four rule-specific steps before an unassisted transfer task.

> Story creates a reason to care. Visualization makes the relationship understandable. Interaction checks what the learner noticed. Adaptation chooses what to show next.

**Aha** is the product name. “Plot as proof” remains its teaching rule: story earns attention, but visual evidence and learner action must do the explaining. The derivative lesson is the primary demo; **Moonbase Last Shot** remains a complete offline legacy episode.

## Why it exists

Most AI tutors return another block of explanation. Aha makes an abstract relationship visible, asks the learner to commit to a prediction or mathematical step, and changes the next representation when a recognizable misconception appears. GPT-5.6 supplies narrative energy inside a narrow contract; deterministic code owns mathematical truth, grading, adaptation, and rendering parameters.

## What works now

### Any-topic visual lessons

- **any-topic AI whiteboard lessons**: any English question — or an uploaded PDF — becomes a narrated, animated 3Blue1Brown-style lesson. GPT-5 authors a constrained JSON scene DSL that a fixed browser player (SVG + GSAP + KaTeX) draws in sync with the narration; a background Track B upgrades each segment to a sandboxed cinematic Manim render when a renderer is available;
- word-highlighted captions and animation cues driven by ElevenLabs `with-timestamps` alignment, degrading gracefully to captions when narration is unavailable;

### Primary calculus lesson

- a versioned derivative-first `LessonSpec` flow as the default path for clear derivative questions;
- dynamic power, sum, product, quotient, `sin`/`cos`/`exp`/`ln`, and one-layer chain-rule lessons from a restricted expression AST;
- OpenAI-authored English story hooks and transition language that cannot supply formulas, answers, code, templates, or mathematical truth;
- a roughly 68-second, five-section seeded Manim explanation with committed ElevenLabs English narration and transcript controls;
- exactly two diagnostic pauses with direct answer submission;
- four deterministic, rule-specific expression steps, a required remediation micro-check after a repeated error, and one unassisted transfer problem;
- a safe degree-three polynomial parser with exact rational normalization and misconception-specific remediation;
- twenty-one code-owned Manim templates behind an isolated Docker renderer, with a SymPy verification endpoint, content-addressed output, stable posters, and exact responsive SVG fallback;
- a cinematic single-screen landing page with a real-time 3D Knowledge Portal, custom desktop cursor, technology marquee, and animated handoff into lesson creation;
- polished responsive create, six-stage generation, lesson player, remediation, transfer, and recap experiences;
- desktop and 390×844 lesson QA covering an incorrect diagnostic, remediation, guided recovery, transfer, and recap.

### Retained legacy episode runtime

- a complete offline Moonbase episode in one lunar-rover cockpit;
- the legacy Moonbase episode retains two story decisions with confidence capture;
- separate `StoryState` and `LearnerState` objects;
- deterministic `advance`, `verify`, and `remediate` policy;
- a confident-error branch that compares horizontal launch with free fall;
- exact responsive SVG projectile-motion and gravity visualizations;
- concept-linked BOLT-7 running gag and callback payoff;
- an unassisted table-edge transfer task;
- cautious evidence recap instead of a mastery claim;
- browser-local TTS fallback, captions, keyboard focus, and reduced-motion support;
- server-only GPT-5.6 Responses API integration with structured Zod output;
- server-planned shots, saved failed drafts, and bounded one-click local repair;
- a successful GPT-5.6-generated Chinese probability episode with dynamic story staging;
- deterministic 1000-unit grids, 2×2 conditional tables, and probability trees driven by visualization specs;
- actionable no-key, auth, quota, rate-limit, model-access, schema, and quality-gate states;
- local job/episode persistence behind a storage adapter;
- automated adaptation, schema, reconvergence, visualization, and quality-gate tests.

## Quick start

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), choose **Start a lesson**, and load the derivative sample. The seeded calculus lesson, committed Manim videos, grading, and English narration run without external services.

Optional Manim worker:

```bash
docker build -t plot-as-proof-renderer renderer
docker run --rm --name plot-proof-renderer --read-only --tmpfs /tmp:rw,uid=1000,gid=1000,size=128m --tmpfs /work:rw,uid=1000,gid=1000,size=512m \
  --cap-drop ALL --pids-limit 128 --memory 1g --cpus 1.5 \
  -v "$PWD/.data/lesson-assets:/output" -p 127.0.0.1:8787:8000 plot-as-proof-renderer
```

Set `MANIM_RENDERER_URL=http://127.0.0.1:8787` for new supported lessons. The renderer accepts allowlisted template JSON for derivative lessons, and — for any-topic whiteboard lessons — model-authored Manim scene code at `POST /v1/renders/custom`. That endpoint runs `renderer/validate.py` first (a Python `ast` allowlist: only `manim`/`math`/`numpy` imports, no dunder access, no `open`/`eval`/`exec`/OS/network) and only then executes the scene inside the sandbox.
For a hardened deployment, add `--network none` to the renderer container, put both the web worker and renderer on the same internal Docker network, do not publish the renderer port, and use its internal service address. Track B (the cinematic Manim upgrade) is gated by `TRACK_B_ENABLED` (defaults on when `MANIM_RENDERER_URL` is set), `TRACK_B_MAX_ATTEMPTS` (default 3), `TRACK_B_BUDGET_MS` (default 480000), and the container's `RENDER_CUSTOM_TIMEOUT` (default 150). A cheap liveness probe runs before any code generation, so a configured-but-offline renderer never spends model calls.

Optional natural narration for newly generated lessons (derivative and whiteboard). Narration uses the ElevenLabs `with-timestamps` endpoint so captions highlight the spoken word and whiteboard cues fire on the phrase being narrated; the free tier degrades gracefully to captions when quota is exhausted:

```bash
ELEVEN_LABS=your_server_only_key
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL=eleven_multilingual_v2
```

The reviewed default is the English `George` voice with stable educational pacing. The key remains server-only. Regenerate the committed seeded audio with `renderer/generate_seed_audio.sh`; without a key, the checked-in audio still keeps the demo fully offline.

To enable new-topic generation:

```bash
cp .env.example .env.local
```

Then add `OPENAI_API_KEY` to `.env.local` and restart the server. Never expose it as a `NEXT_PUBLIC_` variable or commit it. The default model is `gpt-5.6`, with low reasoning and a four-minute request bound for the interactive path.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Current verified baseline:

- 61 tests pass;
- TypeScript passes with strict mode;
- ESLint passes;
- Next.js production build succeeds;
- browser QA passes at 1440×900 and 390×844;
- full wrong diagnostic → rule-specific remediation → repeated practice error → required micro-check → transfer → recap path passes;
- unsupported calculus returns a clear scope error with a usable sample, while a supported dynamic question without a key reaches a recoverable configuration pause;
- the live chain-rule acceptance lesson completed through OpenAI, ElevenLabs, independent symbolic verification, and five Manim renders in 84 seconds of teaching media.
- the same chain-rule input publishes with deterministic SVG assets when `MANIM_RENDERER_URL` is configured but the worker is offline.

## Primary demo flow

1. Load `Differentiate f(x)=(x^2+1)^3 and explain the chain rule.`
2. Show that OpenAI supplies the English mission language while the displayed derivative comes from deterministic AST analysis.
3. Complete the first diagnostic incorrectly to show the structure scaffold; there is no confidence prompt.
4. At guided step three, omit the inner derivative twice to trigger the dedicated Manim/SVG repair.
5. Complete the required smaller repair step, return to the original problem, and correct it.
6. Submit the unassisted derivative of `(x^2+2)^2` and show the cautious evidence recap.

The timed voiceover is in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

Copy-ready Devpost text is in [`docs/DEVPOST_SUBMISSION.md`](docs/DEVPOST_SUBMISSION.md).

## Architecture

```text
Create form
   │ POST /api/lessons
   ▼
LessonJob ── GET /api/lesson-jobs/:id ──► status / recoverable error
   │
   ├─ supported derivative input ─► restricted AST + independent symbolic validation
   └─ unsupported input ──────────► UNSUPPORTED_CALCULUS_SCOPE + usable sample
                                      │
                                      ▼
                OpenAI language-only plan + ElevenLabs narration
                                      │
                          validated LessonSpec V2 + assets
                                      │
Lesson player ◄── GET /api/lessons/:id
   │
   ├─ exactly two diagnostic checkpoints
   ├─ POST /attempts ─► exact AST grading ─► targeted remediation + micro-check
   └─ POST /transfer ─► independent evidence ─► cautious recap

Optional renderer: allowlisted JSON ─► isolated Manim worker ─► MP4/poster/VTT
                   renderer unavailable ─► deterministic SVG fallback
```

Important locations:

- `lib/lesson/schema.ts` — primary lesson, state, checkpoint, exercise, and asset contracts;
- `lib/math/expression.ts`, `lib/math/polynomial.ts`, and `lib/lesson/grading.ts` — safe parsing, symbolic differentiation, and deterministic grading;
- `lib/lesson/capabilities.ts` — allowlisted rule recipes, transfer generation, templates, and remediation;
- `components/lesson/` — segmented lesson player and responsive deterministic visuals;
- `renderer/` — isolated Manim/SymPy service and twenty-one allowlisted templates;

- `lib/episode/schema.ts` — shared Zod/TypeScript contracts;
- `lib/episode/moonbase.ts` — release-blocking seeded episode;
- `lib/adaptation/engine.ts` — deterministic runtime policy;
- `lib/ai/provider.ts` — server-only structured GPT-5.6 integration and error classification;
- `lib/ai/schema.ts` — Structured Outputs-compatible model boundary and EpisodeSpec conversion;
- `lib/episode/shot-planner.ts` and `repair.ts` — deterministic publication boundary;
- `components/player/concept-visual.tsx` — spec-driven deterministic teaching visuals;
- `components/player/` — fixed cinematic shell and deterministic visuals;
- `app/api/` — minimum server contract;
- `tests/` and `evals/` — regression safety and product-quality baselines.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for boundaries and [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) for the complete product requirements.

## How GPT-5.6 and Codex are used

### GPT-5.6 writes inside a mathematical safety rail

The committed instantaneous-change lesson does not require a model. For a new symbolic derivative lesson, GPT-5.6 receives already verified facts and returns one Zod-validated `DerivativeLanguagePlan`: a setting, task, consequence, and exactly five short English bridges. Local gates reject formulas, numbers, markup, code, missing segments, and duplicate segments in model-written bridge text.

GPT-5.6 therefore contributes the part that benefits from language and creativity—turning a derivative into a coherent mission—without deciding the derivative, rule, grade, remediation, transfer answer, Manim template, or UI. TypeScript parses and differentiates a restricted expression AST, the capability registry selects the lesson recipe, an isolated SymPy endpoint can independently verify the result, and deterministic code inserts every formula and renderer parameter.

The integration uses `client.responses.parse` with `text.format` and a Zod-derived schema. That matches OpenAI's guidance to use the [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) for new projects and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) when output must follow a schema. The final submission configuration uses the [`gpt-5.6` alias](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

The retained legacy episode runtime also demonstrates a broader structured `EpisodeDraft` workflow with model-authored story content, code-planned shots, semantic gates, and bounded recorded repairs.

### Codex was the product-engineering collaborator

Codex was used across the full build, not only for isolated autocomplete:

- challenged the original “question in, animated video out” framing and helped turn it into an adaptive learning loop;
- translated product conversations into `PRODUCT_SPEC.md`, contracts, architecture decisions, quality gates, and acceptance criteria;
- implemented and iterated on the cinematic onboarding, generation pipeline, lesson player, deterministic math engine, Manim/SVG boundary, narration timing, grading, remediation, transfer, and recap;
- investigated real failures involving provider configuration, Structured Outputs, render latency, unavailable Manim workers, symbolic equivalence, playback synchronization, and route handoff;
- created focused tests and ran type checking, linting, production builds, container smoke tests, and desktop/mobile browser QA; and
- kept both teammates aligned through `AGENTS.md`, `PROJECT_STATE.md`, `docs/DECISIONS.md`, evals, and a shared workflow instead of restarting from the same prompt in every task.

This follows the official [Codex best-practices guidance](https://learn.chatgpt.com/guides/best-practices): treat Codex as a configurable teammate, keep durable guidance in `AGENTS.md`, define what “done” means, and verify changes with tests and review.

## Safety and pedagogy boundaries

- Model output supplies content, never arbitrary product-shell layout.
- Exact formulas, axes, scale, geometry, and numeric relationships use deterministic renderers.
- Generated Python never executes in the Next.js process.
- A single answer is evidence, not proof of mastery.
- Wrong choices get equally polished consequences, never ridicule.
- A missing API key produces a recoverable error rather than fabricated teaching content.

## Deliberate hackathon limitations

- Optional PDF/image extraction is represented in the UI but is not wired into the first vertical slice; pasted text is the supported path.
- Dynamic derivative narration uses ElevenLabs when `ELEVEN_LABS` is configured; failures retain captions and deterministic visuals. The seeded lesson ships committed ElevenLabs audio for offline use.
- Dynamic scope is deliberately finite: limits, integrals, multivariable, implicit differentiation, related rates, piecewise functions, inverse trig, variable exponents, and fractional powers return `UNSUPPORTED_CALCULUS_SCOPE`.
- The seeded lesson ships committed Manim MP4s. The isolated worker is optional for new parameterized lessons; without it, those lessons render through the deterministic SVG visual.
- Local filesystem storage is not suitable for multi-instance production deployment.
- Authentication, classrooms, payments, editing, and long-document ingestion are intentionally out of scope.

## Team workflow

Read `AGENTS.md`, `PROJECT_STATE.md`, and [`docs/TEAM_WORKFLOW.md`](docs/TEAM_WORKFLOW.md) before starting a new task. Work from one issue on one `codex/<task>` branch, verify the scoped change, review the diff, and update project memory before merging.
