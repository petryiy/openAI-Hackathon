# Testing & Rollout Guide — Any-Topic Whiteboard Lessons

This document describes how to verify the new any-topic (Track A whiteboard / Track B Manim) lesson pipeline end to end, what API quota/spend to expect, and what is still unverified.

## 1. Environment setup

The app needs these env vars (see `.env.example` for the full list):

| Var | Required for | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Any generic (non-derivative) lesson, PDF upload, Track B codegen | Paid key recommended — see cost estimates below |
| `ELEVEN_LABS` | Narration audio + word-level captions | Free tier is ~10,000 characters/month total |
| `MANIM_RENDERER_URL` | Track B cinematic upgrade | Points at the Docker renderer, e.g. `http://127.0.0.1:8787` |

Start the dev server, then open `http://localhost:3000/create`.

## 2. What to buy / provision before testing at scale

- **OpenAI**: each lesson generation costs roughly 2–4 Responses API calls (generation, advisory fact-check, occasionally one regeneration; Track B adds one codegen call per segment per attempt, up to 3 attempts × 3–8 segments if Track B is enabled). Budget accordingly if testing many lessons back to back. Generation for a single lesson currently takes **1.5–3 minutes** (was up to ~6 minutes before the verification-cost fix landed — see §5).
- **ElevenLabs**: the free tier (~10,000 characters/month) is consumed fast — roughly 2–3 lessons' worth of narration (each lesson has 3–8 segments × ~40–75s of speech ≈ 1,500–3,000 characters per lesson). **If you want to test narration + word-highlighted captions, upgrade the ElevenLabs plan or wait for the monthly quota reset.** Without quota, lessons still work — they publish with captions only and a synthetic clock (this is intended graceful degradation, not a bug).
- **Docker** (only if testing Track B): you need to build and run the Manim renderer container. See §4.

## 3. Manual test recipes (Track A — no Docker needed)

### 3.1 Offline fixture (no API keys required)
Open `http://localhost:3000/lesson/whiteboard-exponential-fixture` directly. This is a hand-authored lesson exercising every DSL element/action type. Use it to sanity-check the player itself (playback, seek, captions, checkpoints, recap) without spending any API quota.

### 3.2 Generic text lesson (needs `OPENAI_API_KEY`)
1. Go to `/create`, type any non-derivative STEM question (e.g. "Why does Bayes' theorem flip a probability?" or "Why is y = x^2 a parabola?").
2. Submit — you're redirected to `/generate?lessonJobId=...`.
3. Wait ~1.5–3 minutes. The progress page shows the same 6 stages as the derivative flow.
4. On completion you land on `/lesson/<id>` and should see an animated whiteboard lesson with 3–8 segments, at least one MCQ checkpoint, and a recap.

Programmatic equivalent (useful for polling without the browser):
```bash
curl -s -X POST http://localhost:3000/api/lessons \
  -H "content-type: application/json" \
  -d '{"sourceInput":"Why does Bayes theorem let a positive medical test still be probably wrong?","locale":"en","level":"secondary"}'
# => {"jobId": "..."}

curl -s http://localhost:3000/api/lesson-jobs/<jobId>
# poll until status: "complete", then lessonId is included
```

### 3.3 PDF upload (needs `OPENAI_API_KEY`)
1. On `/create`, attach a PDF via the "Attach a PDF to teach" control (drag-drop or browse). Text input becomes optional once a PDF is attached.
2. Submit. The pipeline uploads the PDF to the OpenAI Files API and passes it as `input_file` so the model sees both the text layer and page images.
3. Verify the resulting lesson's `topic`/`objective`/segment content actually reflects the PDF content (not a generic answer).

Programmatic equivalent:
```bash
curl -s -X POST http://localhost:3000/api/lessons \
  -F "sourceInput=" -F "level=secondary" \
  -F "pdf=@/path/to/file.pdf;type=application/pdf"
```

### 3.4 Derivative flagship (regression check — no cost if using the seeded lesson)
Open `http://localhost:3000/lesson/derivative-instantaneous-change` — must render exactly as before (Manim MP4, V1 player, checkpoints, guided practice). This confirms the LessonSpec schema-union change did not break the existing flow. `docs/DEMO_SCRIPT.md` has the full scripted chain-rule walkthrough for a live (non-seeded) regression check.

## 4. Testing Track B (cinematic Manim upgrade — needs Docker)

Track B is **best-effort background work** — a lesson always publishes on the whiteboard first; Track B silently upgrades segments to Manim MP4 afterward, or leaves them on the whiteboard if it fails or is unavailable. It has NOT yet been verified against a real renderer in this session (only the TypeScript orchestration and the Python AST validator were unit-tested).

Steps to verify for real:
```bash
docker build -t plot-as-proof-renderer renderer
docker run --rm --name plot-proof-renderer --read-only \
  --tmpfs /tmp:rw,uid=1000,gid=1000,size=128m --tmpfs /work:rw,uid=1000,gid=1000,size=512m \
  --cap-drop ALL --pids-limit 128 --memory 1g --cpus 1.5 --network none \
  -v "$PWD/.data/lesson-assets:/output" -p 127.0.0.1:8787:8000 plot-as-proof-renderer
```
Then set `MANIM_RENDERER_URL=http://127.0.0.1:8787` and restart the dev server. Generate any generic lesson (§3.2/3.3) and watch `.data/lessons/<id>.json` → `upgrade.trackB[*].status` move from `pending` to `complete`/`failed` per segment; a `complete` segment's asset should gain a `videoUrl` and `renderMode: "manim"`, and the lesson player should hot-swap that segment's visual to a muted `<video>` badge "CINEMATIC RENDER · MP4" within ~5–15s of it finishing (5s poll interval).

Sandbox smoke test (no Docker needed, validates the AST allowlist logic in isolation):
```bash
python3 renderer/test_validate.py
```

## 5. Known state / caveats as of 2026-07-21

- **ElevenLabs free-tier quota is currently exhausted** for this project's key (~10,000 chars/month). New lessons publish with captions only, no audio, no word-highlight — verified working as designed, but not visually confirmed with real audio in this session. Re-test narration + word-highlighted captions after a quota reset/upgrade.
- **Track B has not been exercised against a live Docker renderer** — only unit-tested with mocked HTTP calls (`tests/track-b.test.ts`) and the Python validator (`renderer/test_validate.py`). Follow §4 to close this gap.
- Generation latency for a generic lesson is now **1.5–3 minutes** typically (down from up to ~6 minutes) after changing the fact-check verifier from a hard gate to advisory (only deterministic numeric-check failures now force a regeneration).
- A dev-server restart is required after any `.env` change — Next.js does not reliably hot-reload environment variables or server modules into a running background (`after()`) task.

## 6. Automated gate (run before/after any further change)

```bash
pnpm typecheck
pnpm test        # 102 tests as of this writing
pnpm lint
pnpm build
python3 renderer/test_validate.py
```
