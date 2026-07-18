import { describe, expect, it } from "vitest";
import { evaluateTransfer, makeDirectorDecision, selectStrategy } from "@/lib/adaptation/engine";
import { moonbaseEpisode } from "@/lib/episode/moonbase";
import { createInitialStates } from "@/lib/episode/schema";

function submission(optionId: string, confidence: "guessing" | "somewhat_sure" | "very_sure") {
  const states = createInitialStates(moonbaseEpisode);
  return {
    choiceNodeId: "choice-speed",
    optionId,
    confidence,
    ...states,
  };
}

describe("adaptation policy", () => {
  it("advances after a correct, high-confidence answer", () => {
    const result = makeDirectorDecision(
      moonbaseEpisode,
      submission("same-double", "very_sure"),
    );
    expect(result.decision.strategy).toBe("advance");
    expect(result.decision.nextSceneId).toBe("speed-advance");
    expect(result.learnerState.conceptScores["independent-components"]).toBe(0.57);
  });

  it("verifies a correct answer when confidence is limited", () => {
    const result = makeDirectorDecision(
      moonbaseEpisode,
      submission("same-double", "guessing"),
    );
    expect(result.decision.strategy).toBe("verify");
    expect(result.decision.nextSceneId).toBe("speed-verify");
    expect(result.learnerState.representationsUsed.at(-1)).toBe("worked_example");
  });

  it("uses a visible remediation branch for a confident misconception", () => {
    const result = makeDirectorDecision(
      moonbaseEpisode,
      submission("earlier", "very_sure"),
    );
    expect(result.decision.strategy).toBe("remediate");
    expect(result.decision.nextSceneId).toBe("speed-remediate");
    expect(result.decision.shortRationale).toContain("confident misconception");
    expect(result.learnerState.possibleMisconceptions).toContain(
      "Horizontal speed controls vertical landing time.",
    );
  });

  it("maps correctness and confidence deterministically", () => {
    expect(selectStrategy("correct", "somewhat_sure")).toBe("verify");
    expect(selectStrategy("correct", "very_sure")).toBe("advance");
    expect(selectStrategy("incorrect", "guessing")).toBe("remediate");
    expect(selectStrategy("uncertain", "very_sure")).toBe("remediate");
  });

  it("describes second-checkpoint advancement as transfer, not another changed condition", () => {
    const states = createInitialStates(moonbaseEpisode);
    const result = makeDirectorDecision(moonbaseEpisode, {
      choiceNodeId: "choice-gravity",
      optionId: "farther",
      confidence: "very_sure",
      ...states,
    });
    expect(result.decision.shortRationale).toContain("unassisted transfer");
  });

  it("recognizes the final checkpoint by episode order rather than a seeded ID", () => {
    const episode = structuredClone(moonbaseEpisode);
    const finalNode = episode.choiceNodes[1];
    finalNode.id = "generated-checkpoint-two";
    const sourceScene = episode.scenes.find((scene) => scene.id === finalNode.sceneId);
    if (sourceScene) sourceScene.choiceNodeId = finalNode.id;
    const states = createInitialStates(episode);
    const result = makeDirectorDecision(episode, {
      choiceNodeId: finalNode.id,
      optionId: "farther",
      confidence: "very_sure",
      ...states,
    });
    expect(result.decision.shortRationale).toContain("unassisted transfer");
  });
});

describe("transfer evaluation", () => {
  it("weights the unassisted transfer result separately", () => {
    const states = createInitialStates(moonbaseEpisode);
    const result = evaluateTransfer(
      moonbaseEpisode,
      "same-time-double",
      states.learnerState,
    );
    expect(result.correct).toBe(true);
    expect(result.learnerState.conceptScores["independent-components"]).toBe(0.63);
    expect(result.recap.note).toContain("not a mastery score");
  });
});
