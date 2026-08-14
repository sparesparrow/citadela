"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/site";

/**
 * Popisky pro galerii.
 *
 * Zamerne NE cely slovnik: ten obsahuje i funkce (napr. rooms.sleeps),
 * a funkce se pres hranici na klienta poslat nedaji — React je neumi
 * serializovat a cela stranka spadne. Predavame proto jen hotove
 * retezce, ktere server uz vyhodnotil.
 */
export interface GalleryLabels {
  gallery: string;
  previous: string;
  next: string;
  close: string;
  /** Popisky fotek ve stejnem poradi jako `photos`. */
  captions: string[];
  /** Pocitadlo s zastupnymi znacemi, napr. "Fotografie {i} z {n}". */
  counter: string;
}

function counterText(template: string, index: number, total: number): string {
  return template.replace("{i}", String(index)).replace("{n}", String(total));
}

/** Fotogalerie s lightboxem. */
export function Gallery({ labels, photos }: { labels: GalleryLabels; photos: Photo[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const count = photos.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

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

  // Šipkami se dá mezi fotkami přecházet, dokud je dialog otevřený.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!dialogRef.current?.open) return;
      if (event.key === "ArrowRight") setActive((i) => (i + 1) % count);
      if (event.key === "ArrowLeft") setActive((i) => (i - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  function open(index: number) {
    setActive(index);
    dialogRef.current?.showModal();
  }

  const current = photos[active];

  return (
    <>
      <ul className="gallery-strip" aria-label={labels.gallery}>
        {photos.map((photo, i) => (
          <li key={photo.src}>
            <button
              type="button"
              className="gallery-item"
              aria-label={`${labels.captions[i]} — ${counterText(labels.counter, i + 1, count)}`}
              onClick={() => open(i)}
            >
              <Image
                src={photo.src}
                alt={labels.captions[i]}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 900px) 78vw, 30vw"
                loading="lazy"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialogRef} aria-label={labels.gallery}>
        <div className="dialog-head">
          <p>{counterText(labels.counter, active + 1, count)}</p>
          <div className="dialog-actions">
            <button
              className="dialog-close"
              type="button"
              onClick={() => setActive((i) => (i - 1 + count) % count)}
            >
              {labels.previous}
            </button>
            <button className="dialog-close" type="button" onClick={() => setActive((i) => (i + 1) % count)}>
              {labels.next}
            </button>
            <button className="dialog-close" type="button" onClick={() => dialogRef.current?.close()}>
              {labels.close}
            </button>
          </div>
        </div>
        <div className="dialog-body">
          <figure className="plate" style={{ aspectRatio: "16 / 10" }}>
            <Image
              src={current.src}
              alt={labels.captions[active]}
              width={current.width}
              height={current.height}
              sizes="90vw"
            />
            <span className="corner corner-tl" />
            <span className="corner corner-tr" />
            <span className="corner corner-bl" />
            <span className="corner corner-br" />
          </figure>
          <figcaption className="dialog-caption">{labels.captions[active]}</figcaption>
        </div>
      </dialog>
    </>
  );
}
