import { NextResponse } from "next/server";
import { createInitialLessonStates } from "@/lib/lesson/schema";
import { getSeededLesson } from "@/lib/lesson/seeded-lessons";
import { readLesson } from "@/lib/storage/local-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lesson = getSeededLesson(id) ?? await readLesson(id);
  return lesson ? NextResponse.json({ lesson, ...createInitialLessonStates() }) : NextResponse.json({ error: { message: "Lesson not found." } }, { status: 404 });
}
