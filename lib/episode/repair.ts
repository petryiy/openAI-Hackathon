import {
  EpisodeSpecSchema,
  type EpisodeSpec,
  type TeachingStrategy,
  validateEpisodeSemantics,
} from "@/lib/episode/schema";

export type EpisodeRepair = {
  code: "NORMALIZED_BRANCH_POLICY" | "CORRECTED_TRANSFER_OPTION" | "CLEANED_TRANSFER_EXPLANATION";
  message: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function sameValues(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function strategyForScene(
  episode: EpisodeSpec,
  sceneId: string,
  correctness: "correct" | "incorrect" | "uncertain",
): TeachingStrategy {
  const scene = episode.scenes.find((item) => item.id === sceneId);
  const normalizedId = sceneId.toLowerCase();
  for (const strategy of ["remediate", "verify", "advance"] as const) {
    if (normalizedId.includes(strategy)) return strategy;
  }

  const trigger = scene?.visualizationIds
    .map((visualizationId) =>
      episode.visualizations.find((visualization) => visualization.id === visualizationId),
    )
    .find((visualization) => visualization && visualization.trigger !== "core")
    ?.trigger;
  if (trigger && trigger !== "core") return trigger;
  return correctness === "correct" ? "advance" : "remediate";
}

function declaredCorrectPercentage(explanation: string) {
  const pattern =
    /(?:正确(?:答案)?(?:应为|是)|the correct answer is)\s*(?:大约|约|approximately|about)?\s*(\d+(?:\.\d+)?)\s*%/gi;
  let declared: number | undefined;
  for (const match of explanation.matchAll(pattern)) {
    declared = Number(match[1]);
  }
  return declared;
}

function percentageInLabel(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : undefined;
}

function cleanTransferExplanation(explanation: string) {
  return explanation.replace(
    /[？?]\s*请注意：[\s\S]*?修正：[\s\S]*?PPV\s*=\s*[^。]+。/i,
    "。",
  );
}

/**
 * Runtime strategy selection is deterministic, so model-authored branch policy
 * is normalized to the same contract before publication. The model still owns
 * the story consequence and teaching content; this only repairs references.
 */
export function repairGeneratedEpisode(episode: EpisodeSpec) {
  const sceneIds = new Set(episode.scenes.map((scene) => scene.id));
  const repairs: EpisodeRepair[] = [];

  const choiceNodes = episode.choiceNodes.map((node) => {
    const candidates = new Map<TeachingStrategy, string>();
    const allExistingBranchIds: string[] = [];

    for (const option of node.options) {
      for (const branchSceneId of option.branchSceneIds) {
        if (!sceneIds.has(branchSceneId)) continue;
        allExistingBranchIds.push(branchSceneId);
        const strategy = strategyForScene(
          episode,
          branchSceneId,
          option.correctness,
        );
        if (!candidates.has(strategy)) candidates.set(strategy, branchSceneId);
      }
    }

    let changedOptions = 0;
    const options = node.options.map((option) => {
      const allowedStrategies: TeachingStrategy[] =
        option.correctness === "correct"
          ? ["advance", "verify"]
          : ["remediate"];
      const ownExisting = option.branchSceneIds.filter((id) => sceneIds.has(id));
      const branchSceneIds = unique(
        allowedStrategies
          .map(
            (strategy) =>
              candidates.get(strategy) ??
              ownExisting[0] ??
              allExistingBranchIds[0],
          )
          .filter((id): id is string => Boolean(id)),
      );

      if (branchSceneIds.length === 0) return option;
      if (
        !sameValues(option.allowedStrategies, allowedStrategies) ||
        !sameValues(option.branchSceneIds, branchSceneIds)
      ) {
        changedOptions += 1;
      }

      return { ...option, allowedStrategies, branchSceneIds };
    });

    if (changedOptions > 0) {
      repairs.push({
        code: "NORMALIZED_BRANCH_POLICY",
        message: `Normalized ${changedOptions} option branches for ${node.id} to match the confidence-aware runtime policy.`,
      });
    }

    return { ...node, options };
  });

  let transferTask = episode.transferTask;
  const declaredPercentage = declaredCorrectPercentage(
    episode.transferTask.explanation,
  );
  if (declaredPercentage !== undefined) {
    const declaredOption = episode.transferTask.options.find((option) => {
      const optionPercentage = percentageInLabel(option.label);
      return (
        optionPercentage !== undefined &&
        Math.abs(optionPercentage - declaredPercentage) <= 0.6
      );
    });
    if (
      declaredOption &&
      declaredOption.id !== episode.transferTask.correctOptionId
    ) {
      repairs.push({
        code: "CORRECTED_TRANSFER_OPTION",
        message: `Corrected the transfer answer to ${declaredOption.id} so it matches the explanation's declared ${declaredPercentage}% result.`,
      });
      transferTask = {
        ...episode.transferTask,
        correctOptionId: declaredOption.id,
      };
    }
  }

  const cleanedExplanation = cleanTransferExplanation(transferTask.explanation);
  if (cleanedExplanation !== transferTask.explanation) {
    repairs.push({
      code: "CLEANED_TRANSFER_EXPLANATION",
      message: "Removed a resolved self-correction from the transfer explanation before publication.",
    });
    transferTask = { ...transferTask, explanation: cleanedExplanation };
  }

  const repaired = EpisodeSpecSchema.parse({
    ...episode,
    choiceNodes,
    transferTask,
    qualityGates: episode.qualityGates.map((gate) =>
      gate.name === "pedagogy" && repairs.length > 0
        ? {
            ...gate,
            repairs: [...gate.repairs, ...repairs.map((repair) => repair.message)],
          }
        : gate,
    ),
  });

  return {
    episode: validateEpisodeSemantics(repaired),
    repairs,
  };
}
