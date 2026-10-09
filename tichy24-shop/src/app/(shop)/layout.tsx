import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getDictionary } from "@/lib/i18n";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const dict = await getDictionary();
  return (
    <>
      <a className="skip-link" href="#main">{dict.common.skipToContent}</a>
      <Header nav={dict.nav} />
      <main className="main" id="main">{children}</main>
      <Footer dict={dict} />
    </>
  );
}
