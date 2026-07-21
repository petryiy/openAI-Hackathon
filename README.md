# Aha

> Aha turns STEM questions and course materials into adaptive visual lessons that explain ideas, check understanding, and improve the next representation.

Ask an English STEM question or attach a PDF. Aha uses GPT-5.6 Sol to plan a structured lesson, publishes an animated whiteboard within a fixed SVG/GSAP/KaTeX player, synchronizes it to narration, and then upgrades successful segments to cinematic Manim renders in the background. Checkpoints turn the result from a generated video into an active learning experience.

> Story creates a reason to care. Visualization makes the relationship understandable. Interaction checks what the learner noticed. Adaptation chooses what to show next.

**Aha** is the product name. “Plot as proof” remains its teaching rule: story earns attention, but visual evidence and learner action must do the explaining. The any-topic STEM lesson is the primary product path.

## Why it exists

Most AI tutors return another block of explanation. Aha gives STEM students a visual sequence they can inspect, replay, and respond to. GPT-5.6 Sol structures the lesson and visual intent inside constrained contracts; a fixed browser renderer makes the first explanation available quickly, while a sandboxed Manim pipeline attempts a more cinematic representation without blocking the learner.

## What works now

### Any-topic STEM lessons

- English STEM questions — or an uploaded PDF up to 20 MB — enter the `LessonSpecV3` pipeline and become a 3–8 segment narrated lesson with inline multiple-choice checkpoints;
- GPT-5.6 Sol authors a constrained JSON scene DSL that a fixed browser player renders with SVG, GSAP, and KaTeX; local validation and sanitization repair missing axes, dangling references, and unusable narration anchors before publication;
- deterministic checks verify machine-expressible derivative, equivalence, and evaluation claims, while a second structured model pass records advisory fact-check notes;
- ElevenLabs `with-timestamps` alignment drives word-highlighted captions and animation cues, degrading to captions and a synthetic lesson clock when narration is unavailable;
- after the whiteboard lesson publishes, Track B generates and renders a cinematic Manim version of each segment in the background, hot-swapping successful MP4s while failed segments remain fully usable whiteboards;

## Quick start

The complete Aha experience uses all three runtime services: OpenAI for lesson and Manim-scene planning, ElevenLabs for narration and word-level timing, and the isolated Docker renderer for cinematic Manim upgrades.

### Requirements

- Node.js 20 or newer;
- pnpm 11 (the repository pins `pnpm@11.9.0`);
- Docker Desktop or Docker Engine with at least 1 GB of memory available to the renderer;
- an OpenAI API key with access to `gpt-5.6-sol` and sufficient API billing or credits;
- an ElevenLabs API key with sufficient character credits for multi-segment narration;
- local ports `3000` and `8787` available.

### Configure the services

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in the two server-only credentials. Do not prefix either key with `NEXT_PUBLIC_`, expose them to the browser, or commit the file:

```dotenv
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6-sol
OPENAI_REASONING_EFFORT=high
OPENAI_TIMEOUT_MS=240000

ELEVEN_LABS=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL=eleven_multilingual_v2

MANIM_RENDERER_URL=http://127.0.0.1:8787
TRACK_B_ENABLED=true
TRACK_B_MAX_ATTEMPTS=3
TRACK_B_BUDGET_MS=480000
```

`OPENAI_API_KEY` is used by the Responses API for the whiteboard lesson, its structured fact review, PDF input through the Files API, and per-segment Manim code generation. `ELEVEN_LABS` is used by the `with-timestamps` endpoint to produce narration plus character-level alignment. The checked-in voice is George with `eleven_multilingual_v2`.

### Install and start Aha

Install the web dependencies:

```bash
pnpm install
```

Build and start the renderer first:

```bash
mkdir -p .data/lesson-assets
docker build -t plot-as-proof-renderer renderer
docker run --rm --name plot-proof-renderer --read-only --tmpfs /tmp:rw,uid=1000,gid=1000,size=128m --tmpfs /work:rw,uid=1000,gid=1000,size=512m \
  --cap-drop ALL --pids-limit 128 --memory 1g --cpus 1.5 \
  -e RENDER_CUSTOM_TIMEOUT=150 \
  -v "$PWD/.data/lesson-assets:/output" -p 127.0.0.1:8787:8000 plot-as-proof-renderer
```

Keep that terminal open. In a second terminal, start the web application:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The renderer is deliberately isolated from the Next.js process: custom Manim code must pass `renderer/validate.py` before it can execute inside the resource-limited container. The validator allows only the reviewed `manim`, `math`, and `numpy` imports and rejects filesystem, OS, network, dynamic execution, and dunder access.

### Test the complete flow

1. Confirm the renderer container is running:

```bash
docker ps --filter name=plot-proof-renderer
```

2. Open `/create` and submit an English STEM question, for example:

   ```text
   Why does Bayes' theorem let a positive medical test still be probably wrong?
   ```

3. Verify the loading page advances through all six stages and redirects to the generated lesson.
4. Play the lesson and confirm that the first representation is an animated whiteboard with formulas, plots, narration, word-highlighted captions, and an inline checkpoint.
5. Answer the checkpoint and continue to ensure learner state and recap behavior work.
6. Leave the lesson open while Track B works in the background. Successful segments should hot-swap to muted Manim MP4s; the lesson polls for upgrades every five seconds and swaps only at a safe playback boundary.
7. Confirm `.data/lessons/<lesson-id>.json` records each `upgrade.trackB` entry as `complete` or `failed`, and that completed assets use `renderMode: "manim"` with a `videoUrl`.
8. Run a second lesson by attaching a PDF of 20 MB or less. Confirm the topic, objective, narration, and visuals reflect the document rather than the previous text question.

OpenAI lesson planning and review can take several minutes, and Track B renders segments sequentially after the whiteboard lesson has already published. ElevenLabs and OpenAI usage is billed against the configured accounts. If narration or an individual render fails, Aha keeps the validated captions and whiteboard representation so the learning flow does not disappear, but those fallbacks are recovery behavior rather than the intended full setup.

For convenience, the repository also includes two quick demos that skip generation and require no API keys, so reviewers can experience the player immediately.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Current verified baseline:

- 123 Vitest tests pass across generic whiteboards, Track B orchestration, narration alignment, provider boundaries, deterministic math, and compatibility flows;
- the standalone Python validator passes all 9 sandbox-policy tests;
- TypeScript passes with strict mode;
- ESLint has no errors and 5 existing warnings in the onboarding fluid renderer;
- Next.js production build succeeds;
- browser QA passes at 1440×900 and 390×844;
- generated whiteboard playback, inline checkpoints, background upgrades, refresh recovery, and recap behavior are covered;
- questions outside the reviewed symbolic grammar route to the general STEM whiteboard pipeline instead of falling back to a plain chat answer;
- missing provider credentials produce a recoverable configuration pause rather than fabricated lesson content;
- a live any-topic acceptance lesson completed through OpenAI planning, ElevenLabs alignment, whiteboard publication, inline checkpoints, and background Manim upgrades; a failed segment remained on its validated whiteboard representation.

## Primary demo flow

1. Ask a STEM question such as `Why does Bayes' theorem let a positive medical test still be probably wrong?` or attach a course PDF.
2. Follow the six-stage generation page into a `LessonSpecV3` lesson with 3–8 narrated whiteboard segments.
3. Show that the lesson is a constrained scene graph interpreted by the product—not free-form HTML or animation code from the model.
4. Play a segment to demonstrate narration-timed drawing, formulas, plots, and word-highlighted captions.
5. Answer an inline checkpoint and continue into the recap.
6. With the renderer enabled, show completed segments hot-swap from the immediately available whiteboard to background-generated Manim MP4s; a failed upgrade leaves the whiteboard intact.

The timed voiceover is in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

Copy-ready Devpost text is in [`docs/DEVPOST_SUBMISSION.md`](docs/DEVPOST_SUBMISSION.md).

## Architecture

```text
Create form
   │ POST /api/lessons
   ▼
LessonJob ── GET /api/lesson-jobs/:id ──► status / recoverable error
   │
   ├─ English STEM text or PDF
   │    └─ OpenAI Files input (PDF) + structured whiteboard plan
   │       └─ DSL validation/sanitization + numeric checks + advisory fact-check
   │          └─ ElevenLabs alignment ─► publish LessonSpec V3 whiteboard
   │             └─ inline checkpoints + recap
   │                └─ background Track B ─► validated sandboxed Manim MP4
   │                                         or keep the whiteboard segment
   │
   └─ reviewed symbolic derivative grammar
        └─ restricted AST + deterministic derivative + SymPy verification
           └─ constrained language plan + ElevenLabs + template Manim/SVG
              └─ structured practice, remediation, transfer, and recap

Lesson player ◄── GET /api/lessons/:id ◄── local persisted lesson/job state
```

Important locations:

- `lib/lesson/schema.ts` — lesson, state, checkpoint, exercise, whiteboard, and asset contracts;
- `lib/lesson/generic-pipeline.ts` and `lib/ai/generic-lesson-provider.ts` — V3 generation, validation, fact-checking, and publication;
- `lib/lesson/whiteboard-dsl.ts` — constrained scene grammar, validation, and deterministic repair;
- `lib/lesson/track-b.ts` and `lib/ai/manim-code-provider.ts` — best-effort background Manim upgrades and bounded retries;
- `components/lesson/` — whiteboard and structured lesson players, timeline, captions, and responsive visuals;
- `renderer/` — isolated Manim/SymPy service, twenty-one derivative templates, custom-scene AST validator, and render cache;
- `lib/math/expression.ts`, `lib/math/polynomial.ts`, `lib/lesson/grading.ts`, and `lib/lesson/capabilities.ts` — deterministic math and structured test support;
- `lib/ai/provider.ts` — server-only GPT-5.6 integration and public error classification;
- `app/api/` — minimum server contract;
- `tests/` and `evals/` — regression safety and product-quality baselines.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for boundaries and [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) for the complete product requirements.

## How OpenAI and Codex are used

### OpenAI models write inside explicit safety rails

For the primary STEM path, GPT-5.6 Sol returns a Zod-validated `LessonSpecV3` authoring payload: 3–8 teaching segments, display formulas, inline checkpoints, machine-checkable claims, and a constrained whiteboard scene/action DSL. Code adds IDs, assets, verification evidence, timing, and upgrade state. A deterministic validator and sanitizer gate the scene graph; numeric checks are blocking for claims the local grammar can evaluate, and an independent structured model review is advisory for the remaining subject matter.

Track B is a separate, explicitly sandboxed code-generation path. GPT-5.6 Sol may write only one bounded Manim `GeneratedScene`; `renderer/validate.py` rejects disallowed imports, calls, attributes, and filesystem or process access before the code can run. Execution happens only in the resource-limited Python container—not in Next.js—and failures are retried with a traceback or left on the already-published whiteboard representation.

The integration uses `client.responses.parse` with `text.format` and Zod-derived schemas. That matches OpenAI's guidance to use the [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) for new projects and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) when output must follow a schema. `OPENAI_MODEL` is configurable; the checked-in Build Week configuration uses the explicit `gpt-5.6-sol` model ID.

### Codex was the product-engineering collaborator

This project was built end to end with Codex assistance. Human product direction and review remained authoritative, while every engineering phase—from architecture and implementation through debugging, testing, integration, and documentation—used Codex as the primary development collaborator rather than isolated autocomplete:

- challenged the original “question in, animated video out” framing and helped turn it into an adaptive learning loop;
- translated product conversations into `PRODUCT_SPEC.md`, contracts, architecture decisions, quality gates, and acceptance criteria;
- implemented and iterated on the cinematic onboarding, generation pipeline, lesson player, deterministic math engine, Manim/SVG boundary, narration timing, grading, remediation, transfer, and recap;
- designed and implemented the V3 whiteboard DSL, PDF-to-lesson path, word-level ElevenLabs synchronization, sandboxed Track B Manim upgrade, and compatibility across existing lesson formats;
- investigated real failures involving provider configuration, Structured Outputs, render latency, unavailable Manim workers, symbolic equivalence, playback synchronization, and route handoff;
- resolved and integrated parallel work across branches while preserving unrelated user changes and keeping `main` deployable;
- created focused tests and ran type checking, linting, production builds, Python sandbox tests, container smoke tests, and desktop/mobile browser QA; and
- kept both teammates aligned through `AGENTS.md`, `PROJECT_STATE.md`, `docs/DECISIONS.md`, evals, and a shared workflow instead of restarting from the same prompt in every task.

This follows the official [Codex best-practices guidance](https://learn.chatgpt.com/guides/best-practices): treat Codex as a configurable teammate, keep durable guidance in `AGENTS.md`, define what “done” means, and verify changes with tests and review.

## Safety and pedagogy boundaries

- Model output supplies content, never arbitrary product-shell layout.
- Exact formulas, axes, scale, geometry, and numeric relationships use deterministic renderers.
- Model-generated Manim Python never executes in the Next.js process; Track B code must pass an AST allowlist and runs only inside the isolated renderer container.
- A single answer is evidence, not proof of mastery.
- Wrong choices get equally polished consequences, never ridicule.
- A missing API key produces a recoverable error rather than fabricated teaching content.

## Deliberate hackathon limitations

- PDF input is wired through the OpenAI Files API, but image OCR, multi-file ingestion, document libraries, and long-document retrieval are out of scope.
- The full experience requires OpenAI, ElevenLabs, and the isolated Manim worker. Captions and whiteboards remain available when an individual narration or render request fails.
- Generic lessons publish the browser-rendered whiteboard first; Track B may remain mixed whiteboard/MP4 when individual renders fail or exhaust their retry budget.
- Local filesystem storage is not suitable for multi-instance production deployment.
- The post-response worker is process-local rather than a durable queue, so production multi-instance execution and crash recovery require additional infrastructure.
- Authentication, classrooms, payments, and lesson editing are intentionally out of scope.

## Team workflow

Read `AGENTS.md`, `PROJECT_STATE.md`, and [`docs/TEAM_WORKFLOW.md`](docs/TEAM_WORKFLOW.md) before starting a new task. Work from one issue on one `codex/<task>` branch, verify the scoped change, review the diff, and update project memory before merging.
