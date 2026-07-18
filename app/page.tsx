import Link from "next/link";
import { CreateEpisodeForm } from "@/components/create-episode-form";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main className="home-shell">
      <SiteHeader />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span>01</span> Story is the experiment</p>
          <h1>
            Don’t just explain it.
            <em>Make it happen.</em>
          </h1>
          <p className="hero-description">
            Turn an abstract question into a playable mini-drama. Every decision changes the plot,
            reveals what the learner noticed, and selects the next visual explanation.
          </p>
          <div className="hero-proof">
            <span className="proof-line" aria-hidden="true" />
            <p><strong>Plot as Proof</strong> means the concept cannot be removed without breaking the scene.</p>
          </div>
        </div>
        <CreateEpisodeForm />
      </section>

      <section className="principles" aria-label="How it works">
        <article>
          <span>01</span>
          <div><strong>Story creates stakes</strong><p>A single room, a ticking clock, and a concept that controls what happens next.</p></div>
        </article>
        <article>
          <span>02</span>
          <div><strong>Visuals reveal the rule</strong><p>Exact SVG and Manim-style diagrams show relationships dialogue cannot carry alone.</p></div>
        </article>
        <article>
          <span>03</span>
          <div><strong>Choices change teaching</strong><p>Answer plus confidence selects advance, verify, or remediate—not just right or wrong.</p></div>
        </article>
      </section>

      <footer className="home-footer">
        <span>OpenAI Build Week · Education</span>
        <Link href="/episode/moonbase-last-shot">Skip to the playable demo →</Link>
      </footer>
    </main>
  );
}
