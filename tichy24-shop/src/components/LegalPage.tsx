import type { LegalSection } from "@/dictionaries/de";

export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div className="container">
      <article className="legal">
        <h1>{title}</h1>
        {sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
