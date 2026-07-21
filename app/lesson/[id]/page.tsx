import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { createInitialLessonStates } from "@/lib/lesson/schema";
import { getSeededLesson } from "@/lib/lesson/seeded-lessons";
import { readLesson } from "@/lib/storage/local-store";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lesson = getSeededLesson(id) ?? await readLesson(id);
  if (!lesson) notFound();
  const states = createInitialLessonStates();
  return <LessonPlayer lesson={lesson} initialStoryState={states.storyState} initialLearnerState={states.learnerState} />;
}
