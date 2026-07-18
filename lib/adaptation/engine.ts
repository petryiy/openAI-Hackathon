import {
  type ChoiceSubmission,
  type Confidence,
  type DirectorDecision,
  type EpisodeSpec,
  type LearnerState,
  type StoryState,
  type TeachingStrategy,
} from "@/lib/episode/schema";

function clamp(value: number) {
  return Math.min(1, Math.max(0, Number(value.toFixed(2))));
}

export function selectStrategy(
  correctness: "correct" | "incorrect" | "uncertain",
  confidence: Confidence,
): TeachingStrategy {
  if (correctness === "correct") {
    return confidence === "very_sure" ? "advance" : "verify";
  }
  return "remediate";
}

function scoreDelta(
  correctness: "correct" | "incorrect" | "uncertain",
  confidence: Confidence,
) {
  if (correctness === "correct") {
    return confidence === "very_sure" ? 0.22 : 0.12;
  }
  if (correctness === "uncertain") return -0.02;
  return confidence === "very_sure" ? -0.14 : -0.08;
}

function chooseRepresentation(
  strategy: TeachingStrategy,
  used: LearnerState["representationsUsed"],
): LearnerState["representationsUsed"][number] {
  const candidates = {
    advance: ["equation", "analogy"],
    verify: ["worked_example", "diagram"],
    remediate: ["diagram", "story_consequence", "worked_example"],
  } as const;
  const previous = used.at(-1);
  return candidates[strategy].find((item) => item !== previous) ?? candidates[strategy][0];
}

function findBranchScene(option: EpisodeSpec["choiceNodes"][number]["options"][number], strategy: TeachingStrategy) {
  return (
    option.branchSceneIds.find((sceneId) => sceneId.includes(strategy)) ??
    option.branchSceneIds[0]
  );
}

export function makeDirectorDecision(
  episode: EpisodeSpec,
  submission: ChoiceSubmission,
): { decision: DirectorDecision; storyState: StoryState; learnerState: LearnerState } {
  const node = episode.choiceNodes.find((item) => item.id === submission.choiceNodeId);
  if (!node) throw new Error("Unknown choice node.");
  const option = node.options.find((item) => item.id === submission.optionId);
  if (!option) throw new Error("Unknown choice option.");

  const strategy = selectStrategy(option.correctness, submission.confidence);
  if (!option.allowedStrategies.includes(strategy)) {
    throw new Error("The selected teaching strategy is not available for this branch.");
  }

  const nextSceneId = findBranchScene(option, strategy);
  const previousScore = submission.learnerState.conceptScores[node.conceptId] ?? 0.35;
  const representation = chooseRepresentation(
    strategy,
    submission.learnerState.representationsUsed,
  );
  const misconceptions = new Set(submission.learnerState.possibleMisconceptions);
  if (option.correctness === "incorrect") misconceptions.add(option.learnerHypothesis);

  const learnerState: LearnerState = {
    ...submission.learnerState,
    conceptScores: {
      ...submission.learnerState.conceptScores,
      [node.conceptId]: clamp(
        previousScore + scoreDelta(option.correctness, submission.confidence),
      ),
    },
    possibleMisconceptions: [...misconceptions],
    confidenceHistory: [
      ...submission.learnerState.confidenceHistory,
      { choiceNodeId: node.id, level: submission.confidence },
    ],
    representationsUsed: [
      ...submission.learnerState.representationsUsed,
      representation,
    ],
    lastTeachingStrategy: strategy,
  };

  const storyState: StoryState = {
    ...submission.storyState,
    currentSceneId: nextSceneId,
    completedSceneIds: Array.from(
      new Set([...submission.storyState.completedSceneIds, node.sceneId]),
    ),
    flags: {
      ...submission.storyState.flags,
      [`${node.id}:option`]: option.id,
      [`${node.id}:confidence`]: submission.confidence,
      [`${node.id}:strategy`]: strategy,
    },
    relationshipNotes: [
      ...(submission.storyState.relationshipNotes ?? []),
      option.storyConsequence,
    ],
  };

  const rationale = {
    advance:
      node.id === "choice-gravity"
        ? "The learner applied the relationship to a changed condition with high confidence, so the story advances to an unassisted transfer."
        : "The learner selected the intended relationship with high confidence, so the story advances to a changed condition.",
    verify:
      "The learner selected the intended relationship with limited confidence, so a contrasting representation verifies it.",
    remediate:
      option.correctness === "incorrect" && submission.confidence === "very_sure"
        ? "The response suggests a confident misconception, so a visible counterexample tests that rule before the story continues."
        : "The response suggests uncertainty or a misconception, so a concrete visual scaffold reduces complexity before continuing.",
  }[strategy];

  return {
    decision: {
      strategy,
      nextSceneId,
      learnerStatePatch: learnerState,
      shortRationale: rationale,
    },
    storyState,
    learnerState,
  };
}

export function evaluateTransfer(
  episode: EpisodeSpec,
  optionId: string,
  learnerState: LearnerState,
) {
  const correct = optionId === episode.transferTask.correctOptionId;
  const conceptId = episode.transferTask.conceptIds[0];
  const previous = learnerState.conceptScores[conceptId] ?? 0.35;
  const updatedLearnerState: LearnerState = {
    ...learnerState,
    conceptScores: {
      ...learnerState.conceptScores,
      [conceptId]: clamp(previous + (correct ? 0.28 : -0.16)),
    },
  };
  const strongConcepts = episode.concepts
    .filter((concept) => (updatedLearnerState.conceptScores[concept.id] ?? 0) >= 0.65)
    .map((concept) => concept.name);
  const practiceConcepts = episode.concepts
    .filter((concept) => (updatedLearnerState.conceptScores[concept.id] ?? 0) < 0.65)
    .map((concept) => concept.name);

  return {
    correct,
    explanation: episode.transferTask.explanation,
    learnerState: updatedLearnerState,
    recap: {
      headline: correct
        ? "The evidence suggests the relationship transferred to a new context."
        : "The evidence suggests one more visual comparison would be useful.",
      strongConcepts,
      practiceConcepts,
      note: "This recap is based on two story decisions and one transfer question. It is a learning hypothesis, not a mastery score.",
    },
  };
}
