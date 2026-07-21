# Product Build Brief: Adaptive Learning Mini-Drama

> Current calculus-core override (2026-07-20): the English-only `LessonSpecV2`
> flow uses exactly two direct diagnostic choices without a separate confidence
> question. Confidence fields below describe only the retained legacy episode
> contract. The current core supports a finite derivative capability registry
> and explicitly rejects unsupported calculus rather than promising arbitrary
> question generation.

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

Product hierarchy:

> Story creates a reason to care. Visualization makes the abstract relationship understandable. Interaction checks what the learner noticed. Adaptation chooses the next visualization and explanation.

The drama is a motivational and narrative interface around visual teaching; it must never replace the diagram, graph, spatial model, comparison, process animation, or simulation required to understand an abstract concept.

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
- A bottle-episode format as the default narrative mode: one primary location, a ticking clock, three or fewer characters, reusable observable props, and escalating intellectual conflict.
- One generated episode lasting approximately 2–3 minutes.
- No more than three named characters.
- Three to five short scenes.
- Exactly two diagnostic choice points.
- Two or three choices per choice point, plus `I am not sure`.
- A confidence input after each answer: `guessing`, `somewhat sure`, or `very sure`.
- Three teaching strategies: `advance`, `verify`, and `remediate`.
- One final, unassisted transfer question.
- AI narration, character dialogue, subtitles, and simple cinematic motion.
- At least two concept-relevant teaching visualizations: one core visualization on every path and one adaptive visualization selected by a branch.
- At least one exact code-generated visualization using Manim, SVG, Canvas, or another deterministic renderer where the topic involves a graph, equation, geometry construction, timeline, spatial relationship, or scientific simulation.
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
- a visualization focus mode that can temporarily fill most of the stage, highlight the relationship being explained, and then return smoothly to the same story location;
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
    episodeFormat: "bottle_episode";
    tone: "warm" | "absurd" | "suspenseful" | "deadpan";
    premise: string;
    stakes: string;
    visualStyle: string;
    singleLocation: string;
    tickingClock: string;
    observableProps: string[];
    blockingZones: string[];
    worldRules: string[];
    runningGag: string;
    callbackPayoff: string;
    visualMotifs: string[];
    characters: Array<{
      id: string;
      name: string;
      role: string;
      desire: string;
      flaw: string;
      catchphrase?: string;
      appearancePrompt: string;
      voiceStyle: string;
      forbiddenBehaviors: string[];
    }>;
  };
  scenes: SceneSpec[];
  visualizations: TeachingVisualizationSpec[];
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
  visualizationIds: string[];
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

type ShotSpec = {
  id: string;
  sceneId: string;
  template: string;
  durationMs: number;
  narrativeFunction: string;
  educationalFunction: string;
  characterIds: string[];
  dialogue?: string;
  visualAction: string;
  cameraMove: string;
  soundCue?: string;
  jokeSetup?: string;
  jokePayoff?: string;
  manimOverlay?: Record<string, unknown>;
};

type TransferTaskSpec = {
  id: string;
  prompt: string;
  conceptIds: string[];
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};

type BottleEpisodeSpec = {
  location: string;
  tickingClock: string;
  expertCharacterId: string;
  skepticalCharacterId: string;
  impulsiveCharacterId?: string;
  observableProps: Array<{
    id: string;
    name: string;
    visualPosition: string;
    educationalUse: string;
    callbackUse?: string;
  }>;
  knowledgeEscalation: string[];
  powerShiftBeats: string[];
  choiceNodeIds: string[];
  reversal: string;
  finalPayoff: string;
};

type TeachingVisualizationSpec = {
  id: string;
  conceptIds: string[];
  type:
    | "annotated_image"
    | "diagram"
    | "graph"
    | "geometry_transformation"
    | "process_animation"
    | "side_by_side_comparison"
    | "simulation"
    | "timeline"
    | "probability_model"
    | "spatial_model";
  learningPurpose: string;
  learnerShouldNotice: string[];
  concreteRepresentation?: string;
  abstractRepresentation?: string;
  variablesOrLabels: string[];
  visualEncoding: {
    emphasis: string[];
    colorMeaning: Record<string, string>;
    motionMeaning?: Record<string, string>;
  };
  renderer: "manim" | "svg" | "canvas" | "generated_image" | "composited";
  placement: "in_world_display" | "prop_overlay" | "split_screen" | "focus_mode";
  trigger: "core" | "advance" | "verify" | "remediate";
  narration: string;
  checkForUnderstanding?: string;
  deterministicFallback: string;
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

4. `build_creative_bible`
   - Convert the concept into world rules, stakes, characters, visual motifs, a running gag, and a callback payoff.
   - Give each major character a desire, flaw, and stable comic function.
   - Default to a bottle episode: choose one high-pressure location, one ticking clock, and a small set of visible props through which the characters can infer or test the concept.
   - Assign distinct dramatic functions: an expert or careful reasoner, a skeptic, and optionally an impulsive overconfident character who embodies plausible misconceptions.
   - Enforce Plot as Proof: the educational relationship must drive the fictional cause and effect.

5. `build_beat_sheet`
   - Write a compact dramatic structure: cold open, goal, first decision, consequence, concept reveal, second decision, reversal, transfer challenge, and callback payoff.
   - Every beat must have both a narrative function and an educational function.
   - Keep incidental entertainment details under 20% of total runtime.

6. `build_branch_graph`
   - Generate exactly two choice points.
   - Map each option to a learner hypothesis, teaching strategy, and short branch.
   - Ensure reconvergence.

7. `build_visualization_plan`
   - Decide which abstract relationships require a graph, diagram, spatial model, comparison, simulation, process animation, or generated conceptual image.
   - Generate one core visualization plus branch-specific `advance`, `verify`, and `remediate` candidates.
   - State explicitly what the learner should notice in each visualization.
   - Choose the teaching representation from the learner state: counterexample for a confident error, concrete-to-abstract mapping for uncertainty, contrasting case for verification, and concise extension for advancement.
   - Use deterministic renderers for exact formulas, axes, scale, geometry, numerical values, and scientific relationships. Use image generation for characters, environments, analogies, and conceptual illustrations that do not require exact measurement.

8. `build_shot_list`
   - Compose shots from the approved reusable shot-template catalog.
   - Specify camera movement, character action, dialogue, sound cue, teaching purpose, and optional setup/payoff for each shot.
   - Integrate each teaching visualization into the story through an in-world display, prop overlay, split-screen comparison, or full-stage focus transition.
   - Do not ask the model to invent arbitrary UI layouts or an entirely new animation language.

9. `creative_quality_gate`
   - Score the script, pedagogy, visualization, humor relevance, character continuity, shot variety, and pacing using the quality gates in Section 10.
   - Reject or locally regenerate any failing beat before expensive media generation.

10. `generate_assets`
   - Create consistent illustrated scene panels or deterministic placeholders.
   - Generate explanatory images, diagrams, graphs, and animations as first-class teaching assets rather than decorative backgrounds.
   - Generate narration/dialogue audio through a provider abstraction.
   - Generate subtitle timing.
   - Generate constrained Manim scene specifications.

11. `render_and_review`
   - Render Manim in an isolated process/container.
   - Extract representative frames and run a visual quality check for overlap, clipping, unreadable labels, obvious scene mismatch, character drift, and weak composition.
   - Attempt at most two automated repairs.
   - Preserve a deterministic fallback visualization.

12. `publish_episode`
   - Save the validated `EpisodeSpec`, assets, branch graph, and initial states.
   - Launch the interactive player.

## 8. Media strategy

The MVP should use a hybrid format rather than depending on expensive full-motion generative video:

- one highly polished primary set reused across the bottle episode;
- illustrated character panels generated once per episode;
- CSS/Canvas motion such as pan, zoom, parallax, fades, lighting, and shake;
- TTS narration and character dialogue;
- subtitles;
- Manim-rendered clips for exact educational visuals;
- generated conceptual images and annotated illustrations when they clarify scale, analogy, structure, or spatial relationships without requiring mathematical precision;
- a web-native branching player.

Pre-generate the small branch catalog during episode creation. At runtime, the AI director chooses the best branch and may adapt a short line of narration, but the learner should not wait for a complete new video render after every click.

Visual variety must come from blocking, camera composition, props, reactions, overlays, lighting changes, and consequences within the set—not from repeatedly generating new locations. Reuse the same environment and character assets to improve continuity and allocate generation budget to writing, voices, timing, and performance.

Visual teaching rules:

- Never rely on dialogue alone when a relationship can be shown.
- Do not allow more than 15 seconds of explanation without a concept-relevant visual change.
- Introduce visual elements progressively; avoid presenting the finished dense diagram all at once.
- Synchronize narration with highlighting, motion, labels, and state changes.
- Use a consistent color meaning within an episode, such as blue for horizontal motion and amber for vertical motion.
- Label the exact feature the learner should inspect, then remove unnecessary decoration.
- Preserve the same variables and notation as the source material unless there is a documented reason to translate them.
- Generated images must not be trusted for exact equations, axes, scale, geometry, or numeric relationships; render those deterministically and composite them over or beside the image.
- A visualization may take over the stage in focus mode without counting as a new story location. Return to the same set after the explanation.

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

## 10. Visual, narrative, and creative quality system

The product should feel cinematic, playful, and intelligent—not childish and not like an enterprise dashboard.

### 10.1 UI quality ownership

The AI must never generate the product-shell layout. It may generate episode content only inside approved components. Page structure, typography, spacing, player controls, choice cards, loading states, and recap components must come from the fixed design system.

Default product-shell tokens:

- background: `#080B14`;
- elevated surface: `#121827`;
- primary text: `#F6F2E8`;
- muted text: `#98A2B3`;
- default accent: `#F6C453`, overridable by the episode theme;
- secondary accent: `#5AD7FF`;
- spacing: 8px base grid;
- corner radii: 16–24px;
- Chinese body type: `Noto Sans SC` or a metrically safe local fallback;
- English display type: `Space Grotesk` or `Bricolage Grotesque`, with a local fallback.

Avoid generic AI-product styling: purple gradient backgrounds, decorative particle fields, excessive glassmorphism, dense dashboards, arbitrary card grids, and glowing borders on every element.

Required UI qualities:

- dark cinematic background with one vivid accent color per episode;
- vertical-drama framing on mobile and a centered cinematic stage on desktop;
- readable subtitles and high contrast;
- consistent character portraits;
- animated environmental layers;
- concise dialogue;
- choice cards integrated into the scene;
- immediate visible consequence after a choice;
- accessibility: keyboard navigation, reduced-motion support, captions on by default, clear focus states.

Perform visual QA at `1440x900` and `390x844`, including normal playback, choice state, long-subtitle state, loading, recoverable failure, and fallback-media state. Check overflow, hierarchy, contrast, subtitle obstruction, target sizes, and character cropping.

### 10.2 Narrative beat grammar

Use this default 2–3 minute beat structure. Timing may vary slightly, but no required beat may be omitted:

| Approximate time | Required beat |
| --- | --- |
| 0–8s | Cold open: crisis, surprising consequence, or concept-linked visual gag |
| 8–25s | Establish the learner's role, character goal, stakes, and world rule |
| 25–40s | First meaningful story decision |
| 40–65s | Immediate consequence of that decision |
| 65–90s | Visual explanation, counterexample, comparison, or simulation |
| 90–110s | Second decision with one changed condition |
| 110–135s | Reversal or escalation that requires applying the concept |
| 135–155s | Unassisted transfer challenge |
| 155–170s | Resolve the story and pay off the running gag |

Dialogue should be concise. Prefer one idea per line, a visual change every 3–6 seconds, and a short reaction beat after a punchline. Do not turn the middle of the episode into a conventional lecture.

### 10.3 Bottle-episode narrative template

The default episode is a single-location chamber drama. It should remain engaging through character conflict, information asymmetry, a ticking clock, power shifts, and the reuse of observable props.

Approved initial story containers:

- moving vehicle or autonomous shuttle;
- spacecraft, rover cockpit, or mission-control room;
- detective interrogation room;
- courtroom or hearing room;
- locked laboratory or engineering control room.

For younger audiences, avoid realistic kidnapping, graphic violence, or glamorized criminal behavior. Use an age-appropriate crisis, mystery, rivalry, malfunction, or comic misunderstanding. Historical figures and celebrity likenesses are not required; prefer original characters whose personalities can be controlled safely and consistently.

Each bottle episode must contain:

1. One location that remains visually recognizable throughout.
2. A deadline or pressure that makes the concept immediately useful.
3. Three or fewer characters with conflicting goals or beliefs.
4. At least three visible props that become evidence, measuring instruments, controls, or visual metaphors.
5. A sequence in which applying knowledge changes who controls the situation.
6. Two decisions that are phrased as story actions or predictions, not detached quiz questions.
7. A reversal produced by the concept rather than coincidence.
8. A final callback using a prop, line, or misconception introduced near the beginning.

The characters must not merely sit and recite a worked solution. Every explanation should be motivated by an accusation, prediction, plan, contradiction, negotiation, experiment, or immediate need inside the story.

Maintain visual variety inside the single set with at least six of these compositions:

- three-character establishing shot;
- two-character over-the-shoulder dialogue;
- reaction close-up;
- point-of-view instrument/dashboard shot;
- mirror, monitor, window, or security-camera view;
- prop insert shot;
- split-screen measurement comparison;
- freeze-frame annotation;
- lighting or alarm-state change;
- environmental movement visible through a window;
- Manim visualization composited onto a display or HUD;
- final wide shot that visually resolves the conflict.

### 10.4 Humor rules

Humor must come primarily from concept-driven consequences and stable character traits, not random memes or topical slang.

Preferred humor mechanisms:

- contrast between a calm character and an overconfident character;
- a character confidently embodying a plausible misconception;
- the fictional world visibly disproving an incorrect prediction;
- dramatic irony;
- escalation based on the same conceptual misunderstanding;
- a setup that returns as a callback after the learner applies the correct idea.

Every proposed gag must pass all of these checks:

1. Does it express, test, simulate, or depend on the concept?
2. Can it produce an observable story consequence?
3. Could it accidentally reinforce an incorrect rule?
4. Is it age-appropriate and understandable without current internet-culture knowledge?
5. Does it preserve similar entertainment value across correct and incorrect branches?

Reject jokes that are merely decorative, distract from the causal relationship, require lengthy explanation, ridicule the learner, or make the incorrect path more rewarding than the correct path.

### 10.5 Reusable shot-template catalog

Implement a curated catalog instead of generating every scene from scratch. The initial catalog should include at least:

- character entrance;
- two-character dialogue;
- reaction close-up;
- push-in reveal;
- split-screen comparison;
- countdown or time-pressure overlay;
- freeze frame with annotation;
- flashback or rewind;
- confident prediction followed by visible failure;
- evidence board;
- route/tool selection;
- Manim diagram insertion;
- environment-wide consequence;
- final callback payoff.

AI composes and parameterizes these templates through `ShotSpec`. It must not emit unbounded animation code when an approved template can express the shot.

### 10.6 Four mandatory quality gates

#### Script gate

Score each item from 1 to 5:

- the opening establishes tension quickly;
- the concept genuinely controls the plot;
- character motivations and behavior are consistent;
- each choice changes both story consequence and teaching strategy;
- the episode contains a setup, escalation/reversal, and callback payoff;
- dialogue is concise and sounds natural when spoken.

#### Pedagogy gate

Score each item from 1 to 5:

- canonical answer and explanation are independently verified;
- every distractor corresponds to plausible reasoning;
- incorrect branches explain through consequence rather than a red error message;
- humor cannot reasonably create a false memory of the rule;
- the second checkpoint tests a changed condition;
- the final transfer task is unassisted and tests the same underlying relationship.

#### Visualization gate

Score each item from 1 to 5:

- the visualization reveals a relationship that would be harder to understand from dialogue alone;
- mathematical and scientific content is correct and independently verifiable;
- the learner's intended observation is visually salient;
- labels, color, scale, motion, and narration use consistent meanings;
- complexity is introduced progressively without irrelevant detail;
- the visualization is integrated into the plot while remaining readable at full focus;
- the branch-specific visualization matches the selected teaching strategy;
- an exact deterministic fallback exists for every required teaching visual.

#### Render gate

Score each item from 1 to 5:

- character identity, clothing, palette, and voice remain consistent;
- composition is readable and visually balanced;
- subtitles do not obscure faces, formulas, or key action;
- dialogue, effects, camera motion, and audio timing align;
- pacing contains regular visual change without becoming frantic;
- correct and incorrect branches have comparable production quality.

Every item must score at least 4/5 before publication. Regenerate only the failing beat, shot, asset, or audio segment rather than restarting the entire episode. Save gate scores and repair history as generation evidence.

Do not reward wrong answers with more entertaining content than correct answers. All paths should have comparable narrative quality.

## 11. Required demo episode

Ship a complete seeded episode called **Moonbase Last Shot**. The final product name should remain undecided; this is only a demo episode title.

Source question:

> A capsule is launched horizontally from the same height. If its horizontal speed doubles, how do its landing time and horizontal distance change?

Story:

- A lunar dust storm is approaching.
- The entire episode takes place inside a lunar rover cockpit. Exterior action is visible only through the windshield, dashboard cameras, instruments, and HUD displays.
- The learner controls the rover's launch system and must send a medicine capsule across a crater.
- The capsule's horizontal launch speed is doubled.
- The learner must predict what happens.

Bottle-episode requirements:

- Primary set: one lunar rover cockpit; do not cut to a separate exterior location.
- Characters: the learner, a careful mission specialist, and an overconfident helper robot.
- Ticking clock: the dust storm will block the launch corridor.
- Required props: launch-speed control, mission timer, cockpit window, trajectory display, loose tool, and gravity readout.
- Show exterior consequences through the cockpit window or instrument feeds.
- Begin Manim projectile-motion diagrams on the trajectory display, transition them into a full-stage visualization focus mode when precision is needed, and return to the same cockpit afterward.
- Knowledge application must gradually shift decision-making authority from the overconfident robot to the learner.

Required comic structure:

- Include an overconfident helper robot whose recurring flaw is treating `faster horizontally` as `faster in every direction`.
- The robot should confidently support the plausible wrong answer without mocking the learner.
- When the split experiment disproves that prediction, include a brief deadpan reaction such as requesting that its previous `expert statement` be deleted.
- At the second checkpoint, the robot begins to repeat the same style of claim, catches itself, and looks to the learner instead.
- In the resolution, the robot correctly separates horizontal and vertical motion, completing both a character arc and the callback payoff.

Choice point 1:

- `It lands earlier.`
- `It lands at the same time and travels twice as far.`
- `It lands later.`
- `I am not sure.`

Required remediation for `It lands earlier`:

- Show a split experiment in which one capsule is launched horizontally while another is dropped from the same height.
- Their vertical timers remain synchronized.
- Display synchronized horizontal and vertical components with consistent colors, progressively revealing the two independent motions.
- Ask the learner to identify which component controls landing time before returning to the cockpit.
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
8. At least two teaching visualizations appear in the player: one core visual and one branch-selected adaptive visual; at least one is rendered deterministically with Manim, SVG, or Canvas.
9. A render failure produces a fallback visual instead of breaking the episode.
10. The learning recap accurately reflects the actual path taken and uses cautious wording.
11. Core adaptation rules and branch selection have automated tests.
12. No API key or secret is exposed to the browser or committed to the repository.
13. The README explains architecture, setup, sample flow, limitations, and exactly how GPT-5.6 and Codex were used.
14. The project is polished enough to demonstrate end to end in under three minutes.
15. The application uses a fixed component/design system; generated content cannot alter the product-shell layout.
16. All required UI states pass visual QA at desktop and mobile target sizes.
17. Every episode contains a validated Creative Bible, dramatic beat sheet, running gag, and callback payoff.
18. Every shot is represented by `ShotSpec` and uses an approved template unless an explicit exception is recorded.
19. Script, pedagogy, visualization, and render quality-gate scores are stored, and every published item scores at least 4/5.
20. The Moonbase episode demonstrates a concept-linked joke, visible narrative consequence, and later callback rather than unrelated entertainment details.
21. The seeded episode remains in one primary set and still demonstrates at least six distinct camera compositions.
22. Its visible props are reused as evidence, teaching representations, and callback devices rather than decorative background assets.
23. Both diagnostic prompts are expressed as decisions within the crisis, not as detached quiz screens.
24. Every `TeachingVisualizationSpec` states what the learner should notice, why the visual is needed, how it is rendered, and which teaching strategy triggers it.
25. No explanatory dialogue segment runs longer than 15 seconds without a concept-relevant visual change.
26. Exact formulas, graphs, geometry, scale, and numerical relationships are never delegated solely to a generative image model.
27. The Moonbase remediation visually separates horizontal and vertical motion, synchronizes the timers, and checks what the learner noticed before resuming the drama.

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
