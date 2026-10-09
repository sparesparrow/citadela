import { describe, expect, it } from "vitest";
import { validateCheckout } from "./checkout";

const valid = {
  name: "Anna Muster",
  email: "Anna@Example.ch",
  phone: "+41 79 123 45 67",
  deliveryMethod: "SHIPPING",
  paymentMethod: "PREPAYMENT",
  street: "Bahnhofstrasse 1",
  postalCode: "8001",
  city: "Zürich",
  country: "CH",
  note: "",
  terms: "on",
};

function errorsOf(overrides: Record<string, unknown>) {
  const res = validateCheckout({ ...valid, ...overrides });
  return res.ok ? null : res.errors;
}

describe("validateCheckout", () => {
  it("prijme platnou objednavku a normalizuje e-mail", () => {
    const res = validateCheckout(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.email).toBe("anna@example.ch");
      expect(res.data.country).toBe("CH");
      expect(res.data.note).toBeNull();
    }
  });

  it("funguje i nad FormData", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(valid)) fd.set(k, v);
    expect(validateCheckout(fd).ok).toBe(true);
  });

  it("bez souhlasu s AGB neprojde", () => {
    expect(errorsOf({ terms: undefined })?.terms).toBe("terms");
  });

  it.each(["", "abc", "a@b", "a b@c.ch"])("odmitne e-mail %j", (email) => {
    expect(errorsOf({ email })?.email).toBeDefined();
  });

  it.each(["123", "12345", "0800", "ABCD"])("odmitne PSC %j", (postalCode) => {
    expect(errorsOf({ postalCode })?.postalCode).toBe("postalCode");
  });

  it("pri zaslani vyzaduje adresu", () => {
    const e = errorsOf({ street: "", city: "", postalCode: "" });
    expect(e?.street).toBe("required");
    expect(e?.city).toBe("required");
    expect(e?.postalCode).toBe("required");
  });

  it("pri vyzvednuti adresu nechce a nepropusti ji do dat", () => {
    const res = validateCheckout({ ...valid, deliveryMethod: "PICKUP", street: "", city: "", postalCode: "" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.street).toBeNull();
      expect(res.data.country).toBeNull();
    }
  });

  it("hotovost jen pri vyzvednuti", () => {
    expect(errorsOf({ paymentMethod: "CASH_ON_PICKUP" })?.paymentMethod).toBe("paymentMismatch");
    expect(validateCheckout({ ...valid, deliveryMethod: "PICKUP", paymentMethod: "CASH_ON_PICKUP" }).ok).toBe(true);
  });

  it("odmitne zem mimo CH a LI", () => {
    expect(errorsOf({ country: "DE" })?.country).toBe("invalid");
  });

  it("odmitne neznamy zpusob dopravy", () => {
    expect(errorsOf({ deliveryMethod: "DRONE" })?.deliveryMethod).toBe("invalid");
  });

  it("omezi delku poznamky", () => {
    expect(errorsOf({ note: "x".repeat(501) })?.note).toBe("tooLong");
  });

  it("telefon je volitelny, ale kdyz je, musi davat smysl", () => {
    expect(validateCheckout({ ...valid, phone: "" }).ok).toBe(true);
    expect(errorsOf({ phone: "ahoj" })?.phone).toBe("invalid");
  });

  it("nevraci data, kdyz je jakakoli chyba", () => {
    expect(validateCheckout({ ...valid, name: "" }).ok).toBe(false);
  });
});
