"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { placeOrderAction } from "@/app/actions";
import { initialCheckoutState } from "@/lib/checkout";
import { formatChf } from "@/lib/money";
import { computeTotals } from "@/lib/pricing";

/**
 * Nesmi dostat cely slovnik: obsahuje funkce, ktere React neprenese pres
 * hranici server/klient. Server (kasse/page.tsx) sem posila jen hotove retezce.
 */
export interface CheckoutLabels {
  contactHeading: string;
  name: string;
  email: string;
  emailHint: string;
  phone: string;
  deliveryHeading: string;
  deliveryShipping: string;
  deliveryPickup: string;
  pickupHint: string;
  addressHeading: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  countryCH: string;
  countryLI: string;
  paymentHeading: string;
  paymentPrepayment: string;
  paymentCash: string;
  paymentHintPrepayment: string;
  paymentHintCash: string;
  noteLabel: string;
  termsBefore: string;
  termsAgb: string;
  termsMiddle: string;
  termsPrivacy: string;
  termsAfter: string;
  submit: string;
  submitting: string;
  summaryHeading: string;
  subtotal: string;
  shipping: string;
  shippingFree: string;
  total: string;
  vatLabel: string;
  errorsHeading: string;
}

export interface SummaryItem {
  id: string;
  name: string;
  quantity: number;
  unitCents: number;
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  span2?: boolean;
  state: typeof initialCheckoutState;
  inputMode?: "numeric" | "tel" | "email";
  maxLength?: number;
};

function Field({ name, label, type = "text", autoComplete, hint, required, span2, state, inputMode, maxLength }: FieldProps) {
  const error = state.errors[name];
  return (
    <div className={`field${error ? " field-invalid" : ""}${span2 ? " span-2" : ""}`}>
      <label htmlFor={`f-${name}`}>{label}</label>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        defaultValue={state.values[name] ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `e-${name}` : hint ? `h-${name}` : undefined}
      />
      {hint && !error && <div className="field-hint" id={`h-${name}`}>{hint}</div>}
      {error && <div className="field-error" id={`e-${name}`}>{error}</div>}
    </div>
  );
}

export function CheckoutForm({
  labels,
  items,
}: {
  labels: CheckoutLabels;
  items: SummaryItem[];
}) {
  const [state, formAction, pending] = useActionState(placeOrderAction, initialCheckoutState);
  const [delivery, setDelivery] = useState<"SHIPPING" | "PICKUP">(
    state.values.deliveryMethod === "PICKUP" ? "PICKUP" : "SHIPPING",
  );
  const [payment, setPayment] = useState<"PREPAYMENT" | "CASH_ON_PICKUP">(
    state.values.paymentMethod === "CASH_ON_PICKUP" ? "CASH_ON_PICKUP" : "PREPAYMENT",
  );

  // Hotovost existuje jen u vyzvednuti — po prepnuti na zaslani se vraci predplatba,
  // aby formular nemohl odeslat kombinaci, kterou server stejne odmitne.
  const effectivePayment = delivery === "PICKUP" ? payment : "PREPAYMENT";

  const totals = computeTotals(items, delivery);
  const errorEntries = Object.entries(state.errors);

  return (
    <form action={formAction} className="checkout-layout" noValidate>
      <div>
        {(state.formError || errorEntries.length > 0) && (
          <div className="notice notice-error" role="alert">
            {state.formError ?? labels.errorsHeading}
          </div>
        )}

        {/* Honeypot: Menschen sehen das Feld nicht, einfache Bots füllen es aus. */}
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="f-website">Website</label>
          <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <fieldset>
          <legend>{labels.contactHeading}</legend>
          <div className="form-grid">
            <Field name="name" label={labels.name} autoComplete="name" required state={state} span2 />
            <Field name="email" label={labels.email} type="email" autoComplete="email" hint={labels.emailHint} required state={state} inputMode="email" />
            <Field name="phone" label={labels.phone} type="tel" autoComplete="tel" state={state} inputMode="tel" />
          </div>
        </fieldset>

        <fieldset>
          <legend>{labels.deliveryHeading}</legend>
          <label className="radio-card">
            <input type="radio" name="deliveryMethod" value="SHIPPING" checked={delivery === "SHIPPING"} onChange={() => setDelivery("SHIPPING")} />
            <span>{labels.deliveryShipping}</span>
          </label>
          <label className="radio-card">
            <input type="radio" name="deliveryMethod" value="PICKUP" checked={delivery === "PICKUP"} onChange={() => setDelivery("PICKUP")} />
            <span>
              {labels.deliveryPickup}
              <small>{labels.pickupHint}</small>
            </span>
          </label>
        </fieldset>

        {delivery === "SHIPPING" && (
          <fieldset>
            <legend>{labels.addressHeading}</legend>
            <div className="form-grid">
              <Field name="street" label={labels.street} autoComplete="street-address" required state={state} span2 />
              <Field name="postalCode" label={labels.postalCode} autoComplete="postal-code" inputMode="numeric" maxLength={4} required state={state} />
              <Field name="city" label={labels.city} autoComplete="address-level2" required state={state} />
              <div className={`field${state.errors.country ? " field-invalid" : ""}`}>
                <label htmlFor="f-country">{labels.country}</label>
                <select id="f-country" name="country" defaultValue={state.values.country ?? "CH"} autoComplete="country">
                  <option value="CH">{labels.countryCH}</option>
                  <option value="LI">{labels.countryLI}</option>
                </select>
                {state.errors.country && <div className="field-error">{state.errors.country}</div>}
              </div>
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>{labels.paymentHeading}</legend>
          <label className="radio-card">
            <input type="radio" name="paymentMethod" value="PREPAYMENT" checked={effectivePayment === "PREPAYMENT"} onChange={() => setPayment("PREPAYMENT")} />
            <span>
              {labels.paymentPrepayment}
              <small>{labels.paymentHintPrepayment}</small>
            </span>
          </label>
          {delivery === "PICKUP" && (
            <label className="radio-card">
              <input type="radio" name="paymentMethod" value="CASH_ON_PICKUP" checked={effectivePayment === "CASH_ON_PICKUP"} onChange={() => setPayment("CASH_ON_PICKUP")} />
              <span>
                {labels.paymentCash}
                <small>{labels.paymentHintCash}</small>
              </span>
            </label>
          )}
          {state.errors.paymentMethod && <div className="field-error">{state.errors.paymentMethod}</div>}
        </fieldset>

        <div className={`field${state.errors.note ? " field-invalid" : ""}`}>
          <label htmlFor="f-note">{labels.noteLabel}</label>
          <textarea id="f-note" name="note" maxLength={500} defaultValue={state.values.note ?? ""} />
          {state.errors.note && <div className="field-error">{state.errors.note}</div>}
        </div>

        <div className={`field${state.errors.terms ? " field-invalid" : ""}`}>
          <label className="checkbox-row">
            <input type="checkbox" name="terms" defaultChecked={state.values.terms === "on"} required />
            <span>
              {labels.termsBefore}
              <Link href="/agb" target="_blank">{labels.termsAgb}</Link>
              {labels.termsMiddle}
              <Link href="/datenschutz" target="_blank">{labels.termsPrivacy}</Link>
              {labels.termsAfter}
            </span>
          </label>
          {state.errors.terms && <div className="field-error">{state.errors.terms}</div>}
        </div>
      </div>

      <aside className="summary-card" aria-labelledby="summary-h">
        <h2 id="summary-h">{labels.summaryHeading}</h2>
        <ul className="summary-items">
          {items.map((i) => (
            <li key={i.id}>
              <span>{i.quantity} × {i.name}</span>
              <span>{formatChf(i.unitCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row"><span>{labels.subtotal}</span><span>{formatChf(totals.subtotalCents)}</span></div>
        <div className="summary-row">
          <span>{labels.shipping}</span>
          <span>{totals.shippingCents === 0 ? labels.shippingFree : formatChf(totals.shippingCents)}</span>
        </div>
        <div className="summary-row summary-total"><span>{labels.total}</span><span>{formatChf(totals.totalCents)}</span></div>
        {labels.vatLabel && totals.vatRateBp > 0 && (
          <div className="summary-row muted">
            <span>{labels.vatLabel}</span>
            <span>{formatChf(totals.vatCents)}</span>
          </div>
        )}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? labels.submitting : labels.submit}
        </button>
      </aside>
    </form>
  );
}
