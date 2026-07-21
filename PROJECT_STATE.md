# Project state

Last updated: 2026-07-21

## Any-topic whiteboard lessons (new)

- Any English question (or an uploaded PDF) outside the derivative grammar now produces a narrated animated lesson instead of `UNSUPPORTED_CALCULUS_SCOPE`.
- `LessonSpecV3` joins the schema union additively (3–8 segments, inline multiple-choice checkpoints); the existing V1/V2 derivative flow, seeded demo, and grading are unchanged.
- Track A "AI whiteboard": GPT-5 authors a constrained JSON scene DSL (`lib/lesson/whiteboard-dsl.ts`) that a fixed browser player (`components/lesson/whiteboard-stage.tsx`, SVG + GSAP + KaTeX) interprets, with the timeline slaved to the narration clock. Scenes are validated against the plot grammar and KaTeX, then sanitized (synthesize missing axes, drop dangling references, downgrade unmatched anchors) so most model drafts publish on the first attempt; only unfixable scenes trigger one bounded regeneration.
- Correctness: deterministic numeric spot-checks of machine-expressible claims are the hard gate (force one regeneration); an advisory second-model fact-check records notes without blocking.
- Track B "cinematic Manim": always attempted per segment in the background — GPT-5 writes a Manim CE 0.20.1 `GeneratedScene`, validated by `renderer/validate.py` (AST allowlist) and executed in the hardened sandbox via `POST /v1/renders/custom`, with traceback-fed retries (≤3), a wall-clock budget, and a liveness probe that prevents wasted codegen. Completed segments hot-swap into the player; failed ones stay on the whiteboard.
- Narration uses the ElevenLabs `with-timestamps` endpoint; character alignment drives word-highlighted captions and animation cues, degrading gracefully to captions + a synthetic clock when the free quota is exhausted.
- PDF upload is real: the file is uploaded to the OpenAI Files API and passed as `input_file` so GPT-5 sees text and page images.
- Verified live end-to-end with GPT-5 on text prompts (Bayes theorem, the quadratic parabola with a correct plotted curve and labeled points) and a PDF upload (vectors/dot product); 124 Vitest tests and all 9 Python renderer-policy tests pass, including whiteboard DSL, timeline, alignment, schema-union regression, generic-provider, Track B, and both offline Manim lessons.

## Derivative lesson compatibility flow

- Derivative-first visual lesson from English pasted input, with an explicit unsupported-scope response outside the reviewed rule registry
- Versioned `LessonSpecV1/V2` plus separately persisted `LessonStoryState` and `LessonLearnerState`
- Two fully offline seeded Manim lessons: instantaneous change and Chain Rule Mission. Each has five committed MP4 segments, captions/transcripts, replay, and reduced-motion SVG fallback; the instantaneous-change lesson also includes committed ElevenLabs narration
- Exactly two diagnostic pauses with direct answer submission and deterministic remediation selection
- Dynamic power, sum, product, quotient, `sin`/`cos`/`exp`/`ln`, and one-layer chain-rule lessons through a strict 30-node expression AST
- Four rule-specific practice steps with exact equivalence, misconception codes, second-error remediation, and a required smaller repair check
- One independently graded, same-rule unassisted transfer task and cautious evidence recap
- Twenty-one allowlisted Manim 0.20.1 templates plus a SymPy verification endpoint in an isolated Docker service, content-addressed caching, strict AST input, stable posters, and responsive deterministic SVG fallback
- OpenAI is limited to formula-free English story hooks and transition bridges; ElevenLabs George narration drives measured segment timing
- New lesson, job, attempt, transfer, and rendered-asset APIs; the previous episode routes remain as a legacy path
- Dedicated visual lesson loading page observes all six server-owned stages, survives refresh through the job URL, and hands off automatically to the published lesson
- Strict TypeScript, lint, and the Next.js production build pass; the renderer container and renderer-offline SVG publication have been smoke-tested, with desktop plus 390×844 browser QA completed
- Final **Aha** product name plus copy-ready Devpost, GPT-5.6/Codex disclosure, and current calculus demo narration

## Completed baseline

- Cinematic single-screen landing experience with a persistent 3D Knowledge Portal, shader-driven fluid cursor trail, fast scene-readiness boot sequence, technology marquee, and animated handoff to the Episode Forge
- Immersive English-only Episode Forge with a reactive source chamber, local-only PDF reference UI, demo signals, constrained STEM parameters, and animated generation handoff
- Continuous Director Pipeline loading experience with real job observation, automatic episode entry, long-wait and recoverable error states
- Full-screen cinematic episode player with timed autoplay, pause/skip controls, caption and local voice controls, two-step diagnostic interruptions, and an unassisted transfer stop
- Polished Next.js create, generation, player, and recap flow
- Shared Zod/TypeScript EpisodeSpec and dual-state contracts
- Complete seeded Moonbase episode and concept-linked character callback
- The legacy Moonbase episode retains two confidence-aware diagnostic choices
- Core, remediation, verification, and gravity SVG visualizations
- Unassisted transfer task and cautious evidence recap
- Server-only GPT-5.6 structured-output integration with an API-compatible model boundary
- Provider-aware auth, quota, rate-limit, model-access, schema, and quality-gate errors
- Model-authored episode drafts with server-planned shots, saved failed drafts, and bounded deterministic repair
- Real processing progress, a four-minute request bound, and a low-reasoning latency default
- Spec-driven deterministic probability visuals: population grid, 2×2 table, and probability tree
- Generic generated-drama stage with dynamic location, clock, props, characters, voices, and scene progress
- Local generation job/episode persistence and recoverable no-key state
- Successful live Chinese probability episode generated with GPT-5.6 in 85 seconds and repaired without a second model call
- Focused generation-flow and playback-timing coverage plus the existing contract and adaptation test suite
- Desktop and 390×844 browser QA, including remediation, changed-condition, transfer, and recap paths
- Collaboration guidance, decision log, eval baseline, PR template, demo script, and submission checklist

## Next

- Add learning evals for the six derivative capabilities before extending the grammar
- Replace the process-local post-response lesson worker with a durable external job queue before multi-instance deployment
- Extend the typed visual grammar to limits and definite integrals only after the derivative learning eval passes
- Record, review, and publish the three-minute demo
- Add the Codex `/feedback` session ID and finish the submission checklist

## Known constraints

- Local filesystem job storage is for the hackathon prototype, not multi-instance production.
- Generated lesson jobs and rendered media still use local filesystem persistence.
- Dynamic symbolic lessons require OpenAI for constrained English language planning, then generate and cache ElevenLabs narration when its server-only key is configured; narration failure falls back to captions. The offline derivative lesson uses committed ElevenLabs audio and no external API.
- Both derivative seeded lessons ship committed Manim MP4s. Dynamic derivative lessons fall back to exact responsive SVG when `MANIM_RENDERER_URL` is unavailable; generic STEM lessons retain their browser whiteboard segments whenever a Track B cinematic upgrade cannot render.
