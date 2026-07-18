import { NextResponse } from "next/server";
import { createInitialStates } from "@/lib/episode/schema";
import { MOONBASE_EPISODE_ID, moonbaseEpisode } from "@/lib/episode/moonbase";
import { readEpisode } from "@/lib/storage/local-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const episode = id === MOONBASE_EPISODE_ID ? moonbaseEpisode : await readEpisode(id);
  if (!episode) {
    return NextResponse.json({ error: { message: "Episode not found." } }, { status: 404 });
  }

  return NextResponse.json({ episode, ...createInitialStates(episode) });
}
