import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeTransfer } from "@/lib/lesson/grading";
import { LessonLearnerStateSchema } from "@/lib/lesson/schema";
import { SEEDED_DERIVATIVE_LESSON_ID, seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";
import { readLesson } from "@/lib/storage/local-store";

const RequestSchema = z.object({ expression: z.string().trim().min(1).max(120), learnerState: LessonLearnerStateSchema }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lesson = id === SEEDED_DERIVATIVE_LESSON_ID ? seededDerivativeLesson : await readLesson(id);
  if (!lesson) return NextResponse.json({ error: { message: "Lesson not found." } }, { status: 404 });
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_EXPRESSION", message: "Enter one polynomial result." } }, { status: 400 });
  try {
    const result = gradeTransfer(lesson, parsed.data.expression);
    return NextResponse.json({ ...result, learnerState: { ...parsed.data.learnerState, transferCorrect: result.correct } });
  } catch (error) { return NextResponse.json({ error: { code: "INVALID_EXPRESSION", message: (error as Error).message } }, { status: 400 }); }
}
