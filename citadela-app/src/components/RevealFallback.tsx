"use client";

import { useEffect } from "react";

/**
 * Odhalování při scrollu řeší primárně CSS (animation-timeline: view()).
 * Firefox scroll-driven animace nepodporuje, proto tento fallback —
 * spustí se jen tam, kde chybí nativní podpora.
 */
export function RevealFallback() {
  useEffect(() => {
    if (typeof CSS === "undefined") return;
    if (CSS.supports("(animation-timeline: view()) and (animation-range: entry)")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-in", "true");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.16 },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
