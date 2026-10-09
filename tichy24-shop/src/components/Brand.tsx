import Link from "next/link";
import { site } from "@/lib/site";

/** Logotyp: modre "tichy24" + ".ch" a svycarsky krizek v cervenem znaku. */
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label={`${site.name} – Startseite`}>
      <svg className="brand-mark" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="5" fill="#d52b1e" />
        <path d="M13 6v14M6 13h14" stroke="#fff" strokeWidth="4.5" />
      </svg>
      <span className="brand-word">tichy24</span>
      <span className="brand-ch">.ch</span>
    </Link>
  );
}
