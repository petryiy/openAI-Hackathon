import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const FILE_TYPES: Record<string, string> = {
  "lesson.mp4": "video/mp4",
  "poster.png": "image/png",
  "captions.vtt": "text/vtt; charset=utf-8",
  "narration.mp3": "audio/mpeg",
};

export async function GET(_request: Request, { params }: { params: Promise<{ key: string; file: string }> }) {
  const { key, file } = await params;
  if (!/^[a-f0-9]{64}$/.test(key) || !FILE_TYPES[file]) return new NextResponse("Not found", { status: 404 });
  try {
    const content = await readFile(path.join(process.cwd(), ".data", "lesson-assets", key, file));
    return new NextResponse(content, { headers: { "content-type": FILE_TYPES[file], "cache-control": "public, max-age=31536000, immutable" } });
  } catch { return new NextResponse("Not found", { status: 404 }); }
}
