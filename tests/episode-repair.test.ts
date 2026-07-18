import { describe, expect, it } from "vitest";
import { moonbaseEpisode } from "@/lib/episode/moonbase";
import { repairGeneratedEpisode } from "@/lib/episode/repair";
import type { EpisodeSpec } from "@/lib/episode/schema";

describe("generated episode repair", () => {
  it("normalizes model branch policy and accepts bounded multi-scene convergence", () => {
    const draft = structuredClone(moonbaseEpisode) as EpisodeSpec;
    const node = draft.choiceNodes.find((choice) => choice.id === "choice-speed");
    if (!node) throw new Error("Moonbase choice fixture is missing.");

    const correct = node.options.find((option) => option.correctness === "correct");
    const uncertain = node.options.find(
      (option) => option.correctness === "uncertain",
    );
    if (!correct || !uncertain) throw new Error("Choice fixture is incomplete.");
    correct.allowedStrategies = ["advance"];
    correct.branchSceneIds = ["speed-advance"];
    uncertain.allowedStrategies = ["verify"];
    uncertain.branchSceneIds = ["speed-verify"];

    const remediation = draft.scenes.find(
      (scene) => scene.id === "speed-remediate",
    );
    if (!remediation) throw new Error("Remediation fixture is missing.");
    remediation.nextSceneIds = ["speed-verify"];
    draft.transferTask.options = [
      { id: "answer-16", label: "约16%" },
      { id: "answer-33", label: "约33%" },
      { id: "answer-66", label: "约66%" },
    ];
    draft.transferTask.correctOptionId = "answer-16";
    draft.transferTask.explanation =
      "取1000封，PPV≈9.8/29.6≈33.1%？请注意：先前草稿引用了旧条件。修正：PPV=9.8/(9.8+19.8)=33.1%。因此正确应为约33%。";

    const repaired = repairGeneratedEpisode(draft);
    const repairedNode = repaired.episode.choiceNodes.find(
      (choice) => choice.id === "choice-speed",
    );
    const repairedCorrect = repairedNode?.options.find(
      (option) => option.correctness === "correct",
    );
    const repairedUncertain = repairedNode?.options.find(
      (option) => option.correctness === "uncertain",
    );

    expect(repairedCorrect?.allowedStrategies).toEqual(["advance", "verify"]);
    expect(repairedCorrect?.branchSceneIds).toEqual([
      "speed-advance",
      "speed-verify",
    ]);
    expect(repairedUncertain?.allowedStrategies).toEqual(["remediate"]);
    expect(repairedUncertain?.branchSceneIds).toEqual(["speed-remediate"]);
    expect(repaired.episode.transferTask.correctOptionId).toBe("answer-33");
    const speedRepair = repaired.repairs.find((repair) =>
      repair.message.includes("choice-speed"),
    );
    expect(speedRepair).toBeDefined();
    expect(
      repaired.repairs.some(
        (repair) => repair.code === "CORRECTED_TRANSFER_OPTION",
      ),
    ).toBe(true);
    expect(
      repaired.repairs.some(
        (repair) => repair.code === "CLEANED_TRANSFER_EXPLANATION",
      ),
    ).toBe(true);
    expect(repaired.episode.transferTask.explanation).toBe(
      "取1000封，PPV≈9.8/29.6≈33.1%。因此正确应为约33%。",
    );
    expect(
      repaired.episode.qualityGates.find((gate) => gate.name === "pedagogy")
        ?.repairs,
    ).toContain(speedRepair?.message);
  });
});
