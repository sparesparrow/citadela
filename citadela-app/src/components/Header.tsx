"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CitadelaMark } from "./Brand";
import type { Dictionary } from "@/dictionaries/en";

interface Props {
  nav: Dictionary["nav"];
  closeLabel: string;
  locale: "cs" | "en";
  bookingHref: string;
  isAdmin: boolean;
  isSignedIn: boolean;
}

const LOCALE_COOKIE = "citadela_locale";

export function Header({ nav, closeLabel, locale, bookingHref, isAdmin, isSignedIn }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Light-dismiss fallback pro prohlížeče bez podpory closedby (Safari).
  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return;

    // Nativní light-dismiss, pokud ho prohlížeč zná.
    if ("closedBy" in HTMLDialogElement.prototype) {
      dialog.setAttribute("closedby", "any");
      return;
    }

    const onClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  const other = locale === "cs" ? "en" : "cs";
  const rest = pathname.replace(/^\/(cs|en)/, "") || "";

  function rememberLocale(next: string) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  }

  // Skupiny jsou první — vila se pronajímá vcelku, takže je to první otázka,
  // kterou si návštěvník klade: vejdeme se sem a pro koho to je?
  const sections = [
    { id: "groups", label: nav.groups },
    { id: "rooms", label: nav.rooms },
    { id: "wellness", label: nav.wellness },
    { id: "rentals", label: nav.rentals },
    { id: "pricing", label: nav.pricing },
    { id: "contact", label: nav.contact },
  ];

  return (
    <>
      <a className="skip-link" href="#main">
        {nav.skipToContent}
      </a>

      <header className="header" data-scrolled={scrolled}>
        <Link className="brand" href={`/${locale}`}>
          <CitadelaMark size={46} />
          <span className="brand-wm">CITADELA</span>
        </Link>

        <div className="header-right">
          <nav className="nav" aria-label={nav.menu}>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.label}
              </a>
            ))}
            {isAdmin && <Link href={`/${locale}/admin`}>{nav.admin}</Link>}
            {!isSignedIn && <Link href={`/${locale}/login`}>{nav.signIn}</Link>}
          </nav>

          <div className="lang" role="group" aria-label={nav.language}>
            <Link href={`/cs${rest}`} hrefLang="cs" aria-current={locale === "cs"} onClick={() => rememberLocale("cs")}>
              CZ
            </Link>
            <Link href={`/en${rest}`} hrefLang="en" aria-current={locale === "en"} onClick={() => rememberLocale("en")}>
              EN
            </Link>
          </div>

          <a className="btn btn-solid" href={bookingHref} target="_blank" rel="noopener noreferrer">
            <span>{nav.reserve}</span>
          </a>

          <button
            className="icon-btn"
            type="button"
            aria-label={nav.menu}
            onClick={() => menuRef.current?.showModal()}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <dialog ref={menuRef} className="mobile-menu" aria-label={nav.menu}>
        <div className="dialog-head">
          <p>{nav.menu}</p>
          <button className="dialog-close" type="button" onClick={() => menuRef.current?.close()}>
            {closeLabel}
          </button>
        </div>
        <div className="dialog-body">
          <nav aria-label={nav.menu}>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={() => menuRef.current?.close()}>
                {s.label}
              </a>
            ))}
            {isAdmin && (
              <Link href={`/${locale}/admin`} onClick={() => menuRef.current?.close()}>
                {nav.admin}
              </Link>
            )}
            <Link href={`/${locale}/login`} onClick={() => menuRef.current?.close()}>
              {isSignedIn ? nav.myStays : nav.signIn}
            </Link>
          </nav>
        </div>
      </dialog>
    </>
  );
}
