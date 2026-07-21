import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readLesson = vi.fn();
const saveLesson = vi.fn(async (lesson) => lesson);
const generateManimSceneCode = vi.fn();
const renderCustomScene = vi.fn();
const isRendererReachable = vi.fn();

vi.mock("@/lib/storage/local-store", () => ({ readLesson, saveLesson }));
vi.mock("@/lib/ai/manim-code-provider", () => ({
  generateManimSceneCode,
  looksLikeValidScene: (code: string) => code.includes("class GeneratedScene(Scene)"),
}));
vi.mock("@/lib/media/manim-custom-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/media/manim-custom-client")>("@/lib/media/manim-custom-client");
  return { ...actual, renderCustomScene, isRendererReachable };
});

const VALID_CODE = "from manim import *\nclass GeneratedScene(Scene):\n    def construct(self):\n        self.wait(1)\n";

function lessonWith(segmentIds: string[]) {
  return {
    schemaVersion: 3 as const,
    segments: segmentIds.map((id) => ({ id, narration: "hello there friend how are you doing today", durationMs: 12_000 })),
    assets: { segments: segmentIds.map((id) => ({ segmentId: id, durationMs: 12_000, renderMode: "whiteboard", audioUrl: `/audio/${id}.mp3`, alignmentUrl: `/align/${id}.json`, videoUrl: null, posterUrl: null, captionsUrl: null, checksum: id })) },
    upgrade: { trackB: segmentIds.map((id) => ({ segmentId: id, status: "pending" as "pending" | "complete" | "failed" })) },
  };
}

describe("track B upgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MANIM_RENDERER_URL = "http://127.0.0.1:8787";
    process.env.TRACK_B_ENABLED = "true";
  });
  afterEach(() => { delete process.env.MANIM_RENDERER_URL; delete process.env.TRACK_B_ENABLED; });

  it("upgrades a segment on the second codegen attempt and preserves audio", async () => {
    const { upgradeLessonWithManim } = await import("@/lib/lesson/track-b");
    let stored = lessonWith(["s1"]);
    readLesson.mockImplementation(async () => stored);
    saveLesson.mockImplementation(async (lesson) => { stored = lesson; return lesson; });
    isRendererReachable.mockResolvedValue(true);
    generateManimSceneCode.mockResolvedValueOnce("garbage").mockResolvedValueOnce(VALID_CODE);
    renderCustomScene.mockResolvedValueOnce({ videoUrl: "/v/s1.mp4", posterUrl: "/p/s1.png", captionsUrl: "/c/s1.vtt", durationMs: 12_000, checksum: "abc" });

    await upgradeLessonWithManim("lesson1");

    const asset = stored.assets.segments[0];
    expect(asset.renderMode).toBe("manim");
    expect(asset.videoUrl).toBe("/v/s1.mp4");
    expect(asset.audioUrl).toBe("/audio/s1.mp3"); // audio preserved
    expect(asset.alignmentUrl).toBe("/align/s1.json"); // alignment preserved
    expect(stored.upgrade.trackB[0].status).toBe("complete");
  });

  it("marks a segment failed after exhausting attempts, leaving it on the whiteboard", async () => {
    const { upgradeLessonWithManim } = await import("@/lib/lesson/track-b");
    const { CustomRenderError } = await import("@/lib/media/manim-custom-client");
    let stored = lessonWith(["s1"]);
    readLesson.mockImplementation(async () => stored);
    saveLesson.mockImplementation(async (lesson) => { stored = lesson; return lesson; });
    isRendererReachable.mockResolvedValue(true);
    generateManimSceneCode.mockResolvedValue(VALID_CODE);
    renderCustomScene.mockRejectedValue(new CustomRenderError("layout overlap"));

    await upgradeLessonWithManim("lesson1");

    expect(stored.assets.segments[0].renderMode).toBe("whiteboard");
    expect(stored.upgrade.trackB[0].status).toBe("failed");
  });

  it("does no codegen at all when the renderer is unreachable", async () => {
    const { upgradeLessonWithManim } = await import("@/lib/lesson/track-b");
    let stored = lessonWith(["s1", "s2"]);
    readLesson.mockImplementation(async () => stored);
    saveLesson.mockImplementation(async (lesson) => { stored = lesson; return lesson; });
    isRendererReachable.mockResolvedValue(false);

    await upgradeLessonWithManim("lesson1");

    expect(generateManimSceneCode).not.toHaveBeenCalled();
    expect(stored.upgrade.trackB.every((entry) => entry.status === "failed")).toBe(true);
  });
});
