# Project state

Last updated: 2026-07-20

## Current primary flow

- Derivative-first visual lesson from pasted input, with an explicit unsupported-scope response for non-derivative topics
- New validated `LessonSpec` plus separately persisted `LessonStoryState` and `LessonLearnerState`
- Five roughly 68-second total seeded teaching segments with committed Manim MP4s, ElevenLabs English narration, captions/transcripts, synchronized playback speed, replay, and reduced-motion SVG fallback
- Exactly two diagnostic pauses with direct answer submission and deterministic remediation selection
- Four-step difference-quotient practice with a safe polynomial parser, exact rational normalization, misconception codes, and second-error remediation
- One independently graded unassisted cubic transfer task and cautious evidence recap
- Eight allowlisted Manim 0.20.1 templates in an isolated Docker service, content-addressed caching, strict JSON input, and responsive deterministic SVG fallback
- New lesson, job, attempt, transfer, and rendered-asset APIs; the previous episode routes remain as a legacy path
- 45 tests passing, strict TypeScript passing, webpack production build passing, and desktop plus 390×844 browser QA completed

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

- Run and capture the Docker Manim renderer on the final demo machine, then publish its cached MP4/poster/VTT assets
- Replace the process-local post-response lesson worker with a durable external job queue before multi-instance deployment
- Extend the typed visual grammar to limits and definite integrals only after the derivative learning eval passes
- Remove the optional PDF control from the calculus create experience or wire extraction
- Record, review, and publish the three-minute demo
- Add the Codex `/feedback` session ID and finish the submission checklist

## Known constraints

- Local filesystem job storage is for the hackathon prototype, not multi-instance production.
- Optional PDF/image extraction is not wired into the first vertical slice.
- Generated lesson jobs and rendered media still use local filesystem persistence.
- Dynamic polynomial lessons generate and cache ElevenLabs narration when a server-only key is configured; provider failure falls back to captions. The offline derivative lesson uses committed ElevenLabs audio.
- The seeded lesson ships committed Manim MP4s. New parameterized lessons use the exact responsive SVG representation when `MANIM_RENDERER_URL` is unavailable.
