import { Suspense } from "react";
import { GenerationClient } from "@/components/generation/generation-client";
import { SiteHeader } from "@/components/site-header";

export default function GenerationPage() {
  return (
    <main className="generation-shell">
      <SiteHeader compact />
      <Suspense fallback={<div className="generation-loading">Preparing the director…</div>}>
        <GenerationClient />
      </Suspense>
    </main>
  );
}
