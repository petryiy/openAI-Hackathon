# Aha — Devpost submission draft

Copy-ready English submission text based on the current calculus-first build. Replace every `[ADD ...]` placeholder before publishing.

## Project name

Aha

## Elevator pitch

Aha turns derivative questions into cinematic visual lessons that diagnose mistakes and adapt the next explanation.

## Short description

Aha combines GPT-5.6 storytelling with verified symbolic mathematics, Manim/SVG animation, deterministic grading, and misconception-specific visual repair. Instead of returning another worked solution, it makes the learner predict, build, repair, and transfer the idea.

## About the project

### Inspiration

We were inspired by an AI short drama set entirely inside a car, where two kidnappers tried to outthink Einstein and their argument naturally exposed mathematical ideas. The setting barely changed, but conflict, timing, and character made the explanation memorable.

That raised a harder product question: **could an AI-generated story make abstract mathematics easier to see, without letting entertainment or a language model invent the mathematics?**

Our first idea was “upload a question and generate an animated explanation.” That was not enough. A narrated solution is still passive, and an attractive animation can be educationally empty. We added predictions, diagnostic pauses, exact visualizations, deterministic step grading, misconception-specific remediation, and an unassisted transfer task.

The result is Aha. Its design rule is “plot as proof”: story creates a reason to care, but visual evidence and learner action must carry the concept.

### What it does

A learner enters a supported English derivative question such as:

$$
f(x)=(x^2+1)^3.
$$

Aha then:

1. parses the expression into a restricted symbolic AST;
2. identifies the governing derivative rule and computes the exact derivative;
3. optionally asks an isolated SymPy service to verify the result independently;
4. asks GPT-5.6 for a short, formula-free mission setting and five narrative bridges;
5. generates narration and five synchronized visual lesson segments;
6. pauses for exactly two diagnostic choices;
7. grades four rule-specific construction steps using symbolic equivalence;
8. detects known error patterns and changes the next visual explanation; and
9. ends with an unassisted same-rule transfer problem and a cautious evidence recap.

For the chain-rule example, the verified result is:

$$
f'(x)=6x(x^2+1)^2.
$$

If the learner repeatedly submits

$$
3(x^2+1)^2,
$$

Aha recognizes the missing inner derivative. It does not ask a language model to judge the answer and it does not merely show a red error. It opens a dedicated Manim/SVG repair, asks the learner to recover the smaller fact $u'=2x$, and only then returns to the original step. The final transfer task changes the function to $(x^2+2)^2$ and removes all hints.

This creates an adaptive loop:

> See the structure → predict the rule → build the derivative → expose the misconception → change the representation → transfer without help.

### How we built it

Aha is a Next.js, React, and TypeScript application with Zod contracts, the OpenAI JavaScript SDK, a restricted expression grammar, deterministic SVG, an isolated Manim/SymPy service, ElevenLabs narration, and Vitest coverage.

The primary lesson runtime uses a versioned `LessonSpec` and keeps presentation progress separate from learning evidence through `LessonStoryState` and `LessonLearnerState`. The learner state records diagnostic answers, step attempts, possible misconception codes, representations used, completed steps, and the independent transfer result. It never turns one answer into a mastery claim.

The current capability registry supports bounded one-variable derivatives using power, sum, product, quotient, `sin`, `cos`, `exp`, `ln`, and one-layer chain rules. Inputs are limited to a 30-node expression tree with bounded depth. Unsupported calculus is rejected with `UNSUPPORTED_CALCULUS_SCOPE` and a usable example instead of being turned into generic, unverified AI text.

Twenty-one code-owned Manim templates cover story hooks, expression structure, derivative rules, worked examples, summaries, and misconception-specific repairs. The renderer receives only allowlisted template IDs and validated polynomial or symbolic AST parameters. It generates LaTeX internally and never accepts model-authored Python, user LaTeX, shell arguments, filesystem paths, or string expressions for `sympify`.

The lesson generation page observes six persisted server-owned stages:

- understanding the question;
- verifying the mathematics;
- planning the lesson;
- generating narration;
- rendering visual explanations; and
- checking and publishing.

The job URL survives refresh and automatically hands off to the published lesson. A committed seeded lesson includes reviewed Manim MP4s, posters, captions, and ElevenLabs audio, so the core experience works without external services. Dynamic lessons retain exact SVG and captions if Manim or narration is unavailable.

### How we used GPT-5.6

GPT-5.6 is deliberately **not** the source of mathematical truth in Aha.

By the time GPT-5.6 is called, TypeScript has already parsed the expression, identified the rule, differentiated it, created the checkpoints, selected the practice recipe, generated the transfer problem, and chosen the approved visual templates. GPT-5.6 receives those verified facts and returns one Structured Output containing:

- a light mission setting;
- the learner's story task;
- a consequence that gives the mathematics stakes; and
- exactly five short English transition bridges.

The integration uses the Responses API with `client.responses.parse`, `text.format`, and a Zod-derived schema. Local gates reject any model-written bridge containing formulas, numbers, markup, code, duplicate segments, or missing segments. Deterministic narration then inserts the verified mathematical claims.

This boundary lets GPT-5.6 do what it is good at—coherent language, tone, and narrative motivation—while code owns answers, grading, adaptation, and exact visuals. The retained legacy episode runtime also demonstrates broader structured story generation with code-planned shots, semantic quality gates, and bounded recorded repairs.

### How we used Codex

Codex was our product and engineering collaborator throughout the project. We used it to:

- challenge the original “question in, animated video out” idea and define a stronger adaptive learning loop;
- turn product conversations into a durable product specification, typed contracts, architecture decisions, quality gates, and acceptance criteria;
- build the cinematic 3D onboarding, create experience, persisted generation page, lesson player, deterministic math engine, grading APIs, Manim/SVG boundary, narration timing, remediation flow, transfer task, and recap;
- inspect real failures involving model configuration, Structured Outputs, symbolic equivalence, render latency, unavailable Manim workers, audio/video synchronization, and route transitions;
- refactor the earlier broad episode generator into a focused derivative capability registry that can reject unsupported content honestly;
- create and maintain focused tests, run strict type checking, linting, production builds, container smoke tests, and desktop/mobile browser QA; and
- preserve team knowledge in `AGENTS.md`, `PRODUCT_SPEC.md`, `PROJECT_STATE.md`, a decision log, evals, and a team workflow so two teammates' Codex work compounded instead of restarting from one giant prompt.

GPT-5.6 authors the constrained language inside each dynamic lesson. Codex helped us design, implement, debug, verify, and document the system around it.

### Challenges we faced

**Making the AI useful without making it the answer key.** A free-form model could create fluent but incorrect mathematics. We moved all formulas, rule selection, grading, transfer generation, and render parameters into deterministic code, leaving GPT-5.6 a narrow language-planning role.

**Turning “adaptive” into an observable behavior.** A generic “try again” message is not adaptation. We created misconception codes such as `MISSING_INNER_DERIVATIVE`, `PRODUCT_OF_DERIVATIVES`, and `MISSING_DENOMINATOR_SQUARE`. A repeated error selects a dedicated representation and requires a smaller repair check before the learner can continue.

**Generalizing animation safely.** One handcrafted video is easy; arbitrary model-generated Python is unsafe. We built a typed visual grammar of twenty-one reviewed Manim templates backed by the same restricted AST used for grading and SVG fallback.

**Keeping the experience alive when providers fail.** OpenAI, ElevenLabs, Docker, or the render worker may be unavailable during a demo. We persisted jobs, classified recoverable errors, committed one complete offline lesson, kept captions authoritative, and made every dynamic visual publish through exact SVG when Manim is offline.

**Synchronizing narration with mathematics.** Generated speech and silent Manim video do not always have identical duration. Narration is the clock; Aha measures the audio duration and adjusts silent video playback rate without changing speech pitch or cutting off the explanation.

**Choosing honest scope.** “Turn any question into a lesson” sounds exciting but is not credible for a correctness-first prototype. Aha currently supports a finite derivative grammar and explicitly rejects limits, integrals, multivariable calculus, implicit differentiation, related rates, and other unreviewed capabilities.

### What we learned

- In education, a valid JSON shape is not the same thing as a valid lesson.
- Generative language and deterministic mathematical systems are complementary.
- A visualization becomes useful when it is tied to a learner hypothesis, not when it merely moves.
- Requiring a smaller repair action is more informative than showing a longer explanation after an error.
- Fallback media is part of the pedagogy, not only an infrastructure concern.
- Codex becomes a better teammate when constraints, mistakes, tests, and decisions live in the repository.

### What we are proud of

- A complete primary learning loop: five visual segments, two diagnostics, four graded steps, targeted repair, transfer, and recap.
- Safe symbolic differentiation and equivalence grading without `eval` or model judgment.
- Twenty-one allowlisted Manim templates with an independent SymPy verification boundary.
- A live chain-rule acceptance lesson with 83.8 seconds of teaching media.
- An offline seeded lesson with committed Manim video, ElevenLabs narration, captions, and deterministic SVG fallback.
- A real six-stage generation page that survives refresh and automatically enters the lesson.
- 61 focused tests plus strict TypeScript, lint, production build, renderer, fallback, desktop, and mobile verification.

### What's next

We would first add learning evals for every registered derivative capability. Only then would we extend the typed visual grammar to limits and definite integrals. We would also move generation to a durable external queue, support teacher review and editing, add real PDF extraction, broaden narration voices and languages, and collect longitudinal evidence—without weakening the rule that exact mathematics stays outside the generative model.

## Built with

- GPT-5.6
- OpenAI Responses API
- OpenAI Structured Outputs
- Codex
- Next.js
- React
- TypeScript
- Zod
- Three.js / React Three Fiber
- Manim 0.20.1
- SymPy
- ElevenLabs
- SVG
- Docker
- Vitest
- pnpm

## Links to add

- Live demo: [ADD URL]
- GitHub repository: [ADD URL]
- Demo video: [ADD YOUTUBE URL]
- Primary Codex `/feedback` Session ID: [ADD SESSION ID]

## Internal pre-submission checklist — do not paste into Devpost

- Set `OPENAI_MODEL=gpt-5.6` for the final run and restart the server.
- Record one successful primary chain-rule lesson generation with GPT-5.6 and retain the job/lesson evidence.
- Do not claim that PDF extraction is implemented; the PDF control is local-only reference UI.
- Do not claim unlimited STEM or calculus generation; the reviewed primary scope is finite derivatives.
- Do not say GPT-5.6 supplies formulas, grades answers, selects Manim templates, or controls runtime adaptation.
- Do not say Manim is mandatory; seeded videos are committed and dynamic lessons have deterministic SVG fallback.
- Do not describe one recap as proof of mastery.
