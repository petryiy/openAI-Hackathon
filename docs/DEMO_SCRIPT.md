# Aha — three-minute demo script

This script matches the current calculus-first product. The spoken copy is about 320 words, leaving time for clicks and visual pauses.

## Before recording

- Set `OPENAI_MODEL=gpt-5.6`, restart with `pnpm dev`, and keep the API key off-screen.
- Keep the Manim worker healthy if you want the dynamic lesson to show MP4 evidence; the exact SVG fallback is still a valid demo path.
- Generate the chain-rule lesson once with GPT-5.6 and record the real six-stage progress page. Edit out only the inactive waiting time—do not imply the cut is real-time.
- Record from a fresh lesson or clear its `plot-as-proof:lesson:*` local-storage entry so the player starts at section one.
- Keep captions on. Use 1.25× playback if narration is included.
- Rehearse these exact inputs:
  - Diagnostic 1: **Power rule only**
  - Diagnostic 2: **No — that loses a required relationship**
  - Practice step 1: `x^2+1`
  - Practice step 2: `2x`
  - Practice step 3, twice: `3*(x^2+1)^2`
  - Repair check: `2x`
  - Corrected step 3 and step 4: `6x*(x^2+1)^2`
  - Transfer: `4x*(x^2+2)`

## 0:00–0:15 — Hook

**Action:** Show the Aha landing page and its Story → Visualize → Choose → Adapt portal. Click **Start a lesson**.

**Say:**

“Most AI tutors answer a math question with more text. Aha turns a derivative into a visual mission, asks the learner to commit to each relationship, and changes the next explanation when the reasoning breaks.”

## 0:15–0:35 — Create and observe

**Action:** Load **Chain rule mission**, click **Generate visual lesson**, show the six real stages, then cut from the completed job to the published lesson.

**Say:**

“I’ll generate a chain-rule lesson with GPT-5.6. This is a persisted server job: it verifies the mathematics, plans the language, generates narration, renders the visuals, and only then publishes. I’ve shortened the wait in this recording.”

## 0:35–1:00 — Separate creativity from truth

**Action:** Show the mission context, expression-structure visual, and the verified derivative. Briefly play a Manim segment or point to the deterministic-visual badge.

**Say:**

“GPT-5.6 writes the mission and five formula-free transitions through Structured Outputs. It never supplies the derivative, grade, template, or code. TypeScript parses a restricted expression tree and differentiates it; an isolated SymPy service can independently verify the result; Manim or exact SVG makes the structure visible.”

## 1:00–1:25 — A diagnostic changes the representation

**Action:** At Diagnostic 1 choose **Power rule only** and submit. Show the chain-rule repair visual, then continue. At Diagnostic 2 choose the correct **No** option.

**Say:**

“The first answer reveals a rule-selection misconception, so Aha switches to a visual that reads the composition from the outside inward. There is no confidence theater and no model deciding whether I am right. The choice maps to a reviewed misconception and representation.”

## 1:25–2:08 — Make the learner repair the mistake

**Action:** Complete practice steps 1 and 2. At step 3 enter `3*(x^2+1)^2` twice. Show the missing-inner-derivative repair, enter `2x`, return, and correct steps 3 and 4.

**Say:**

“Now the learner builds the derivative. Symbolic equivalence accepts different valid forms. I’ll omit the inner derivative twice. The first miss gives a local hint; the repeated pattern opens a dedicated repair. Aha will not let me continue until I recover the smaller fact that the inner derivative is two x, then apply it to the original problem.”

## 2:08–2:30 — Unassisted transfer

**Action:** Submit `4x*(x^2+2)` for the transfer function.

**Say:**

“The final task changes the function while preserving the chain-rule relationship. It has no steps, hints, or remediation, so the result is independent evidence rather than another guided success.”

## 2:30–2:46 — Evidence, not mastery

**Action:** Show the recap: completed steps, diagnostic count, misconception count, and transfer result.

**Say:**

“The recap reports the path, possible misconception, and transfer result. It says what this lesson suggests; it never claims one interaction proves mastery.”

## 2:46–3:00 — Reliability and OpenAI proof

**Action:** End on the generated lesson or briefly show the architecture diagram in the README.

**Say:**

“The seeded lesson runs with no keys. Narration falls back to captions, Manim falls back to deterministic SVG, and unsupported calculus is rejected honestly. GPT-5.6 creates constrained language; Codex helped us design, build, debug, test, and review the complete system. Aha makes the mission memorable, but verified visuals do the teaching.”

## Short backup closing

If the interaction runs long, skip the detailed recap and use this ending:

“GPT-5.6 creates the constrained story language; deterministic code owns the mathematics, grading, adaptation, and visuals. Codex helped us build and verify the system around it. Aha uses story for attention, visual evidence for understanding, and learner action to decide what comes next.”
