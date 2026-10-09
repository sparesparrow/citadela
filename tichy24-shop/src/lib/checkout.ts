import { z } from "zod";

/**
 * Validace formulare pokladny. Cisty modul: vraci KODY chyb, ne texty —
 * texty jsou ve slovniku (checkout.errors) a pridava je server action.
 */

export type CheckoutErrorCode =
  | "required"
  | "email"
  | "postalCode"
  | "terms"
  | "paymentMismatch"
  | "invalid"
  | "tooLong";

export interface CheckoutData {
  name: string;
  email: string;
  phone: string | null;
  deliveryMethod: "SHIPPING" | "PICKUP";
  paymentMethod: "PREPAYMENT" | "CASH_ON_PICKUP";
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: "CH" | "LI" | null;
  note: string | null;
}

export type CheckoutField =
  | keyof CheckoutData
  | "terms";

export type CheckoutResult =
  | { ok: true; data: CheckoutData }
  | { ok: false; errors: Partial<Record<CheckoutField, CheckoutErrorCode>> };

/** Svycarske i lichtenstejnske PSC jsou ctyrciferna cisla. */
const POSTAL_CODE = /^[1-9]\d{3}$/;
// Zamerne volna kontrola: presne RFC regexy zamitaji platne adresy. Skutecne
// overeni je, ze na adresu dojde potvrzeni.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(raw: FormData | Record<string, unknown>, key: string): string {
  const value = raw instanceof FormData ? raw.get(key) : raw[key];
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** Poznamka si smi nechat odrádkovani, jen se zkrati okraje. */
function multiline(raw: FormData | Record<string, unknown>, key: string): string {
  const value = raw instanceof FormData ? raw.get(key) : raw[key];
  return typeof value === "string" ? value.trim() : "";
}

export function validateCheckout(raw: FormData | Record<string, unknown>): CheckoutResult {
  const errors: Partial<Record<CheckoutField, CheckoutErrorCode>> = {};

  const name = text(raw, "name");
  const email = text(raw, "email").toLowerCase();
  const phone = text(raw, "phone");
  const delivery = text(raw, "deliveryMethod");
  const payment = text(raw, "paymentMethod");
  const note = multiline(raw, "note");

  if (!name) errors.name = "required";
  else if (name.length > 100) errors.name = "tooLong";

  if (!email) errors.email = "required";
  else if (email.length > 200 || !EMAIL.test(email)) errors.email = "email";

  if (phone.length > 40) errors.phone = "tooLong";
  else if (phone && !/^[+\d][\d\s()/.-]{5,}$/.test(phone)) errors.phone = "invalid";

  const deliveryOk = z.enum(["SHIPPING", "PICKUP"]).safeParse(delivery);
  if (!deliveryOk.success) errors.deliveryMethod = "invalid";

  const paymentOk = z.enum(["PREPAYMENT", "CASH_ON_PICKUP"]).safeParse(payment);
  if (!paymentOk.success) errors.paymentMethod = "invalid";

  // Hotovost jde jen pri osobnim vyzvednuti — jinak by obchod posilal zbozi,
  // ktere nikdo nezaplatil.
  if (
    deliveryOk.success &&
    paymentOk.success &&
    paymentOk.data === "CASH_ON_PICKUP" &&
    deliveryOk.data !== "PICKUP"
  ) {
    errors.paymentMethod = "paymentMismatch";
  }

  const needsAddress = deliveryOk.success && deliveryOk.data === "SHIPPING";
  const street = text(raw, "street");
  const postalCode = text(raw, "postalCode");
  const city = text(raw, "city");
  const country = text(raw, "country");

  if (needsAddress) {
    if (!street) errors.street = "required";
    else if (street.length > 150) errors.street = "tooLong";

    if (!postalCode) errors.postalCode = "required";
    else if (!POSTAL_CODE.test(postalCode)) errors.postalCode = "postalCode";

    if (!city) errors.city = "required";
    else if (city.length > 100) errors.city = "tooLong";

    if (country !== "CH" && country !== "LI") errors.country = "invalid";
  }

  if (note.length > 500) errors.note = "tooLong";

  const terms = raw instanceof FormData ? raw.get("terms") : raw.terms;
  if (terms !== "on" && terms !== true) errors.terms = "terms";

  if (Object.keys(errors).length > 0 || !deliveryOk.success || !paymentOk.success) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      phone: phone || null,
      deliveryMethod: deliveryOk.data,
      paymentMethod: paymentOk.data,
      street: needsAddress ? street : null,
      postalCode: needsAddress ? postalCode : null,
      city: needsAddress ? city : null,
      country: needsAddress ? (country as "CH" | "LI") : null,
      note: note || null,
    },
  };
}

/** Stav formulare pokladny mezi odeslanim a znovu-vykreslenim (useActionState). */
export interface CheckoutFormState {
  /** Popisky chyb po polich (uz hotove texty). */
  errors: Partial<Record<string, string>>;
  /** Chyba, ktera nepatri k jednomu poli (sklad, databaze). */
  formError?: string;
  /** Co zakaznik zadal, aby o to po chybe neprisel. */
  values: Record<string, string>;
}

export const initialCheckoutState: CheckoutFormState = { errors: {}, values: {} };
