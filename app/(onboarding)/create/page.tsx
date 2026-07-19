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
        <span className="onboarding-create__step">01 / Episode source</span>
      </header>

      <section className="onboarding-create__content">
        <div className="onboarding-create__intro">
          <p className="landing-eyebrow"><span>01</span> Build the world</p>
          <h1 id="create-heading">What should the story prove?</h1>
          <p>
            Paste one difficult question. The director will turn its underlying relationship into
            the rules of a playable world.
          </p>
        </div>
        <CreateEpisodeForm />
      </section>
    </main>
  );
}
