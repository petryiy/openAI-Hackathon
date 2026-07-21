# Plot as Proof (working title)

An adaptive visual calculus lesson for OpenAI Build Week’s Education track.

Paste a derivative question and the product teaches it through a segmented visual explanation, pauses twice to diagnose understanding, then asks the learner to complete a difference quotient by hand before an unassisted transfer task.

> Story creates a reason to care. Visualization makes the relationship understandable. Interaction checks what the learner noticed. Adaptation chooses what to show next.

The product name is intentionally still a working title. **Moonbase Last Shot** is the complete seeded demo episode.

## What works now

- a new derivative-first `LessonSpec` flow as the default product path;
- a roughly 68-second, five-section seeded Manim explanation with committed ElevenLabs English narration and transcript controls;
- exactly two diagnostic pauses with direct answer submission;
- four deterministic difference-quotient steps and one unassisted cubic transfer problem;
- a safe degree-three polynomial parser with exact rational normalization and misconception-specific remediation;
- eight code-owned Manim templates behind an isolated Docker renderer, with content-addressed output and exact responsive SVG fallback;
- desktop and 390×844 lesson QA covering confident error, remediation, guided recovery, transfer, and recap;

- a cinematic single-screen landing page with a real-time 3D Knowledge Portal, custom desktop cursor, technology marquee, and an animated handoff into episode creation;
- polished responsive create, generation, player, and recap experiences;
- six observable generation stages with a saved local job record;
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

Open [http://localhost:3000](http://localhost:3000), choose **Start an episode**, and load the derivative sample. The seeded calculus lesson, committed Manim videos, grading, and English narration run without external services.

Optional Manim worker:

```bash
docker build -t plot-as-proof-renderer renderer
docker run --rm --name plot-proof-renderer --read-only --tmpfs /tmp:rw,uid=1000,gid=1000,size=128m --tmpfs /work:rw,uid=1000,gid=1000,size=512m \
  --cap-drop ALL --pids-limit 128 --memory 1g --cpus 1.5 \
  -v "$PWD/.data/lesson-assets:/output" -p 127.0.0.1:8787:8000 plot-as-proof-renderer
```

Set `MANIM_RENDERER_URL=http://127.0.0.1:8787` for new supported lessons. The renderer accepts only allowlisted template JSON; it never executes model-authored Python.
For a hardened deployment, put both the web worker and renderer on the same internal Docker network, do not publish the renderer port, and use its internal service address.

Optional natural narration for newly generated polynomial lessons:

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

- 45 tests pass;
- TypeScript passes with strict mode;
- ESLint passes;
- Next.js production build succeeds;
- browser QA passes at 1440×900 and 390×844;
- full confident-error → remediation → changed-condition → transfer → recap path passes;
- unsupported topics without a key reach a clear, recoverable pause;
- a real Chinese probability episode completes through GPT-5.6 in 85 seconds, publishes after recorded local repair, and plays through transfer and recap.

## Primary demo flow

1. Load “Why does the derivative represent instantaneous rate of change?” and generate the visual lesson.
2. Play the first two narrated sections and choose the confident wrong answer at the secant checkpoint.
3. Show the limit-definition repair, emphasizing that `h → 0` is a process rather than immediate substitution.
4. Complete the worked example and second diagnostic checkpoint.
5. Enter the four difference-quotient steps; repeat an error twice to trigger cancellation remediation.
6. Recover, submit the unassisted cubic transfer answer, and show the cautious evidence recap.

The timed voiceover is in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

## Architecture

```text
Create form
   │ POST /api/lessons
   ▼
LessonJob ── GET /api/lesson-jobs/:id ──► status / recoverable error
   │
   ├─ supported derivative input ─► deterministic extraction + validation
   └─ unsupported input ──────────► UNSUPPORTED_CALCULUS_SCOPE + usable sample
                                      │
                                      ▼
                          validated LessonSpec + assets
                                      │
Lesson player ◄── GET /api/lessons/:id
   │
   ├─ exactly two diagnostic checkpoints
   ├─ POST /attempts ─► exact AST grading ─► targeted remediation
   └─ POST /transfer ─► independent evidence ─► cautious recap

Optional renderer: allowlisted JSON ─► isolated Manim worker ─► MP4/poster/VTT
                   renderer unavailable ─► deterministic SVG fallback
```

Important locations:

- `lib/lesson/schema.ts` — primary lesson, state, checkpoint, exercise, and asset contracts;
- `lib/math/polynomial.ts` and `lib/lesson/grading.ts` — safe parsing and deterministic grading;
- `components/lesson/` — segmented lesson player and responsive deterministic visuals;
- `renderer/` — isolated Manim service and eight allowlisted templates;

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

The derivative vertical slice does not require a model: math extraction, validation, grading, adaptation, and visual parameters are deterministic. The retained legacy episode generator can use GPT-5.6 for structured content planning, but model output never supplies mathematical truth or executable renderer code. Official references: [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Models](https://developers.openai.com/api/docs/models).

Codex was used as the primary product-engineering collaborator for specification synthesis, architecture, UI implementation, adaptation logic, test creation, production-build repair, and browser QA. The repository’s `AGENTS.md`, decision log, state file, evals, and PR template make those improvements durable across both teammates’ future Codex tasks.

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
- The seeded lesson ships committed Manim MP4s. The isolated worker is optional for new parameterized lessons; without it, those lessons render through the deterministic SVG visual.
- Local filesystem storage is not suitable for multi-instance production deployment.
- Authentication, classrooms, payments, editing, and long-document ingestion are intentionally out of scope.

## Team workflow

Read `AGENTS.md`, `PROJECT_STATE.md`, and [`docs/TEAM_WORKFLOW.md`](docs/TEAM_WORKFLOW.md) before starting a new task. Work from one issue on one `codex/<task>` branch, verify the scoped change, review the diff, and update project memory before merging.
