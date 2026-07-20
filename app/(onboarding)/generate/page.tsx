import { Suspense } from "react";
import { GenerationClient } from "@/components/generation/generation-client";

export default function GenerationPage() {
  return (
    <main className="director-pipeline-page">
      <Suspense fallback={<div className="director-pipeline__fallback">INITIALIZING DIRECTOR</div>}>
        <GenerationClient />
      </Suspense>
    </main>
  );
}
