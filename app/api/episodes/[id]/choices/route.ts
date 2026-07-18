import { NextResponse } from "next/server";
import { makeDirectorDecision } from "@/lib/adaptation/engine";
import { MOONBASE_EPISODE_ID, moonbaseEpisode } from "@/lib/episode/moonbase";
import { ChoiceSubmissionSchema } from "@/lib/episode/schema";
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
  const parsed = ChoiceSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_CHOICE", message: "The choice payload is incomplete." } },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(makeDirectorDecision(episode, parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INVALID_BRANCH", message: (error as Error).message } },
      { status: 422 },
    );
  }
}
