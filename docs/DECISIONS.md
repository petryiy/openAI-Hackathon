# Decision log

## 2026-07-21 — Make both demo signals genuinely offline Manim lessons

The Chain Rule Mission now joins the instantaneous-change lesson as a stable, code-owned seeded lesson with five committed Manim segments, deterministic symbolic math, exactly two diagnostic checkpoints, and one unassisted transfer task. Its Manim scenes explicitly represent nested transformation, outside-in structure reading, inside-out differentiation, and the missing-inner-derivative misconception. Exact demo input bypasses OpenAI, ElevenLabs, and the remote renderer at runtime; dynamic inputs continue through the existing provider and SVG-fallback pipeline. Local job polling performs a short bounded retry only when it catches JSON during an in-place write, keeping fast offline completion reliable on Windows and POSIX hosts.

## 2026-07-20 — Expand derivatives through a typed symbolic capability registry

Dynamic English lessons support bounded power, sum, product, quotient, standard-function, and one-layer chain rules through a strict recursive AST. TypeScript performs safe parsing, differentiation, grading, misconception matching, and SVG fallback; the isolated renderer independently verifies the expected derivative with SymPy before rendering. OpenAI may write only formula-free story hooks and transition bridges for five fixed segments. It cannot provide formulas, select unregistered capabilities, change the two checkpoints or four practice steps, judge answers, or send code to Manim. Repeated practice errors require a smaller deterministic repair check before the learner returns to the original step. Inputs outside the registry return `UNSUPPORTED_CALCULUS_SCOPE`.

## 2026-07-20 — Use ElevenLabs for English lesson narration

The primary calculus flow uses ElevenLabs `eleven_multilingual_v2` with the reviewed `George` voice for stable, natural educational narration. The API key remains server-only, generated audio is content-addressed and cached, and the five seeded clips are committed so the core lesson still works offline. Captions remain authoritative fallback content when the provider is absent or unavailable. The player treats narration as the timing clock and adjusts silent Manim playback slightly when generated speech duration differs from the committed video.

## 2026-07-20 — Make the derivative lesson the primary learning loop

The default create flow now creates a lesson job, observes its read-only status, and opens a validated segmented `LessonSpec` instead of treating dialogue autoplay as the teaching mechanism. Generation runs in a server-owned post-response task; polling never triggers work. The first vertical slice supports the derivative as instantaneous change, exactly two direct-submit diagnostic pauses, four deterministically graded difference-quotient steps, targeted remediation, and one unassisted transfer task. The existing episode runtime remains available only as a legacy compatibility path.

## 2026-07-20 — Keep mathematical truth and executable rendering outside the model boundary

Polynomial input is parsed by an allowlisted expression grammar and normalized with exact rational coefficients; no `eval` or model judgment is used for correctness. The optional Manim 0.20.1 service owns eight reviewed templates and accepts only strict numeric JSON. It runs outside Next.js, caches content-addressed assets, and falls back to code-owned SVG when unavailable. Seeded English Manim videos and narration are checked-in assets so the core lesson requires no API key, Docker daemon, or browser speech synthesis at playback time.

## 2026-07-19 - Treat generation and playback as one continuous directed experience

`/generate` remains inside the shared onboarding Portal and separates the request that starts generation from read-only observation polling. A completed job prefetches its episode and enters it automatically; there is no intermediate blueprint confirmation. The episode runtime uses deterministic shot and reading-time data to autoplay between the two diagnostic decisions and the unassisted transfer task. It pauses when the tab is hidden, begins muted with captions, and preserves deterministic API fallbacks and the separate StoryState/LearnerState contracts.

## 2026-07-19 — Treat the create screen as an English-only Episode Forge

The `/create` experience keeps the existing episode-generation request contract but fixes `language` to `en`, limits visible subjects to Calculus, Physics, and Probability, and presents the input as a source signal rather than a generic form. A selected PDF is deliberately local UI state only: it may be selected, replaced, or removed, but is not parsed, persisted, or included in the request. The shared onboarding Portal remains decorative and continuous across the landing-to-create transition.

## 2026-07-19 — Run the landing fluid trail as a bounded second WebGL layer

The Knowledge Portal keeps its React Three Fiber renderer, while the cursor-driven fluid trail uses a separate transparent Three.js renderer so its pressure solver remains isolated from the 3D scene graph. To bound GPU cost, the fluid field renders at 28% viewport resolution with 12 pressure iterations, is desktop fine-pointer only, and disables itself for reduced motion. An independent dye field keeps the visible trail narrow and gives it a controlled ink-like decay without exposing the broader velocity field. The first-visit boot sequence waits for the 3D canvas creation callback, has a short minimum duration, and releases to the CSS fallback after a safety timeout.

## 2026-07-19 — Keep onboarding visuals persistent across the first route transition

The landing page and `/create` live under one shared route-group layout. Its WebGL Knowledge Portal remains mounted while the foreground route changes, so the CTA can behave like a camera move into the product instead of a page fade. The 3D canvas stays decorative and client-only, has a static CSS fallback, and does not enter the generation or player contract.

## 2026-07-18 — Build the seeded learning loop first

We will finish the Moonbase episode, adaptation engine, exact SVG teaching visual, and recap before broad upload/media generation. This protects the product's differentiator and the three-minute demo.

## 2026-07-18 — Use a hybrid deterministic media strategy

The initial cockpit, characters, motion, and projectile visualization are web-native CSS/SVG. This makes the demo reproducible without external media providers. Generated images, TTS, and isolated Manim rendering can replace adapters later without changing the player contract.

## 2026-07-18 — Rules own branch reliability

In the legacy episode runtime, GPT-5.6 may author validated episode content, but the adaptation policy remains deterministic. Confidence plus option correctness selects `advance`, `verify`, or `remediate`; the model is not allowed to invent a nonexistent branch. The primary derivative lesson no longer asks for confidence.

## 2026-07-18 — API key is optional for the demo

`OPENAI_API_KEY` remains optional for the product demo. The local key may be configured for new-topic generation, but the Moonbase episode and its full learning loop must still work offline. A missing key for a new, unsupported concept produces a clear recoverable error rather than fabricated teaching content.

## 2026-07-18 — Adapt the model schema without weakening the app contract

OpenAI Structured Outputs requires all fields and rejects dynamic record keys. Nullable presentation fields and explicit key/meaning entry lists are therefore used only at the model boundary. The server normalizes them back into the existing `EpisodeSpec` before semantic validation, so the player and deterministic renderers do not inherit provider-specific constraints.

## 2026-07-18 — Provider failures must remain actionable and server-side

The generation API classifies missing credentials, invalid credentials, exhausted quota, transient rate limits, model access, schema rejection, and teaching-quality failures separately. Only redacted diagnostics reach server logs; browser responses receive concise recovery guidance and never raw provider errors.

## 2026-07-19 — The model authors the episode draft, not the shot contract

GPT-5.6 owns the educational story, dialogue, choices, and visualization intent. Approved shot templates and timing are derived deterministically from scenes in code. The complete draft is saved before semantic validation so a reference-quality draft can be repaired locally instead of discarded or regenerated.

## 2026-07-19 — Repairs must be bounded, recorded, and replayable

Publication may normalize branch references to the runtime policy, reconcile a transfer option with a percentage explicitly declared by its own explanation, and remove resolved self-correction debris. These repairs do not invent subject-matter claims. Each change is recorded in the job and pedagogy quality gate, and the repair endpoint never makes another model call.

## 2026-07-19 — Use latency-sensitive GPT-5.6 defaults for the interactive path

New-topic generation defaults to low reasoning, low text verbosity, no SDK retry, and a four-minute timeout. The first successful Chinese probability smoke test completed its model phase in 85 seconds, compared with the earlier failed run that occupied nearly ten minutes. Medium reasoning remains an opt-in experiment that must earn its latency through evals.

## 2026-07-19 — Visualization specs drive a fixed deterministic renderer

Generated content may select an approved visualization type and provide labels, representations, and learning purpose, but it cannot design the shell. The player maps those specs to code-owned population grids, conditional tables, probability trees, or structured diagrams. The bespoke Moonbase stage remains intact as the offline seed; generated episodes use a separate dynamic bottle-episode set.
