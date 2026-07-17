# Product Build Brief: Adaptive Learning Mini-Drama

## 0. Instructions for the coding agent

You are the lead product engineer and interaction designer for this project. Build a polished, runnable hackathon MVP from this specification. Do not stop at a wireframe, static mockup, architecture document, or isolated code snippets.

Start by inspecting the repository. If it is empty, scaffold the smallest sensible application. Make reasonable implementation decisions without repeatedly asking for clarification. Prioritize a reliable end-to-end demo over breadth. Keep the application runnable after every major change, add focused tests for core branching logic, and document exact setup and demo steps in the README.

The finished project must visibly use GPT-5.6 for structured reasoning and content generation, and must be substantially built with Codex. Keep the primary work in one Codex task so its `/feedback` session ID can be submitted to the hackathon.

## 1. Product definition

Build a student-facing web platform that turns a question, concept, or short set of notes into a **playable adaptive mini-drama**.

The product is not a conventional AI explainer-video generator. It creates a short story in which the knowledge itself controls the fictional world's cause and effect. The student becomes a decision-maker inside the story. At key moments, the story pauses for a choice. Each choice both changes the plot and provides evidence about the student's current understanding. An AI director uses that evidence to decide how the next scene should teach: advance, verify, scaffold, or remediate.

One-line product pitch:

> Turn any question into a playable adaptive mini-drama—every choice changes both the story and how the AI teaches you.

Core design principle:

> Plot as Proof: the plot consequence must demonstrate, simulate, test, or provide a counterexample for the concept being learned. If the educational concept can be removed without breaking the scene, the scene is decorative and must be rewritten.

## 2. Target user and job to be done

Primary user: a secondary-school or early university student studying independently.

Job to be done:

> When a topic feels abstract or a worked solution is hard to follow, let me experience it as a short interactive story, make meaningful decisions, and receive a different explanation based on what I appear to understand.

## 3. MVP scope

The MVP must support:

- One pasted question, concept, or short note as input.
- Optional upload of one PDF page or image; pasted text is the guaranteed path.
- High-school STEM as the initial subject area.
- A selectable story genre, with at least:
  - science-fiction mission;
  - detective mystery.
- One generated episode lasting approximately 2–3 minutes.
- No more than three named characters.
- Three to five short scenes.
- Exactly two diagnostic choice points.
- Two or three choices per choice point, plus `I am not sure`.
- A confidence input after each answer: `guessing`, `somewhat sure`, or `very sure`.
- Three teaching strategies: `advance`, `verify`, and `remediate`.
- One final, unassisted transfer question.
- AI narration, character dialogue, subtitles, and simple cinematic motion.
- At least one precise Manim visualization embedded in the episode where the topic benefits from a graph, equation, geometry construction, timeline, or scientific simulation.
- A final learning recap showing the path taken and a cautious summary of what the system currently believes the learner understands.

The MVP must not include:

- authentication, payments, classrooms, teacher dashboards, or multi-user administration;
- whole textbooks or long lecture processing;
- an unrestricted timeline/video editor;
- infinite real-time video generation after every click;
- photorealistic actor video as a hard dependency;
- a claim that one answer proves mastery;
- arbitrary generated Python execution in the main web process.

## 4. Core user experience

### Screen 1: Create an episode

Provide:

- a large text area for the question or notes;
- optional single-file upload;
- subject/level controls with sensible defaults;
- genre selection;
- narration language selection;
- a `Generate adventure` button;
- two one-click sample prompts.

### Screen 2: Generation and storyboard

Show meaningful progress stages rather than a generic spinner:

1. Understanding the concept
2. Checking the solution
3. Turning the concept into story rules
4. Planning diagnostic choices
5. Creating scenes and voices
6. Rendering visual explanations

When generation finishes, show a compact episode blueprint:

- learning objective;
- story premise;
- characters;
- two choice points;
- the knowledge relationship embodied by each scene.

Allow the user to regenerate the whole episode, but do not build a full editor for the MVP.

### Screen 3: Interactive episode player

The player should feel like a short vertical drama or motion comic, not a slide deck:

- consistent characters and visual style;
- camera pan/zoom, fades, foreground/background layering, captions, and audio;
- dialogue bubbles or subtitles;
- embedded Manim clips for precise conceptual visualization;
- visible progress but no exposed branch tree;
- smooth pauses at choice points.

At each choice point:

1. Ask the learner to predict or decide what happens next.
2. Collect an answer.
3. Collect confidence.
4. Update the learning state.
5. Have the AI director select `advance`, `verify`, or `remediate`.
6. Play a branch whose story consequence demonstrates why that strategy is appropriate.
7. Rejoin the main plot within one short scene to prevent branch explosion.

### Screen 4: Learning recap

Show:

- choices made;
- confidence given;
- teaching strategies selected;
- concepts that appear stronger;
- concepts that may still need practice;
- final transfer-question result;
- a `Replay with a different path` action.

Use cautious language such as `The evidence suggests...` and never state that a single interaction definitively proves mastery.

## 5. Dual-state adaptive engine

Maintain two separate state objects.

### StoryState

Tracks fictional continuity:

```ts
type StoryState = {
  currentSceneId: string;
  completedSceneIds: string[];
  flags: Record<string, boolean | string | number>;
  inventory?: string[];
  relationshipNotes?: string[];
};
```

### LearnerState

Tracks limited, evidence-based learning hypotheses:

```ts
type LearnerState = {
  conceptScores: Record<string, number>; // 0 to 1, only a heuristic
  possibleMisconceptions: string[];
  confidenceHistory: Array<{
    choiceNodeId: string;
    level: "guessing" | "somewhat_sure" | "very_sure";
  }>;
  representationsUsed: Array<"story_consequence" | "diagram" | "equation" | "analogy" | "worked_example">;
  lastTeachingStrategy?: "advance" | "verify" | "remediate";
};
```

### Minimum adaptation policy

- Correct + very sure: increase the relevant concept score and prefer `advance`.
- Correct + guessing/somewhat sure: prefer `verify` with a contrasting example.
- Incorrect + guessing/not sure: prefer `remediate` with reduced complexity and a visual scaffold.
- Incorrect + very sure: prefer `remediate` using a counterfactual plot consequence that makes the misconception fail visibly.
- Do not use the same representation twice in a row when another suitable representation is available.
- The final transfer question is evaluated separately and has more weight than earlier choices.

The implementation may use a deterministic rules engine for reliability, with GPT-5.6 producing a structured `DirectorDecision` that is validated against the allowed strategies and available branch scenes.

```ts
type DirectorDecision = {
  strategy: "advance" | "verify" | "remediate";
  nextSceneId: string;
  learnerStatePatch: Partial<LearnerState>;
  shortRationale: string;
};
```

Do not expose chain-of-thought. `shortRationale` should be a concise product explanation such as `The learner selected the correct relationship but reported low confidence, so a contrasting case will verify understanding.`

## 6. Generated episode specification

GPT-5.6 must first generate structured data, not raw UI code or an unrestricted video script. Validate the result before asset generation.

```ts
type EpisodeSpec = {
  id: string;
  title: string;
  sourceInput: string;
  subject: string;
  level: string;
  learningObjective: string;
  canonicalExplanation: string;
  concepts: Array<{
    id: string;
    name: string;
    relationship: string;
  }>;
  storyBible: {
    genre: "sci_fi" | "detective";
    premise: string;
    stakes: string;
    visualStyle: string;
    characters: Array<{
      id: string;
      name: string;
      role: string;
      appearancePrompt: string;
      voiceStyle: string;
    }>;
  };
  scenes: SceneSpec[];
  choiceNodes: ChoiceNodeSpec[];
  transferTask: TransferTaskSpec;
};

type SceneSpec = {
  id: string;
  kind: "story" | "explanation" | "branch" | "transfer";
  title: string;
  summary: string;
  educationalPurpose: string;
  conceptIds: string[];
  characterIds: string[];
  narration?: string;
  dialogue: Array<{
    characterId: string;
    text: string;
    emotion?: string;
  }>;
  visualDirection: string;
  manimSpec?: {
    template: string;
    parameters: Record<string, string | number | boolean>;
  };
  nextSceneIds: string[];
};

type TransferTaskSpec = {
  id: string;
  prompt: string;
  conceptIds: string[];
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};
```

Each `ChoiceNodeSpec` must map every option to a distinct knowledge hypothesis and story consequence:

```ts
type ChoiceNodeSpec = {
  id: string;
  sceneId: string;
  prompt: string;
  conceptId: string;
  options: Array<{
    id: string;
    label: string;
    correctness: "correct" | "incorrect" | "uncertain";
    learnerHypothesis: string;
    storyConsequence: string;
    allowedStrategies: Array<"advance" | "verify" | "remediate">;
    branchSceneIds: string[];
  }>;
};
```

Every generated episode must pass these checks before rendering:

- the canonical solution is internally consistent;
- every choice has exactly one intended interpretation;
- distractors correspond to plausible reasoning, not random wrong values;
- every branch preserves story continuity;
- every branch teaches through consequence, comparison, simulation, or evidence;
- branches converge again;
- the transfer question changes the surface context while testing the same underlying relationship;
- character dialogue does not introduce unsupported factual claims;
- entertainment details do not overwhelm the learning objective.

## 7. Content-generation pipeline

Implement the pipeline as observable, resumable stages:

1. `normalize_input`
   - Extract pasted text.
   - For an image, use multimodal extraction.
   - For a PDF, support one-page text extraction; fail gracefully if extraction is unavailable.

2. `build_knowledge_spec`
   - Identify the learning objective, concepts, canonical answer, prerequisites, and plausible alternative interpretations.

3. `validate_knowledge_spec`
   - Run a separate verification pass.
   - For supported mathematical topics, use deterministic checks such as SymPy where practical.
   - If confidence is insufficient, ask the user for a clearer source rather than inventing facts.

4. `build_story_bible`
   - Convert the concept into world rules, stakes, characters, and a short plot.
   - Enforce Plot as Proof.

5. `build_branch_graph`
   - Generate exactly two choice points.
   - Map each option to a learner hypothesis, teaching strategy, and short branch.
   - Ensure reconvergence.

6. `generate_assets`
   - Create consistent illustrated scene panels or deterministic placeholders.
   - Generate narration/dialogue audio through a provider abstraction.
   - Generate subtitle timing.
   - Generate constrained Manim scene specifications.

7. `render_and_review`
   - Render Manim in an isolated process/container.
   - Extract representative frames and run a visual quality check for overlap, clipping, unreadable labels, or obvious scene mismatch.
   - Attempt at most two automated repairs.
   - Preserve a deterministic fallback visualization.

8. `publish_episode`
   - Save the validated `EpisodeSpec`, assets, branch graph, and initial states.
   - Launch the interactive player.

## 8. Media strategy

The MVP should use a hybrid format rather than depending on expensive full-motion generative video:

- illustrated character panels generated once per episode;
- CSS/Canvas motion such as pan, zoom, parallax, fades, lighting, and shake;
- TTS narration and character dialogue;
- subtitles;
- Manim-rendered clips for exact educational visuals;
- a web-native branching player.

Pre-generate the small branch catalog during episode creation. At runtime, the AI director chooses the best branch and may adapt a short line of narration, but the learner should not wait for a complete new video render after every click.

Provide media-provider interfaces with development fallbacks so the app remains runnable without every external service:

```ts
interface ImageProvider {
  generateSceneImage(prompt: string): Promise<string>;
}

interface NarrationProvider {
  synthesize(text: string, voice: string): Promise<{ audioUrl: string; durationMs: number }>;
}

interface LessonModelProvider {
  generateEpisodeSpec(input: unknown): Promise<EpisodeSpec>;
  chooseNextStrategy(input: unknown): Promise<DirectorDecision>;
}
```

Include a deterministic demo/fallback provider using local sample assets and seeded JSON.

## 9. Technical architecture

Use a simple, hackathon-friendly architecture:

- Web application: Next.js with TypeScript and an accessible responsive UI.
- Styling: a small coherent design system; avoid generic dashboard styling.
- Episode state: local persistence or SQLite is sufficient. Do not add a hosted database unless already required.
- AI orchestration: server-only calls with structured JSON outputs and schema validation.
- Render worker: Python service or isolated worker using `manim==0.20.1`, FFmpeg, LaTeX, and required fonts.
- Job state: a lightweight persisted job record with stage, progress, error, and retry count.
- Assets: local filesystem in development, behind a storage adapter.

Recommended repository shape:

```text
app/ or src/app/
  create/
  episode/[id]/
  api/
components/
  player/
  choices/
  generation/
lib/
  ai/
  episode/
  adaptation/
  media/
  validation/
renderer/
  Dockerfile
  render_scene.py
  templates/
data/
  samples/
tests/
```

Minimum server contract:

```text
POST /api/episodes
  Create a generation job from source input and preferences.

GET /api/jobs/:id
  Return the current pipeline stage, progress, recoverable error, and episode id when complete.

GET /api/episodes/:id
  Return the validated episode specification, asset URLs, initial StoryState, and initial LearnerState.

POST /api/episodes/:id/choices
  Accept choice node id, option id, confidence, StoryState, and LearnerState.
  Return a validated DirectorDecision plus updated states.

POST /api/episodes/:id/transfer
  Evaluate the final unassisted transfer task and return the learning recap.
```

Generated Python must never execute inside the main web process. For the MVP, prefer a constrained scene DSL compiled into reviewed Manim templates. If arbitrary generated Manim code is used, run it only inside a one-shot sandbox with no network, non-root user, read-only root filesystem, dropped capabilities, CPU/memory/PID/file-size limits, and a hard timeout.

Secrets must remain server-side. Provide `.env.example` without real credentials.

## 10. Visual and interaction direction

The product should feel cinematic, playful, and intelligent—not childish and not like an enterprise dashboard.

Design cues:

- dark cinematic background with one vivid accent color per episode;
- vertical-drama framing on mobile and a centered cinematic stage on desktop;
- readable subtitles and high contrast;
- consistent character portraits;
- animated environmental layers;
- concise dialogue;
- choice cards integrated into the scene;
- immediate visible consequence after a choice;
- accessibility: keyboard navigation, reduced-motion support, captions on by default, clear focus states.

Do not reward wrong answers with more entertaining content than correct answers. All paths should have comparable narrative quality.

## 11. Required demo episode

Ship a complete seeded episode called **Moonbase Last Shot**. The final product name should remain undecided; this is only a demo episode title.

Source question:

> A capsule is launched horizontally from the same height. If its horizontal speed doubles, how do its landing time and horizontal distance change?

Story:

- A lunar dust storm is approaching.
- The learner controls a rover that must launch a medicine capsule across a crater.
- The capsule's horizontal launch speed is doubled.
- The learner must predict what happens.

Choice point 1:

- `It lands earlier.`
- `It lands at the same time and travels twice as far.`
- `It lands later.`
- `I am not sure.`

Required remediation for `It lands earlier`:

- Show a split experiment in which one capsule is launched horizontally while another is dropped from the same height.
- Their vertical timers remain synchronized.
- The story consequence demonstrates that horizontal velocity does not control vertical fall time.

Choice point 2 changes lunar gravity. It must test whether the learner understands the vertical-motion relationship rather than merely memorizing the first answer.

The final transfer task must use a different surface context, such as a ball rolling off a table, with no narration or hints.

## 12. Acceptance criteria

The MVP is complete only when all of the following are true:

1. A new developer can install and run the web app using documented commands.
2. The seeded Moonbase episode runs without external AI services.
3. A user can paste a new STEM question and receive either a generated episode or a clear, recoverable validation error.
4. Generation progress exposes real pipeline stages.
5. The episode player includes dialogue/audio, subtitles, motion, two choices, confidence input, and a final transfer task.
6. Correct/high-confidence and incorrect/high-confidence choices visibly produce different teaching scenes.
7. Branches update both `StoryState` and `LearnerState` and later reconverge.
8. At least one Manim visualization renders successfully and appears in the player.
9. A render failure produces a fallback visual instead of breaking the episode.
10. The learning recap accurately reflects the actual path taken and uses cautious wording.
11. Core adaptation rules and branch selection have automated tests.
12. No API key or secret is exposed to the browser or committed to the repository.
13. The README explains architecture, setup, sample flow, limitations, and exactly how GPT-5.6 and Codex were used.
14. The project is polished enough to demonstrate end to end in under three minutes.

## 13. Demo sequence for judging

Prepare the product for this exact three-minute demonstration:

- 0:00–0:20 — Paste the projectile-motion question and choose sci-fi.
- 0:20–0:40 — Show the generated concept-to-plot blueprint and branch map.
- 0:40–1:15 — Begin the Moonbase story with character voices and cinematic presentation.
- 1:15–1:45 — Choose the confident wrong answer and show the tailored counterfactual branch.
- 1:45–2:15 — Answer the second checkpoint and show the AI director changing strategy.
- 2:15–2:35 — Complete the unassisted transfer task and show the learning recap.
- 2:35–3:00 — Briefly show the generation pipeline, Manim render evidence, and how GPT-5.6 and Codex were used.

## 14. Implementation priorities

Build in this order:

1. Seeded EpisodeSpec, branching player, state engine, and recap.
2. Generation UI and structured AI pipeline.
3. Manim rendering with a deterministic fallback.
4. Narration, subtitles, and cinematic motion.
5. Input extraction and additional generated episode support.
6. Visual polish, tests, README, and demo rehearsal.

When time is limited, preserve the end-to-end interactive learning loop. Cut broad upload support, additional genres, export features, and sophisticated video generation before cutting adaptation, story consequences, or the transfer task.
