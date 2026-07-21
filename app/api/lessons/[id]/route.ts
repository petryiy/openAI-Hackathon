import { NextResponse } from "next/server";
import { createInitialLessonStates } from "@/lib/lesson/schema";
import { WHITEBOARD_FIXTURE_LESSON_ID, whiteboardFixtureLesson } from "@/lib/lesson/fixture-whiteboard";
import { SEEDED_DERIVATIVE_LESSON_ID, seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";
import { readLesson } from "@/lib/storage/local-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lesson = id === SEEDED_DERIVATIVE_LESSON_ID ? seededDerivativeLesson
    : id === WHITEBOARD_FIXTURE_LESSON_ID ? whiteboardFixtureLesson
      : await readLesson(id);
  return lesson ? NextResponse.json({ lesson, ...createInitialLessonStates() }) : NextResponse.json({ error: { message: "Lesson not found." } }, { status: 404 });
}
