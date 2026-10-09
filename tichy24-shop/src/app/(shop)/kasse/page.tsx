import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm, type CheckoutLabels } from "@/components/CheckoutForm";
import { readCart } from "@/lib/cart-store";
import { resolveCart } from "@/lib/cart-view";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.checkout.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage() {
  const dict = await getDictionary();
  const cart = await resolveCart(await readCart());
  if (cart.items.length === 0) redirect("/warenkorb");

  const k = dict.checkout;
  // Nur fertige Strings über die Server/Client-Grenze — das Wörterbuch enthält Funktionen.
  const labels: CheckoutLabels = {
    contactHeading: k.contactHeading,
    name: k.name,
    email: k.email,
    emailHint: k.emailHint,
    phone: k.phone,
    deliveryHeading: k.deliveryHeading,
    deliveryShipping: k.delivery.SHIPPING,
    deliveryPickup: k.delivery.PICKUP,
    pickupHint: k.pickupHint,
    addressHeading: k.addressHeading,
    street: k.street,
    postalCode: k.postalCode,
    city: k.city,
    country: k.country,
    countryCH: k.countries.CH,
    countryLI: k.countries.LI,
    paymentHeading: k.paymentHeading,
    paymentPrepayment: k.payment.PREPAYMENT,
    paymentCash: k.payment.CASH_ON_PICKUP,
    paymentHintPrepayment: k.paymentHint.PREPAYMENT,
    paymentHintCash: k.paymentHint.CASH_ON_PICKUP,
    noteLabel: k.noteLabel,
    termsBefore: k.termsBefore,
    termsAgb: k.termsAgb,
    termsMiddle: k.termsMiddle,
    termsPrivacy: k.termsPrivacy,
    termsAfter: k.termsAfter,
    submit: k.submit,
    submitting: k.submitting,
    summaryHeading: k.summaryHeading,
    subtotal: dict.cart.subtotal,
    shipping: dict.cart.shipping,
    shippingFree: dict.cart.shippingFree,
    total: dict.cart.total,
    vatLabel: dict.common.vatLabel,
    errorsHeading: k.errorsHeading,
  };

  return (
    <div className="container">
      <h1>{k.title}</h1>
      {cart.droppedCount > 0 && <div className="notice notice-warn" role="status">{dict.cart.dropped}</div>}
      <CheckoutForm
        labels={labels}
        items={cart.items.map((i) => ({ id: i.productId, name: i.name, quantity: i.quantity, unitCents: i.unitCents }))}
      />
    </div>
  );
}
