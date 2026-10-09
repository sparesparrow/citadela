import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.legal.impressum.title, alternates: { canonical: "/impressum" } };
}

export default async function Page() {
  const dict = await getDictionary();
  return <LegalPage {...dict.legal.impressum} />;
}
