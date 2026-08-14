"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/dictionaries/en";

/**
 * Texty formuláře už vyhodnocené serverem.
 *
 * `dict.reserve.form` obsahuje i funkce (`guestsOption`, `tooManyGuests`)
 * a funkce nejdou předat klientské komponentě — React je neumí
 * serializovat. Server je proto rozbalí do polí a řetězců; u češtiny
 * se tím navíc zachová správné skloňování („1 osoba / 2 osoby / 5 osob“).
 */
export type ReserveFormLabels = Omit<
  Dictionary["reserve"]["form"],
  "guestsOption" | "tooManyGuests"
> & {
  /** Popisky voleb počtu hostů, index 0 = 1 osoba. */
  guestsOptions: string[];
  tooManyGuests: string;
};

interface Props {
  labels: ReserveFormLabels;
  locale: "cs" | "en";
  /** Kapacita celého objektu — vila se pronajímá vcelku. */
  maxGuests: number;
  signedInEmail?: string | null;
  signedInName?: string | null;
}

type Status = { tone: "ok" | "error"; text: string } | null;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ReserveForm({ labels, locale, maxGuests, signedInEmail, signedInName }: Props) {
  const f = labels;
  const [arrival, setArrival] = useState("");
  const [departure, setDeparture] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const minDeparture = useMemo(() => {
    if (!arrival) return today();
    const d = new Date(arrival);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [arrival]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const a = String(data.get("arrival") ?? "");
    const d = String(data.get("departure") ?? "");
    if (a && d && new Date(d) <= new Date(a)) {
      setDateError(f.invalidDates);
      return;
    }
    setDateError(null);
    setPending(true);
    setStatus(null);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone") || null,
          arrival: a,
          departure: d,
          guests: Number(data.get("guests") ?? 2),
          message: data.get("message") || null,
          website: data.get("website") || undefined,
          locale,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.status === 409) {
        setStatus({ tone: "error", text: f.unavailable });
      } else if (res.status === 422) {
        setStatus({ tone: "error", text: f.tooManyGuests });
      } else if (!res.ok) {
        setStatus({ tone: "error", text: body.error === "invalid" ? f.invalidEmail : f.error });
      } else {
        setStatus({ tone: "ok", text: f.success });
        form.reset();
        setArrival("");
        setDeparture("");
      }
    } catch {
      setStatus({ tone: "error", text: f.error });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="reserve-card" onSubmit={onSubmit} noValidate={false}>
      <fieldset disabled={pending}>
        <legend>{f.legend}</legend>

        <div className="row2">
          <div className="field">
            <label htmlFor="arrival">{f.arrival}</label>
            <input
              id="arrival"
              name="arrival"
              type="date"
              required
              min={today()}
              value={arrival}
              onChange={(e) => setArrival(e.target.value)}
              aria-describedby={dateError ? "date-error" : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor="departure">{f.departure}</label>
            <input
              id="departure"
              name="departure"
              type="date"
              required
              min={minDeparture}
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              aria-describedby={dateError ? "date-error" : undefined}
            />
          </div>
        </div>
        {dateError && (
          <span className="field-error" id="date-error" role="alert">
            {dateError}
          </span>
        )}

        <div className="field">
          <label htmlFor="name">{f.name}</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            placeholder={f.namePlaceholder}
            defaultValue={signedInName ?? ""}
          />
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor="email">{f.email}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              inputMode="email"
              placeholder="vy@example.com"
              defaultValue={signedInEmail ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="phone">
              {f.phone} <span className="optional">({f.phoneOptional})</span>
            </label>
            <input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" inputMode="tel" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="guests">{f.guests}</label>
          <select id="guests" name="guests" defaultValue="10">
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {f.guestsOptions[n - 1]}
              </option>
            ))}
          </select>
        </div>

        {/* Honeypot — skrytý před lidmi, roboti ho vyplní. Server takové
            odeslání odmítne. Není to display:none, aby ho čtečky ignorovaly
            přes aria-hidden a tabIndex, ne odstraněním z DOM. */}
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="field">
          <label htmlFor="message">
            {f.message} <span className="optional">({f.messageOptional})</span>
          </label>
          <textarea id="message" name="message" maxLength={2000} />
        </div>

        {signedInEmail && (
          <p className="reserve-note">
            {f.signedInAs} <strong>{signedInEmail}</strong>
          </p>
        )}

        <button className="btn btn-solid btn-block" type="submit" disabled={pending}>
          <span>{pending ? f.submitting : f.submit}</span>
        </button>
      </fieldset>

      {/* Dynamické hlášení musí být v aria-live oblasti, aby ho ohlásily čtečky. */}
      <div aria-live="polite" aria-atomic="true">
        {status && (
          <p className="form-status" data-tone={status.tone}>
            {status.text}
          </p>
        )}
      </div>

      <p className="reassure">{f.reassure}</p>
    </form>
  );
}
