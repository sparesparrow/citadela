"use client";

import { useState } from "react";
import type { Dictionary } from "@/dictionaries/en";

export function SyncPanel({
  sync,
  configured,
  icalUrl,
}: {
  sync: Dictionary["admin"]["sync"];
  configured: boolean;
  icalUrl: string;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const s = sync;

  async function run() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/sync", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { imported?: number; error?: string };
      if (!res.ok) {
        setResult({ tone: "error", text: body.error ?? "error" });
      } else {
        setResult({ tone: "ok", text: `${body.imported ?? 0}` });
        location.reload();
      }
    } catch {
      setResult({ tone: "error", text: "error" });
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard nemusí být povolen */
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{s.title}</h2>
        <button className="btn" type="button" onClick={run} disabled={pending || !configured}>
          <span>{pending ? s.running : s.run}</span>
        </button>
      </div>
      <div className="panel-body">
        <p>{s.lead}</p>
        {!configured && (
          <p className="form-status" data-tone="error" style={{ marginTop: 16 }}>
            {s.notConfigured}
          </p>
        )}

        <div aria-live="polite">
          {result && (
            <p className="form-status" data-tone={result.tone} style={{ marginTop: 16 }}>
              {result.tone === "ok" ? `${s.title}: ${result.text}` : result.text}
            </p>
          )}
        </div>

        <p style={{ marginTop: 26 }}>
          <strong style={{ color: "var(--gold-hi)" }}>{s.outbound}</strong>
          <br />
          {s.outboundHint}
        </p>
        <p className="code">{icalUrl}</p>
        <button className="dialog-close" type="button" onClick={copy} style={{ marginTop: 12 }}>
          {copied ? s.copied : s.copy}
        </button>
      </div>
    </section>
  );
}
