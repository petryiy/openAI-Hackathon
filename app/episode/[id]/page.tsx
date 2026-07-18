import { notFound } from "next/navigation";
import { EpisodePlayer } from "@/components/player/episode-player";
import { MOONBASE_EPISODE_ID, moonbaseEpisode } from "@/lib/episode/moonbase";
import { createInitialStates } from "@/lib/episode/schema";
import { readEpisode } from "@/lib/storage/local-store";

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = id === MOONBASE_EPISODE_ID ? moonbaseEpisode : await readEpisode(id);
  if (!episode) notFound();
  return <EpisodePlayer episode={episode} initialStates={createInitialStates(episode)} />;
}
