# Plot as Proof (working title)

An adaptive visual-learning mini-drama for OpenAI Build Week’s Education track.

Paste an abstract STEM question and the product turns it into a playable bottle episode. The concept controls the plot, the learner makes two meaningful decisions, and answer confidence selects a different teaching representation: `advance`, `verify`, or `remediate`.

> Story creates a reason to care. Visualization makes the relationship understandable. Interaction checks what the learner noticed. Adaptation chooses what to show next.

The product name is intentionally still a working title. **Moonbase Last Shot** is the complete seeded demo episode.

## What works now

- polished responsive create, generation, player, and recap experiences;
- six observable generation stages with a saved local job record;
- a complete offline Moonbase episode in one lunar-rover cockpit;
- exactly two story decisions, each followed by confidence capture;
- separate `StoryState` and `LearnerState` objects;
- deterministic `advance`, `verify`, and `remediate` policy;
- a confident-error branch that compares horizontal launch with free fall;
- exact responsive SVG projectile-motion and gravity visualizations;
- concept-linked BOLT-7 running gag and callback payoff;
- an unassisted table-edge transfer task;
- cautious evidence recap instead of a mastery claim;
- browser-local TTS fallback, captions, keyboard focus, and reduced-motion support;
- server-only GPT-5.6 Responses API integration with structured Zod output;
- recoverable no-key and generation-error states;
- local job/episode persistence behind a storage adapter;
- automated adaptation, schema, reconvergence, visualization, and quality-gate tests.

## Quick start

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The default projectile-motion sample runs end to end with no external services.

To enable new-topic generation later:

```bash
cp .env.example .env.local
```

Then add `OPENAI_API_KEY` to `.env.local` and restart the server. Never expose it as a `NEXT_PUBLIC_` variable or commit it. The default `OPENAI_MODEL` is `gpt-5.6`, the GPT-5.6 Sol alias documented by OpenAI.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Current verified baseline:

- 8 tests pass;
- TypeScript passes with strict mode;
- ESLint passes;
- Next.js production build succeeds;
- browser QA passes at 1440×900 and 390×844;
- full confident-error → remediation → changed-condition → transfer → recap path passes;
- unsupported topics without a key reach a clear, recoverable pause.

## Demo flow

1. Keep the default projectile-motion prompt and choose **Generate adventure**.
2. Show the concept-to-plot blueprint and both diagnostic decisions.
3. Enter the cockpit and choose **“Compensate—it will land earlier”** with **Very sure**.
4. Show the synchronized launch-versus-drop visual and BOLT’s deadpan retraction.
5. At the gravity fault, choose **Farther** with **Very sure**.
6. Complete the unassisted table-edge transfer task.
7. Show how the recap records the actual path without claiming mastery.

The timed voiceover is in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

## Architecture

```text
Create form
   │ POST /api/episodes
   ▼
GenerationJob ── GET /api/jobs/:id ──► stages / blueprint / recoverable error
   │
   ├─ known demo concept ─► seeded validated EpisodeSpec
   └─ API key present ────► GPT-5.6 Responses API ─► Zod validation
                                                     │
Episode player ◄── GET /api/episodes/:id ◄───────────┘
   │
   ├─ POST /choices ─► deterministic director ─► story + learner state
   └─ POST /transfer ─► independent result ─► cautious recap
```

Important locations:

- `lib/episode/schema.ts` — shared Zod/TypeScript contracts;
- `lib/episode/moonbase.ts` — release-blocking seeded episode;
- `lib/adaptation/engine.ts` — deterministic runtime policy;
- `lib/ai/provider.ts` — server-only structured GPT-5.6 integration;
- `components/player/` — fixed cinematic shell and deterministic visuals;
- `app/api/` — minimum server contract;
- `tests/` and `evals/` — regression safety and product-quality baselines.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for boundaries and [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) for the complete product requirements.

## How GPT-5.6 and Codex are used

GPT-5.6 is the content-planning provider for new questions. It returns a structured `EpisodeSpec` through the Responses API; the server validates that data before the fixed UI can render it. Runtime branching remains deterministic so the demo never points to a nonexistent scene or exposes hidden reasoning. Official references: [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol) and [Models](https://developers.openai.com/api/docs/models).

Codex was used as the primary product-engineering collaborator for specification synthesis, architecture, UI implementation, adaptation logic, test creation, production-build repair, and browser QA. The repository’s `AGENTS.md`, decision log, state file, evals, and PR template make those improvements durable across both teammates’ future Codex tasks.

## Safety and pedagogy boundaries

- Model output supplies content, never arbitrary product-shell layout.
- Exact formulas, axes, scale, geometry, and numeric relationships use deterministic renderers.
- Generated Python never executes in the Next.js process.
- A single answer is evidence, not proof of mastery.
- Wrong choices get equally polished consequences, never ridicule.
- A missing API key produces a recoverable error rather than fabricated teaching content.

## Deliberate hackathon limitations

- `OPENAI_API_KEY` is not configured, so live structured generation has not yet been smoke-tested.
- Optional PDF/image extraction is represented in the UI but is not wired into the first vertical slice; pasted text is the supported path.
- Browser speech synthesis is a development fallback, not production character audio.
- SVG provides the deterministic visual baseline; the isolated Manim worker remains a follow-up adapter.
- Local filesystem storage is not suitable for multi-instance production deployment.
- Authentication, classrooms, payments, editing, and long-document ingestion are intentionally out of scope.

## Team workflow

Read `AGENTS.md`, `PROJECT_STATE.md`, and [`docs/TEAM_WORKFLOW.md`](docs/TEAM_WORKFLOW.md) before starting a new task. Work from one issue on one `codex/<task>` branch, verify the scoped change, review the diff, and update project memory before merging.
