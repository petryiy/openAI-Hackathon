# Architecture

## Goal

Ship one reliable adaptive learning loop before broad generation features. The application has a fixed cinematic player and consumes validated episode data; model output never controls the product shell.

## Runtime boundaries

```text
Create UI
   │ POST /api/episodes
   ▼
Persisted job ── GET /api/jobs/:id ──► generation progress / recoverable error
   │
   ├─ no key + demo concept ─► seeded EpisodeSpec
   └─ API key present ───────► GPT-5.6 Responses API ─► Zod validation
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

`lib/ai/provider.ts` owns model access. It uses the server-only OpenAI SDK and structured outputs. Without `OPENAI_API_KEY`, it returns a typed configuration error; the seeded demo remains available through `lib/episode/moonbase.ts`.

Generated episodes are stored under `.data/` in local development. This is intentionally simple for the hackathon and hidden behind `lib/storage/local-store.ts` so it can later be replaced.

## Visualization boundary

The MVP uses deterministic responsive SVG for projectile motion. A future Manim worker must accept a constrained template name plus validated parameters. It must never accept arbitrary Python through the web process.

## Client state

The player owns the current scene and presentation state. Every choice is sent with current `StoryState` and `LearnerState`; the server returns authoritative updated states. A local deterministic fallback keeps the seeded demo playable if a route request fails.
