import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { createInitialLessonStates } from "@/lib/lesson/schema";
import { SEEDED_DERIVATIVE_LESSON_ID, seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";
import { readLesson } from "@/lib/storage/local-store";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lesson = id === SEEDED_DERIVATIVE_LESSON_ID ? seededDerivativeLesson : await readLesson(id);
  if (!lesson) notFound();
  const states = createInitialLessonStates();
  return <LessonPlayer lesson={lesson} initialStoryState={states.storyState} initialLearnerState={states.learnerState} />;
}
