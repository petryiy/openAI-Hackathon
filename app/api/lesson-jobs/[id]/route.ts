import { NextResponse } from "next/server";
import { readLessonJob } from "@/lib/storage/local-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const job = await readLessonJob((await params).id);
  return job ? NextResponse.json(job) : NextResponse.json({ error: { message: "Lesson job not found." } }, { status: 404 });
}
