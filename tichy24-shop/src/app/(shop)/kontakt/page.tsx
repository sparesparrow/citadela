import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.contactPage.title, alternates: { canonical: "/kontakt" } };
}

export default async function ContactPage() {
  const dict = await getDictionary();
  const k = dict.contactPage;
  const c = site.contact;
  return (
    <div className="container">
      <article className="legal">
        <h1>{k.title}</h1>
        <p className="lead">{k.lead}</p>
        <div className="order-box">
          <dl className="kv">
            <dt>{k.email}</dt>
            <dd><a href={`mailto:${c.email}`}>{c.email}</a></dd>
            <dt>{k.phone}</dt>
            <dd>{c.phone}</dd>
            <dt>{k.address}</dt>
            <dd style={{ whiteSpace: "pre-line" }}>{`${site.owner}\n${c.street}\n${c.postalCode} ${c.city}`}</dd>
            <dt>{k.pickup}</dt>
            <dd>{k.pickupText}</dd>
          </dl>
        </div>
      </article>
    </div>
  );
}
