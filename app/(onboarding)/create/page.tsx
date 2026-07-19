import Link from "next/link";
import { CreateEpisodeForm } from "@/components/create-episode-form";

export default function CreatePage() {
  return (
    <main className="onboarding-create" aria-labelledby="create-heading">
      <header className="onboarding-create__header">
        <Link href="/" className="onboarding-brand" aria-label="Plot as Proof home">
          <span className="onboarding-brand__mark" aria-hidden="true"><i /></span>
          <span>Plot as Proof</span>
        </Link>
        <span className="onboarding-create__step"><i aria-hidden="true" />EPISODE 01 · SOURCE</span>
      </header>
      <CreateEpisodeForm />
    </main>
  );
}
