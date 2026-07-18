import { z } from "zod";

export const TeachingStrategySchema = z.enum([
  "advance",
  "verify",
  "remediate",
]);

export const ConfidenceSchema = z.enum([
  "guessing",
  "somewhat_sure",
  "very_sure",
]);

export const RepresentationSchema = z.enum([
  "story_consequence",
  "diagram",
  "equation",
  "analogy",
  "worked_example",
]);

export const StoryStateSchema = z.object({
  currentSceneId: z.string(),
  completedSceneIds: z.array(z.string()),
  flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
  inventory: z.array(z.string()).optional(),
  relationshipNotes: z.array(z.string()).optional(),
});

export const LearnerStateSchema = z.object({
  conceptScores: z.record(z.string(), z.number().min(0).max(1)),
  possibleMisconceptions: z.array(z.string()),
  confidenceHistory: z.array(
    z.object({
      choiceNodeId: z.string(),
      level: ConfidenceSchema,
    }),
  ),
  representationsUsed: z.array(RepresentationSchema),
  lastTeachingStrategy: TeachingStrategySchema.optional(),
});

const DialogueSchema = z.object({
  characterId: z.string(),
  text: z.string(),
  emotion: z.string().optional(),
});

export const SceneSpecSchema = z.object({
  id: z.string(),
  kind: z.enum(["story", "explanation", "branch", "transfer"]),
  title: z.string(),
  summary: z.string(),
  educationalPurpose: z.string(),
  conceptIds: z.array(z.string()),
  visualizationIds: z.array(z.string()),
  characterIds: z.array(z.string()),
  narration: z.string().optional(),
  dialogue: z.array(DialogueSchema),
  visualDirection: z.string(),
  visualMode: z
    .enum(["cockpit", "trajectory", "split_experiment", "gravity", "transfer"]),
  choiceNodeId: z.string().optional(),
  nextSceneIds: z.array(z.string()),
});

export const TeachingVisualizationSpecSchema = z.object({
  id: z.string(),
  conceptIds: z.array(z.string()),
  type: z.enum([
    "annotated_image",
    "diagram",
    "graph",
    "geometry_transformation",
    "process_animation",
    "side_by_side_comparison",
    "simulation",
    "timeline",
    "probability_model",
    "spatial_model",
  ]),
  learningPurpose: z.string(),
  learnerShouldNotice: z.array(z.string()),
  concreteRepresentation: z.string().optional(),
  abstractRepresentation: z.string().optional(),
  variablesOrLabels: z.array(z.string()),
  visualEncoding: z.object({
    emphasis: z.array(z.string()),
    colorMeaning: z.record(z.string(), z.string()),
    motionMeaning: z.record(z.string(), z.string()).optional(),
  }),
  renderer: z.enum(["manim", "svg", "canvas", "generated_image", "composited"]),
  placement: z.enum(["in_world_display", "prop_overlay", "split_screen", "focus_mode"]),
  trigger: z.enum(["core", "advance", "verify", "remediate"]),
  narration: z.string(),
  checkForUnderstanding: z.string().optional(),
  deterministicFallback: z.string(),
});

const ChoiceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  correctness: z.enum(["correct", "incorrect", "uncertain"]),
  learnerHypothesis: z.string(),
  storyConsequence: z.string(),
  allowedStrategies: z.array(TeachingStrategySchema).min(1),
  branchSceneIds: z.array(z.string()).min(1),
});

export const ChoiceNodeSpecSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  prompt: z.string(),
  conceptId: z.string(),
  options: z.array(ChoiceOptionSchema).min(3).max(4),
});

export const TransferTaskSpecSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  conceptIds: z.array(z.string()),
  options: z.array(z.object({ id: z.string(), label: z.string() })).min(3),
  correctOptionId: z.string(),
  explanation: z.string(),
});

const ShotSpecSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  template: z.enum([
    "three-character establishing shot",
    "two-character dialogue",
    "reaction close-up",
    "push-in reveal",
    "split-screen comparison",
    "countdown or time-pressure overlay",
    "freeze frame with annotation",
    "flashback or rewind",
    "confident prediction followed by visible failure",
    "evidence board",
    "route/tool selection",
    "Manim diagram insertion",
    "environment-wide consequence",
    "final callback payoff",
    "point-of-view instrument shot",
  ]),
  durationMs: z.number().int().positive(),
  narrativeFunction: z.string(),
  educationalFunction: z.string(),
  characterIds: z.array(z.string()),
  dialogue: z.string().optional(),
  visualAction: z.string(),
  cameraMove: z.string(),
  soundCue: z.string().optional(),
  jokeSetup: z.string().optional(),
  jokePayoff: z.string().optional(),
});

const GateSchema = z.object({
  name: z.enum(["script", "pedagogy", "visualization", "render"]),
  scores: z.record(z.string(), z.number().int().min(4).max(5)),
  repairs: z.array(z.string()),
});

export const EpisodeSpecSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceInput: z.string(),
  subject: z.string(),
  level: z.string(),
  learningObjective: z.string(),
  canonicalExplanation: z.string(),
  concepts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      relationship: z.string(),
    }),
  ),
  storyBible: z.object({
    genre: z.enum(["sci_fi", "detective"]),
    episodeFormat: z.literal("bottle_episode"),
    tone: z.enum(["warm", "absurd", "suspenseful", "deadpan"]),
    premise: z.string(),
    stakes: z.string(),
    visualStyle: z.string(),
    singleLocation: z.string(),
    tickingClock: z.string(),
    observableProps: z.array(z.string()).min(3),
    worldRules: z.array(z.string()),
    runningGag: z.string(),
    callbackPayoff: z.string(),
    visualMotifs: z.array(z.string()),
    characters: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          role: z.string(),
          desire: z.string(),
          flaw: z.string(),
          catchphrase: z.string().optional(),
          appearancePrompt: z.string(),
          voiceStyle: z.string(),
          forbiddenBehaviors: z.array(z.string()),
        }),
      )
      .max(3),
  }),
  scenes: z.array(SceneSpecSchema),
  visualizations: z.array(TeachingVisualizationSpecSchema).min(2),
  choiceNodes: z.array(ChoiceNodeSpecSchema).length(2),
  shots: z.array(ShotSpecSchema),
  transferTask: TransferTaskSpecSchema,
  qualityGates: z.array(GateSchema).length(4),
});

export const DirectorDecisionSchema = z.object({
  strategy: TeachingStrategySchema,
  nextSceneId: z.string(),
  learnerStatePatch: LearnerStateSchema.partial(),
  shortRationale: z.string(),
});

export const ChoiceSubmissionSchema = z.object({
  choiceNodeId: z.string(),
  optionId: z.string(),
  confidence: ConfidenceSchema,
  storyState: StoryStateSchema,
  learnerState: LearnerStateSchema,
});

export const TransferSubmissionSchema = z.object({
  optionId: z.string(),
  storyState: StoryStateSchema,
  learnerState: LearnerStateSchema,
});

export type EpisodeSpec = z.infer<typeof EpisodeSpecSchema>;
export type SceneSpec = z.infer<typeof SceneSpecSchema>;
export type StoryState = z.infer<typeof StoryStateSchema>;
export type LearnerState = z.infer<typeof LearnerStateSchema>;
export type DirectorDecision = z.infer<typeof DirectorDecisionSchema>;
export type TeachingStrategy = z.infer<typeof TeachingStrategySchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type ChoiceSubmission = z.infer<typeof ChoiceSubmissionSchema>;

export function validateEpisodeSemantics(episode: EpisodeSpec) {
  const sceneById = new Map(episode.scenes.map((scene) => [scene.id, scene]));
  const visualIds = new Set(episode.visualizations.map((visual) => visual.id));
  const shotSceneIds = new Set(episode.shots.map((shot) => shot.sceneId));

  if (!episode.visualizations.some((visual) => ["svg", "canvas", "manim"].includes(visual.renderer))) {
    throw new Error("An episode needs at least one deterministic teaching visualization.");
  }

  for (const scene of episode.scenes) {
    if (!shotSceneIds.has(scene.id)) throw new Error(`Scene ${scene.id} has no approved shot.`);
    for (const visualId of scene.visualizationIds) {
      if (!visualIds.has(visualId)) throw new Error(`Scene ${scene.id} references an unknown visual.`);
    }
  }

  for (const node of episode.choiceNodes) {
    const sourceScene = sceneById.get(node.sceneId);
    if (!sourceScene || sourceScene.choiceNodeId !== node.id) {
      throw new Error(`Choice ${node.id} is not attached to its declared scene.`);
    }
    const convergenceTargets = new Set<string>();
    for (const option of node.options) {
      for (const branchId of option.branchSceneIds) {
        const branch = sceneById.get(branchId);
        if (!branch || branch.kind !== "branch" || branch.nextSceneIds.length !== 1) {
          throw new Error(`Choice ${node.id} contains an invalid or non-convergent branch.`);
        }
        convergenceTargets.add(branch.nextSceneIds[0]);
      }
    }
    if (convergenceTargets.size !== 1) {
      throw new Error(`Branches for ${node.id} must reconverge to one scene.`);
    }
  }

  return episode;
}

export function createInitialStates(episode: EpisodeSpec) {
  const firstScene = episode.scenes[0]?.id ?? "start";
  const conceptScores = Object.fromEntries(
    episode.concepts.map((concept) => [concept.id, 0.35]),
  );

  return {
    storyState: StoryStateSchema.parse({
      currentSceneId: firstScene,
      completedSceneIds: [],
      flags: {},
      inventory: [],
      relationshipNotes: [],
    }),
    learnerState: LearnerStateSchema.parse({
      conceptScores,
      possibleMisconceptions: [],
      confidenceHistory: [],
      representationsUsed: ["story_consequence"],
    }),
  };
}
