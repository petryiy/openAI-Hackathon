# Aha — three-minute demo script (any-topic build)

> Supersedes the earlier calculus-first script. This matches the current
> `LessonSpecV3` whiteboard product: an any-topic STEM question → a real
> six-stage generation → narrated whiteboard segments with inline checkpoints →
> background Manim upgrades. Spoken copy is ~270 words, leaving room for clicks
> and visual pauses; target run time ~2:45.

## Demo design (decisions)

- **Live hero — the Bayes lesson, generated for real on camera.** Input routes
  to the generic whiteboard pipeline (it is not derivative scope), so it exercises
  the any-topic path end to end. The generation wait is trimmed in editing, never
  implied to be real time.
- **Only typed input.** PDF upload is named in one line, not demonstrated.
- **Cinematic payoff comes from committed assets, not a live render.** The
  background Manim upgrade (Track B) is slow and can fail per segment, so the
  cinematic beat leans on already-rendered MP4s — either the two upgraded
  segments in the hero lesson, or the offline seed lesson (no keys/Docker needed).
- **Record two real takes.** Every submission runs the full pipeline and returns
  a **new random lesson id** — there is no instant input cache. Take 1 warms the
  Manim/narration asset caches; take 2 is faster and tends to land more upgraded
  segments. Keep the better take.
- **Safety net.** A known-good pre-generated hero lesson already exists at
  `/lesson/262d75d7610b44dc8c27648d213243bd` (5 segments; segments 0 and 2 are
  cinematic MP4, segments 1/3/4 are whiteboard with a checkpoint each). If both
  live takes are weak, film the playback beats from this URL — same topic, so the
  cut from the generation screen stays seamless.

## Before recording (checklist)

- `.env` has funded OpenAI + ElevenLabs keys; keep keys off-screen. Narration is
  live again, so the whiteboard segments will have audio + word-timed captions.
- **Turn OFF "reduce motion" on the recording machine/browser.** With reduce
  motion on, the player suppresses every cinematic MP4 and falls back to
  whiteboard (`components/lesson/whiteboard-lesson-player.tsx:51`). macOS: System
  Settings → Accessibility → Display → Reduce motion → off. Verify in the browser
  console: `matchMedia('(prefers-reduced-motion: reduce)').matches` should be
  `false`.
- **Recommended one-line copy fixes so on-screen text matches the any-topic story**
  (otherwise a Bayes demo shows "CALCULUS" three times):
  - `components/onboarding/landing-page.tsx:66` — "Turn a difficult derivative
    into a visual mission…" → an any-topic line, e.g. "Turn any STEM question into
    a visual lesson that adapts when your reasoning changes."
  - `components/create-episode-form.tsx:196` — story-world card **"VISUAL CALCULUS
    LAB"** → e.g. "VISUAL STEM LAB".
  - `components/generation/lesson-generation-client.tsx:104` — pipeline header
    **"CALCULUS LESSON · VISUAL PIPELINE"** → "STEM LESSON · VISUAL PIPELINE".
  - Optional: the lesson header brand still reads **"PLOT AS PROOF"**
    (`whiteboard-lesson-player.tsx:260`). It is the intentional teaching tagline;
    leave it, but know it is on screen if you want strict "Aha" branding.
- **Clean start.** The player persists progress in localStorage
  `plot-as-proof:lesson:<id>`. To start from section 1, clear that key (DevTools →
  Application → Local Storage) or click **"Replay this lesson"** on the recap.
- **Player defaults:** captions ON, Sound ON, speed 1×.
- **Keep captions on** the whole time; word-highlighting is a headline feature.

## Exact inputs and clicks (no improvising on camera)

- **Question to type (verbatim, identical in both takes):**
  `Why does Bayes theorem let a positive medical test still be probably wrong?`
- **Learning level:** Early university.
- **Whiteboard segment to teach:** "Count picture: who tests positive?"
- **Checkpoint to answer:** prompt "…which is larger?" → click **"False
  positives"** → **"Submit answer"** → **"Continue →"**.
- **Cinematic segments (already MP4, badge "CINEMATIC RENDER · MP4"):** "A
  surprising positive" (opening) and "Bayes theorem for a positive test".
- **Offline seed cinematic lesson (optional flourish / hard fallback):** confirm
  its route before recording (committed under `public/lesson-assets/derivative-seed/`).

---

## Beat sheet (~2:45)

### 0:00–0:12 — Hook
**Action:** Aha landing page; let the STORY → VISUALIZE → CHOOSE → ADAPT portal
read for a beat, then click **"Start a lesson."**

**Say:** "Most AI tutors answer a question with another wall of text. Aha turns
any STEM question into a visual lesson you can watch, question, and answer back."

### 0:12–0:40 — Ask a real question and generate
**Action:** On `/create`, type the Bayes question into **YOUR QUESTION**; point
once at **"Attach a PDF to teach"** as you mention PDFs; leave level at **Early
university**; click **"Generate visual lesson."** Show the six pipeline stages
(*Understanding the question → Verifying the mathematics → Planning the lesson →
Generating narration → Rendering visual explanations → Checking and publishing*)
advancing, then trim the wait (keep real progress visible; a small "generation
trimmed" note keeps it honest).

**Say:** "So I'll ask a real one — why a positive medical test can still be
probably wrong. You could also drop in a course PDF. From here, GPT-5.6 Sol plans
the entire lesson: it understands the question, verifies the math, plans the
narration, and renders the visuals. This is a real generation — I've trimmed the
wait."

### 0:40–1:18 — The whiteboard and word-timed captions
**Action:** The lesson opens (header shows the topic + mission context). Move to
the **"Count picture: who tests positive?"** segment and press **Play**. Let the
whiteboard draw the counts diagram and formula while the captions highlight word
by word.

**Say:** "Here's the published lesson, built as a sequence of visual segments.
This one draws the reasoning as a picture of counts — real formulas, a real
diagram, and captions that highlight in time with the narration. The model
doesn't emit HTML or animation code; it writes a constrained scene description
that our player renders under fixed rules."

### 1:18–1:45 — A checkpoint makes it active
**Action:** Click **"Complete section →"** to reach **QUICK CHECK**. Read the
prompt, click **"False positives"**, click **"Submit answer"**, let **"Correct."**
+ explanation show, then **"Continue →"**.

**Say:** "Then it stops and asks — and the answer is the whole point: false
positives outnumber true positives. Checkpoints turn a passive video into active
learning, and your answers are evidence, never a mastery claim."

### 1:45–2:15 — Cinematic upgrade + the safety boundary
**Action:** Continue to **"Bayes theorem for a positive test"**, which plays as a
cinematic MP4 (badge **"CINEMATIC RENDER · MP4"**). *(Optional flourish: cut to
the offline seed lesson for a continuous, fully cinematic Manim sequence.)*

**Say:** "Some segments render instantly as a whiteboard; others upgrade in the
background to cinematic Manim video — like this one. The model's Python never
runs in our app — only inside a sandboxed, validated renderer. When every segment
finishes upgrading, a lesson looks like this."

### 2:15–2:45 — Close on OpenAI and Codex
**Action:** Show the recap (**LEARNING EVIDENCE** — sections completed and
checkpoints answered). End on the recap or the README architecture diagram.

**Say:** "The recap reports what you did, honestly. Underneath: GPT-5.6 Sol,
through the Responses API and Structured Outputs, writes the story and the scene —
while deterministic code owns every formula, grade, and exact visual. We built the
whole system with Codex. Aha: story earns attention, but plot is proof."

---

## Backup short closing (if the run goes long)

"GPT-5.6 Sol writes the constrained story and scene; deterministic code owns the
mathematics, grading, adaptation, and exact visuals; Codex helped us build and
verify the whole system. Aha uses story for attention, visual evidence for
understanding, and learner action to decide what comes next."
