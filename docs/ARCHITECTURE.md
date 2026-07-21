# Architecture

## Goal

Ship one reliable adaptive learning loop before broad generation features. The application has a fixed cinematic player and consumes validated episode data; model output never controls the product shell.

The primary loop is now the calculus lesson runtime:

```text
POST /api/lessons → validate derivative scope → deterministic math model
                  → optional isolated Manim render → persisted LessonSpec
                  → /lesson/:id
                  → two diagnostic checkpoints
                  → POST /attempts for four exact algebra steps
                  → misconception-specific remediation
                  → POST /transfer → cautious recap
```

`LessonSpec` is independent from the legacy `EpisodeSpec`. `LessonStoryState` tracks presentation progress while `LessonLearnerState` stores only learning evidence. The restricted expression parser accepts numbers, `x`, `h`, parentheses, and `+ - * / ^`, normalizes degree-three polynomials with rational coefficients, and never evaluates code.

The renderer boundary lives under `renderer/`. Its HTTP contract accepts one of eight template IDs plus bounded coefficients, point, locale, narration, duration, and theme. The Manim container never receives Python source or filesystem paths. A render failure leaves the responsive SVG asset active, so the offline seeded lesson remains complete.

## Narration boundary

`lib/media/elevenlabs-client.ts` is the only dynamic narration provider boundary for the calculus flow. It reads the server-only `ELEVEN_LABS` key, uses the reviewed English `George` voice with `eleven_multilingual_v2` by default, and writes content-addressed MP3 assets under `.data/lesson-assets/`. The public asset route exposes only allowlisted filenames and MIME types; credentials and provider responses never reach the browser. Provider absence or failure keeps captions and deterministic visuals available. The seeded lesson commits the same reviewed narration clips so playback requires no external service.

Narration is the playback clock. When a committed Manim clip and generated narration differ slightly in duration, the client adjusts the silent video playback rate while preserving the learner-selected overall speed. This avoids changing speech pitch or cutting off an explanation.

## Runtime boundaries

```text
Create UI
   │ POST /api/episodes
   ▼
Persisted job ── GET /api/jobs/:id ──► generation progress / recoverable error
   │
   ├─ no key + demo concept ─► seeded EpisodeSpec
   └─ API key present ───────► GPT-5.6 Responses API ─► model-authored EpisodeDraft
                                                        │ normalize records
                                                        │ plan shots in code
                                                        │ save draft
                                                        │ bounded repair
                                                        ▼
                                                  EpisodeSpec validation
                                                        │
Episode player ◄── GET /api/episodes/:id ◄──────────────┘
   │
   ├─ POST /choices ─► deterministic adaptation policy ─► state patch + branch
   └─ POST /transfer ─► independent evaluation ─► cautious learning recap
```

## Core contracts

- `EpisodeSpec`: validated story, concepts, scenes, visualizations, choices, shots, and transfer task.
- `StoryState`: fictional continuity only.
- `LearnerState`: evidence-based learning hypotheses only; scores are heuristics, not mastery claims.
- `DirectorDecision`: one validated `advance`, `verify`, or `remediate` decision.
- `GenerationJob`: persisted pipeline state and repair/quality evidence.

The TypeScript/Zod source of truth lives in `lib/episode/schema.ts`. API routes must parse untrusted input and output with those schemas.

## Generation boundary

`lib/ai/provider.ts` owns model access. It uses the server-only OpenAI SDK and structured outputs. `lib/ai/schema.ts` adapts unsupported dynamic record keys into explicit entry lists at the model boundary. The model returns an `EpisodeDraft`; it does not author cinematography contracts. `lib/episode/shot-planner.ts` derives approved shots from the validated scenes, after which the complete draft is saved before semantic validation.

`lib/episode/repair.ts` applies only bounded, inspectable fixes: align branch references with the deterministic runtime policy, correct an answer option when the explanation explicitly declares a different percentage, and remove resolved self-correction debris. Every repair is recorded in the generation job and pedagogy gate. A saved draft can be repaired through `POST /api/jobs/:id/repair` without paying for a second model call. Without `OPENAI_API_KEY`, generation returns a typed configuration error; the seeded demo remains available through `lib/episode/moonbase.ts`.

Provider failures are classified server-side. Authentication, exhausted quota, transient rate limits, model access, schema rejection, and episode quality failures receive different public codes without exposing request headers, API keys, or raw provider objects to the browser.

The live request uses low reasoning and low text verbosity by default, has no automatic SDK retry, and is bounded to four minutes. Jobs expose elapsed-time progress while the request is active. Generated episodes, repairable drafts, and jobs are stored under `.data/` in local development. This is intentionally simple for the hackathon and hidden behind `lib/storage/local-store.ts` so it can later be replaced.

## Visualization boundary

The fixed Moonbase episode uses bespoke deterministic responsive SVG for projectile motion. Generated episodes render from `TeachingVisualizationSpec`: the current deterministic templates cover population/base-rate models, 2×2 conditional tables, probability trees, and structured labelled diagrams. Numeric probability values are parsed once and reused across the grid, table, formula, accessibility label, and recap-facing display. A future Manim worker must accept a constrained template name plus validated parameters. It must never accept arbitrary Python through the web process.

## Client state

The player owns the current scene and presentation state. Every choice is sent with current `StoryState` and `LearnerState`; the server returns authoritative updated states. A local deterministic fallback keeps the seeded demo playable if a route request fails.
