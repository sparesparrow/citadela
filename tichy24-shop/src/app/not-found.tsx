import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getDictionary } from "@/lib/i18n";

export default async function NotFound() {
  const dict = await getDictionary();
  return (
    <>
      <Header nav={dict.nav} />
      <main className="main" id="main">
        <div className="container">
          <h1>{dict.notFound.title}</h1>
          <p>{dict.notFound.text}</p>
          <Link className="btn" href="/">{dict.notFound.cta}</Link>
        </div>
      </main>
      <Footer dict={dict} />
    </>
  );
}
