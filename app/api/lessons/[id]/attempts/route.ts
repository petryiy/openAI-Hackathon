import { NextResponse } from "next/server";
import { AttemptRequestSchema, gradeAttempt } from "@/lib/lesson/grading";
import { getSeededLesson } from "@/lib/lesson/seeded-lessons";
import { readLesson } from "@/lib/storage/local-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lesson = getSeededLesson(id) ?? await readLesson(id);
  if (!lesson) return NextResponse.json({ error: { message: "Lesson not found." } }, { status: 404 });
  if (lesson.schemaVersion === 3) return NextResponse.json({ error: { code: "UNSUPPORTED_LESSON", message: "Whiteboard lessons grade their checkpoints in the player." } }, { status: 400 });
  const parsed = AttemptRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_EXPRESSION", message: parsed.error.issues[0]?.message } }, { status: 400 });
  try { return NextResponse.json(gradeAttempt(lesson, parsed.data)); }
  catch (error) { return NextResponse.json({ error: { code: "INVALID_EXPRESSION", message: (error as Error).message } }, { status: 400 }); }
}
