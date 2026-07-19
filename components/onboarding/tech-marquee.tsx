import Image from "next/image";

const logos = [
  { name: "OpenAI", src: "/brands/openai-wordmark.webp", width: 118, height: 37, className: "tech-logo tech-logo--openai" },
  { name: "Next.js", src: "/brands/nextjs-logotype.svg", width: 116, height: 24, className: "tech-logo" },
  { name: "Tailwind CSS", src: "/brands/tailwindcss-logotype.svg", width: 132, height: 24, className: "tech-logo" },
];

export function TechMarquee() {
  return (
    <section className="tech-marquee" aria-labelledby="tech-marquee-label">
      <p id="tech-marquee-label">BUILT FOR OPENAI BUILD WEEK · BUILT WITH</p>
      <div className="tech-marquee__viewport" tabIndex={0}>
        <div className="tech-marquee__track" aria-hidden="true">
          {[...logos, ...logos].map((logo, index) => (
            <div className="tech-marquee__item" key={`${logo.name}-${index}`}>
              <Image
                className={logo.className}
                src={logo.src}
                alt=""
                width={logo.width}
                height={logo.height}
                loading="eager"
                unoptimized
              />
            </div>
          ))}
        </div>
        <span className="sr-only">OpenAI, Next.js, and Tailwind CSS.</span>
      </div>
    </section>
  );
}
