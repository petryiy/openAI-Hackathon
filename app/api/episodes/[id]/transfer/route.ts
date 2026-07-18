import { NextResponse } from "next/server";
import { evaluateTransfer } from "@/lib/adaptation/engine";
import { MOONBASE_EPISODE_ID, moonbaseEpisode } from "@/lib/episode/moonbase";
import { TransferSubmissionSchema } from "@/lib/episode/schema";
import { readEpisode } from "@/lib/storage/local-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const episode = id === MOONBASE_EPISODE_ID ? moonbaseEpisode : await readEpisode(id);
  if (!episode) {
    return NextResponse.json({ error: { message: "Episode not found." } }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const parsed = TransferSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_TRANSFER", message: "Choose one answer to continue." } },
      { status: 400 },
    );
  }

  return NextResponse.json(
    evaluateTransfer(episode, parsed.data.optionId, parsed.data.learnerState),
  );
}
