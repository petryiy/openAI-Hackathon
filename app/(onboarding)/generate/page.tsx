import { Suspense } from "react";
import { GenerationClient } from "@/components/generation/generation-client";
import { LessonGenerationClient } from "@/components/generation/lesson-generation-client";

type GenerationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GenerationPage({ searchParams }: GenerationPageProps) {
  const params = await searchParams;
  const lessonJobId = Array.isArray(params.lessonJobId) ? params.lessonJobId[0] : params.lessonJobId;
  return (
    <main className="director-pipeline-page">
      <Suspense fallback={<div className="director-pipeline__fallback">INITIALIZING DIRECTOR</div>}>
        {lessonJobId ? <LessonGenerationClient jobId={lessonJobId} /> : <GenerationClient />}
      </Suspense>
    </main>
  );
}
