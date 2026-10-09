import { site } from "@/lib/site";
import { formatChf } from "@/lib/money";
import { SHIPPING, VAT_RATE_BP, formatVatRate } from "@/lib/pricing";

/**
 * Nemecky slovnik (de-CH: "ss" misto "ß"). Typ `Dictionary` vznika z
 * tohoto objektu — pozdejsi fr/it slovnik se deklaruje `: Dictionary`,
 * takze chybejici nebo prebytecny klic shodi `npm run typecheck`.
 * To je preklad­ova pojistka, ktera se nesmi uvolnit.
 *
 * Slovnik obsahuje FUNKCE. React je neprenese z serveru do klientske
 * komponenty, takze se klientum predava jen uzky vyrez hotovych retezcu.
 *
 * !! Pravni texty (Impressum, AGB, Datenschutz) jsou VZOR. Pred ostrym
 * !! provozem je musi projit pravnik — viz README, "Pred spustenim".
 */

const fullAddress = `${site.contact.street}, ${site.contact.postalCode} ${site.contact.city}`;
const vatOn = VAT_RATE_BP > 0;
const vatText = formatVatRate(VAT_RATE_BP);

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export const de = {
  meta: {
    title: `${site.name} – ${site.tagline}`,
    description:
      "Werkzeug, Ersatzteile und Pflegeprodukte vom Mechaniker – direkt, fair und mit Versand in der ganzen Schweiz.",
    titleTemplate: (page: string) => `${page} | ${site.name}`,
  },

  common: {
    skipToContent: "Zum Inhalt springen",
    vatIncluded: vatOn ? `inkl. ${vatText} % MwSt.` : "",
    /** Popisek radku s obsazenou MwSt; prazdny, kdyz obchod neplati DPH. */
    vatLabel: vatOn ? `Davon ${vatText} % MwSt.` : "",
    /** Dasselbe fuer eine ULOZENOU sazbu (stara objednavka muze mit jinou nez dnesni). */
    vatLabelFor: (rateBp: number) => `Davon ${formatVatRate(rateBp)} % MwSt.`,
    back: "Zurück",
    currencyNote: "Alle Preise in Schweizer Franken (CHF)",
    required: "Pflichtfeld",
  },

  nav: {
    shop: "Shop",
    shipping: "Versand & Zahlung",
    contact: "Kontakt",
    cart: "Warenkorb",
    cartCount: (n: number) => (n === 0 ? "Warenkorb" : `Warenkorb (${n})`),
    menu: "Menü",
  },

  home: {
    hero: {
      eyebrow: site.tagline,
      title: "Vom Mechaniker. Für alle, die selber schrauben.",
      lead: "Werkzeug, Ersatzteile und Pflegeprodukte, die in der Werkstatt täglich im Einsatz sind – jetzt auch online bestellbar.",
      cta: "Zum Shop",
      ctaSecondary: "Versand & Zahlung",
    },
    usps: [
      {
        title: "Aus der Werkstatt",
        text: "Wir verkaufen, was wir selber verwenden. Keine Ladenhüter, kein Ramsch.",
      },
      {
        title: "Versand in der Schweiz",
        text: `Versand per Post in die Schweiz und nach Liechtenstein. Ab ${formatChf(SHIPPING.freeFromCents)} ohne Versandkosten.`,
      },
      {
        title: "Persönliche Beratung",
        text: "Unsicher, was passt? Fragen Sie den Mechaniker – per E-Mail oder Telefon.",
      },
    ],
    categoriesHeading: "Kategorien",
    featuredHeading: "Neu im Shop",
    allProducts: "Alle Produkte ansehen",
  },

  shop: {
    title: "Shop",
    lead: "Alles für Werkstatt und Garage.",
    searchLabel: "Produkte suchen",
    searchPlaceholder: "Name oder Artikelnummer",
    searchButton: "Suchen",
    allCategories: "Alle Kategorien",
    categoriesLabel: "Kategorien",
    resultCount: (n: number) => (n === 1 ? "1 Produkt" : `${n} Produkte`),
    noResults: "Dazu haben wir leider nichts gefunden.",
    resetFilters: "Filter zurücksetzen",
  },

  product: {
    addToCart: "In den Warenkorb",
    quantity: "Anzahl",
    sku: "Artikelnummer",
    inStock: "Auf Lager",
    lowStock: (n: number) => `Nur noch ${n} auf Lager`,
    soldOut: "Zurzeit nicht lieferbar",
    shippingNote: `Versand ab ${formatChf(SHIPPING.flatCents)} – ab ${formatChf(SHIPPING.freeFromCents)} Warenwert gratis.`,
    description: "Beschreibung",
    breadcrumbShop: "Shop",
    placeholderImage: "Produktbild folgt",
    imageOf: (name: string) => `Bild: ${name}`,
  },

  cart: {
    title: "Warenkorb",
    empty: "Ihr Warenkorb ist leer.",
    emptyCta: "Weiter einkaufen",
    product: "Produkt",
    unitPrice: "Preis",
    quantity: "Anzahl",
    lineTotal: "Total",
    update: "Aktualisieren",
    remove: "Entfernen",
    subtotal: "Zwischensumme",
    shipping: "Versand",
    shippingFree: "gratis",
    shippingEstimate: "wird an der Kasse berechnet",
    freeShippingHint: (missingCents: number) =>
      `Noch ${formatChf(missingCents)} bis zum kostenlosen Versand.`,
    total: "Total",
    checkout: "Zur Kasse",
    continueShopping: "Weiter einkaufen",
    clamped: "Die Anzahl wurde auf den aktuellen Lagerbestand angepasst.",
    dropped: "Ein Produkt in Ihrem Warenkorb ist nicht mehr verfügbar und wurde entfernt.",
    removeLabel: (name: string) => `${name} entfernen`,
  },

  checkout: {
    title: "Kasse",
    contactHeading: "Ihre Angaben",
    name: "Vor- und Nachname",
    email: "E-Mail",
    emailHint: "Hierhin senden wir Rückfragen zu Ihrer Bestellung.",
    phone: "Telefon (optional)",
    deliveryHeading: "Lieferung",
    delivery: {
      SHIPPING: "Versand per Post",
      PICKUP: "Abholung in der Werkstatt",
    },
    pickupHint: `Abholung ${site.contact.pickupHours}. Wir melden uns, sobald die Bestellung bereit ist.`,
    addressHeading: "Lieferadresse",
    street: "Strasse und Nr.",
    postalCode: "PLZ",
    city: "Ort",
    country: "Land",
    countries: { CH: "Schweiz", LI: "Liechtenstein" },
    paymentHeading: "Zahlung",
    payment: {
      PREPAYMENT: "Vorkasse (Banküberweisung)",
      CASH_ON_PICKUP: "Barzahlung bei Abholung",
    },
    paymentHint: {
      PREPAYMENT: "Die Zahlungsangaben erhalten Sie nach dem Absenden. Versand nach Zahlungseingang.",
      CASH_ON_PICKUP: "Sie bezahlen direkt bei der Abholung.",
    },
    noteLabel: "Anmerkung zur Bestellung (optional)",
    termsBefore: "Ich habe die ",
    termsAgb: "AGB",
    termsMiddle: " und die ",
    termsPrivacy: "Datenschutzerklärung",
    termsAfter: " gelesen und bin damit einverstanden.",
    submit: "Zahlungspflichtig bestellen",
    submitting: "Wird gesendet …",
    summaryHeading: "Ihre Bestellung",
    errorsHeading: "Bitte prüfen Sie Ihre Eingaben:",
    errors: {
      required: "Bitte ausfüllen.",
      email: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
      postalCode: "Bitte geben Sie eine vierstellige PLZ ein.",
      terms: "Bitte bestätigen Sie AGB und Datenschutzerklärung.",
      paymentMismatch: "Barzahlung ist nur bei Abholung möglich.",
      invalid: "Ungültige Eingabe.",
      tooLong: "Der Text ist zu lang.",
    },
    stockError: (name: string, available: number) =>
      available > 0
        ? `„${name}" ist nur noch ${available}-mal verfügbar. Bitte passen Sie den Warenkorb an.`
        : `„${name}" ist leider ausverkauft. Bitte entfernen Sie den Artikel aus dem Warenkorb.`,
    unavailableError:
      "Ein Artikel in Ihrem Warenkorb ist nicht mehr verfügbar. Bitte prüfen Sie den Warenkorb.",
    genericError:
      "Die Bestellung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns.",
  },

  order: {
    title: "Bestellung aufgegeben",
    thanks: "Vielen Dank für Ihre Bestellung!",
    number: "Bestellnummer",
    keepLink: "Speichern Sie diese Seite als Lesezeichen – sie ist Ihre Bestellbestätigung.",
    statusLabel: "Status",
    status: {
      NEW: "Eingegangen",
      PAID: "Bezahlt",
      FULFILLED: "Versendet / abgeholt",
      CANCELLED: "Storniert",
    },
    prepayment: {
      heading: "So bezahlen Sie",
      intro: "Bitte überweisen Sie den Gesamtbetrag. Wir versenden, sobald die Zahlung eingegangen ist.",
      holder: "Kontoinhaber",
      iban: "IBAN",
      ibanMissing: "Die Bankverbindung teilen wir Ihnen per E-Mail mit.",
      amount: "Betrag",
      reference: "Zahlungszweck",
    },
    cash: {
      heading: "Barzahlung bei Abholung",
      text: `Wir melden uns, sobald Ihre Bestellung bereitliegt. Abholung ${site.contact.pickupHours}.`,
    },
    shippingTo: "Lieferadresse",
    pickupAt: "Abholung in der Werkstatt",
    items: "Artikel",
    contactUs: "Fragen? Schreiben Sie uns:",
    notFound: "Diese Bestellung wurde nicht gefunden.",
  },

  footer: {
    shop: "Shop",
    info: "Informationen",
    impressum: "Impressum",
    agb: "AGB",
    privacy: "Datenschutz",
    shipping: "Versand & Zahlung",
    contact: "Kontakt",
    rights: (year: number) => `© ${year} ${site.owner}`,
    swissNote: "Online-Shop mit Sitz in der Schweiz",
  },

  contactPage: {
    title: "Kontakt",
    lead: "Fragen zu einem Artikel oder zu Ihrer Bestellung? Wir antworten so schnell wie möglich.",
    address: "Adresse",
    email: "E-Mail",
    phone: "Telefon",
    pickup: "Abholung",
    pickupText: `Abholung von Bestellungen ${site.contact.pickupHours}.`,
  },

  notFound: {
    title: "Seite nicht gefunden",
    text: "Diese Seite gibt es nicht (mehr).",
    cta: "Zur Startseite",
  },

  legal: {
    shipping: {
      title: "Versand & Zahlung",
      sections: [
        {
          heading: "Versand",
          paragraphs: [
            `Wir liefern per Post an Adressen in der Schweiz und in Liechtenstein. Die Versandkosten betragen pauschal ${formatChf(SHIPPING.flatCents)}. Ab einem Warenwert von ${formatChf(SHIPPING.freeFromCents)} liefern wir versandkostenfrei.`,
            "Die Lieferzeit beträgt in der Regel wenige Werktage nach Zahlungseingang. Ist ein Artikel nicht auf Lager, wird er im Shop als nicht lieferbar angezeigt.",
          ],
        },
        {
          heading: "Abholung",
          paragraphs: [
            `Sie können Ihre Bestellung in unserer Werkstatt abholen (${fullAddress}). Die Abholung erfolgt ${site.contact.pickupHours}. Wir melden uns, sobald die Bestellung bereitliegt. Die Abholung ist kostenlos.`,
          ],
        },
        {
          heading: "Zahlung",
          paragraphs: [
            "Bei Lieferung per Post bezahlen Sie per Vorkasse (Banküberweisung). Die Bankverbindung und die Bestellnummer als Zahlungszweck sehen Sie nach dem Absenden der Bestellung. Wir versenden, sobald die Zahlung bei uns eingegangen ist.",
            "Bei Abholung können Sie auch bar bezahlen.",
          ],
        },
        {
          heading: "Rückgabe",
          paragraphs: [
            "Bei Online-Käufen in der Schweiz besteht kein gesetzliches Widerrufsrecht. Wenn ein Artikel nicht passt, sprechen Sie uns trotzdem an – wir finden im Einzelfall eine Lösung. Ein Anspruch auf Rücknahme besteht jedoch nicht. Ihre Rechte bei Mängeln bleiben unberührt (siehe AGB).",
          ],
        },
      ] satisfies LegalSection[],
    },

    impressum: {
      title: "Impressum",
      sections: [
        {
          heading: "Anbieter",
          paragraphs: [
            `${site.owner}\n${site.contact.street}\n${site.contact.postalCode} ${site.contact.city}\nSchweiz`,
          ],
        },
        {
          heading: "Kontakt",
          paragraphs: [`E-Mail: ${site.contact.email}\nTelefon: ${site.contact.phone}`],
        },
        {
          heading: "Handelsregister und Steuern",
          paragraphs: [
            `Unternehmens-Identifikationsnummer (UID): ${site.contact.uid}${vatOn ? "\nMehrwertsteuer: Die Preise enthalten die gesetzliche Schweizer Mehrwertsteuer." : ""}`,
          ],
        },
        {
          heading: "Haftungsausschluss",
          paragraphs: [
            "Der Anbieter übernimmt keine Gewähr für die Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen. Haftungsansprüche wegen Schäden materieller oder immaterieller Art, die aus dem Zugriff auf die Website oder deren Nutzung entstehen, sind ausgeschlossen, soweit gesetzlich zulässig.",
            "Für Inhalte verlinkter Seiten Dritter ist ausschliesslich deren Betreiber verantwortlich.",
          ],
        },
        {
          heading: "Urheberrecht",
          paragraphs: [
            "Die Inhalte dieser Website (Texte, Bilder, Grafiken) sind urheberrechtlich geschützt. Eine Verwendung ausserhalb der gesetzlichen Schranken bedarf der vorherigen schriftlichen Zustimmung des Anbieters.",
          ],
        },
      ] satisfies LegalSection[],
    },

    agb: {
      title: "Allgemeine Geschäftsbedingungen",
      sections: [
        {
          heading: "1. Geltungsbereich",
          paragraphs: [
            `Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Bestellungen über den Online-Shop ${site.domain} von ${site.owner}, ${fullAddress} (nachfolgend «Verkäufer»). Abweichende Bedingungen des Kunden gelten nur, wenn der Verkäufer ihnen schriftlich zugestimmt hat.`,
          ],
        },
        {
          heading: "2. Vertragsabschluss",
          paragraphs: [
            "Die Darstellung der Produkte im Online-Shop ist eine unverbindliche Einladung zur Bestellung. Mit dem Absenden der Bestellung gibt der Kunde ein verbindliches Kaufangebot ab. Der Kaufvertrag kommt zustande, sobald der Verkäufer die Bestellung bestätigt oder die Ware versendet.",
          ],
        },
        {
          heading: "3. Preise",
          paragraphs: [
            `Alle Preise sind in Schweizer Franken (CHF) angegeben${vatOn ? ` und enthalten die gesetzliche Mehrwertsteuer (${vatText} %)` : ""}. Versandkosten werden separat ausgewiesen und an der Kasse vor Abgabe der Bestellung angezeigt. Massgebend ist der Preis zum Zeitpunkt der Bestellung.`,
          ],
        },
        {
          heading: "4. Zahlung",
          paragraphs: [
            "Die Zahlung erfolgt per Vorkasse (Banküberweisung) oder, bei Abholung, in bar. Bei Vorkasse versendet der Verkäufer die Ware nach Zahlungseingang. Geht die Zahlung nicht innerhalb von 10 Tagen nach Bestellung ein, ist der Verkäufer berechtigt, die Bestellung zu stornieren.",
          ],
        },
        {
          heading: "5. Lieferung",
          paragraphs: [
            "Die Lieferung erfolgt an Adressen in der Schweiz und in Liechtenstein oder durch Abholung in der Werkstatt. Angegebene Lieferfristen sind unverbindlich, sofern nichts anderes vereinbart wurde. Teillieferungen sind zulässig, soweit sie dem Kunden zumutbar sind.",
          ],
        },
        {
          heading: "6. Eigentumsvorbehalt",
          paragraphs: ["Die Ware bleibt bis zur vollständigen Bezahlung Eigentum des Verkäufers."],
        },
        {
          heading: "7. Rückgabe",
          paragraphs: [
            "Ein gesetzliches Widerrufs- oder Rückgaberecht für Online-Käufe besteht in der Schweiz nicht. Eine Rücknahme aus Kulanz ist nur nach vorheriger Absprache möglich; darauf besteht kein Anspruch.",
          ],
        },
        {
          heading: "8. Gewährleistung",
          paragraphs: [
            "Es gelten die gesetzlichen Mängelrechte (Art. 197 ff. OR). Die Gewährleistungsfrist für neue Ware beträgt zwei Jahre ab Ablieferung. Offensichtliche Mängel sind unverzüglich nach Erhalt, versteckte Mängel unverzüglich nach Entdeckung schriftlich zu melden.",
            "Der Einbau von Fahrzeug- und Ersatzteilen sollte durch Fachpersonen erfolgen. Für Schäden aufgrund unsachgemässer Montage oder Verwendung wird die Haftung ausgeschlossen.",
          ],
        },
        {
          heading: "9. Haftung",
          paragraphs: [
            "Der Verkäufer haftet für Vorsatz und grobe Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit sowie für indirekte Schäden und Folgeschäden ist, soweit gesetzlich zulässig, ausgeschlossen.",
          ],
        },
        {
          heading: "10. Datenschutz",
          paragraphs: [
            "Der Verkäufer bearbeitet Personendaten gemäss der Datenschutzerklärung, die Bestandteil dieser AGB ist.",
          ],
        },
        {
          heading: "11. Anwendbares Recht und Gerichtsstand",
          paragraphs: [
            "Es gilt Schweizer Recht unter Ausschluss des UN-Kaufrechts (CISG). Gerichtsstand ist der Sitz des Verkäufers, soweit nicht zwingende gesetzliche Gerichtsstände (insbesondere für Konsumenten) entgegenstehen.",
          ],
        },
      ] satisfies LegalSection[],
    },

    privacy: {
      title: "Datenschutzerklärung",
      sections: [
        {
          heading: "Verantwortlicher",
          paragraphs: [
            `Verantwortlich für die Datenbearbeitung auf dieser Website ist ${site.owner}, ${fullAddress}, E-Mail: ${site.contact.email}.`,
          ],
        },
        {
          heading: "Welche Daten wir bearbeiten",
          paragraphs: [
            "Bei einer Bestellung bearbeiten wir Ihren Namen, Ihre E-Mail-Adresse, optional Ihre Telefonnummer, die Lieferadresse (bei Versand), Ihre Anmerkung sowie die bestellten Artikel und Beträge.",
            "Beim Besuch der Website fallen technisch notwendige Zugriffsdaten an (z. B. IP-Adresse, Zeitpunkt, aufgerufene Seite), die der Hosting-Anbieter zur Sicherstellung des Betriebs und der Sicherheit verarbeitet.",
          ],
        },
        {
          heading: "Zweck",
          paragraphs: [
            "Wir verwenden Ihre Daten, um Bestellungen abzuwickeln, Ihnen die Ware zu liefern, Zahlungen zuzuordnen, Ihre Fragen zu beantworten und gesetzliche Pflichten zu erfüllen. Wir betreiben kein Tracking und keine Werbeanalyse.",
          ],
        },
        {
          heading: "Cookies",
          paragraphs: [
            "Wir setzen ein einziges, technisch notwendiges Cookie ein, in dem Ihr Warenkorb gespeichert wird. Es enthält nur Artikelnummern und Mengen, keine persönlichen Daten, und läuft nach 30 Tagen ab. Eine Einwilligung ist dafür nicht erforderlich.",
          ],
        },
        {
          heading: "Weitergabe an Dritte",
          paragraphs: [
            "Wir geben Daten nur weiter, soweit dies zur Abwicklung nötig ist, etwa an die Post für den Versand. Für Hosting und Datenbank setzen wir Dienstleister ein, die in unserem Auftrag Daten bearbeiten. Dabei können Daten auch ins Ausland, insbesondere in die EU und in die USA, übermittelt werden. Wir stellen durch vertragliche Garantien (z. B. Standardvertragsklauseln) ein angemessenes Datenschutzniveau sicher.",
          ],
        },
        {
          heading: "Aufbewahrung",
          paragraphs: [
            "Bestelldaten bewahren wir so lange auf, wie es zur Abwicklung nötig ist und wie es gesetzliche Aufbewahrungspflichten verlangen – für Geschäftsunterlagen in der Schweiz grundsätzlich zehn Jahre (Art. 958f OR). Danach werden sie gelöscht.",
          ],
        },
        {
          heading: "Ihre Rechte",
          paragraphs: [
            `Sie haben im Rahmen des anwendbaren Datenschutzrechts das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Bearbeitung Ihrer Daten. Schreiben Sie dazu an ${site.contact.email}. Zudem können Sie sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren.`,
          ],
        },
        {
          heading: "Stand",
          paragraphs: ["Diese Erklärung kann angepasst werden. Es gilt die jeweils auf dieser Seite veröffentlichte Fassung."],
        },
      ] satisfies LegalSection[],
    },
  },

  admin: {
    title: "Verwaltung",
    welcome: "Angemeldet als",
    signOut: "Abmelden",
    nav: { orders: "Bestellungen", products: "Produkte", shop: "Zum Shop" },
    login: {
      title: "Anmeldung",
      email: "E-Mail",
      password: "Passwort",
      submit: "Anmelden",
      error: "E-Mail oder Passwort ist falsch.",
    },
    orders: {
      title: "Bestellungen",
      empty: "Noch keine Bestellungen.",
      number: "Nr.",
      date: "Datum",
      customer: "Kunde",
      total: "Total",
      status: "Status",
      delivery: "Lieferung",
      payment: "Zahlung",
      openCount: (n: number) => (n === 1 ? "1 offene Bestellung" : `${n} offene Bestellungen`),
      detail: "Details",
      items: "Artikel",
      address: "Adresse",
      note: "Anmerkung",
      timeline: "Verlauf",
      created: "Eingegangen",
      paidAt: "Bezahlt",
      fulfilledAt: "Versendet / abgeholt",
      cancelledAt: "Storniert",
      actions: "Status ändern",
      noActions: "Keine weiteren Schritte möglich.",
      action: {
        PAID: "Als bezahlt markieren",
        FULFILLED: "Als versendet / abgeholt markieren",
        CANCELLED: "Stornieren und Lager zurückbuchen",
      },
      cancelConfirm: "Bestellung wirklich stornieren? Die Artikel werden ins Lager zurückgebucht. Eine bereits erfolgte Zahlung müssen Sie manuell zurückerstatten.",
      changeFailed: "Der Status konnte nicht geändert werden (bereits geändert?).",
      deliveryLabel: { SHIPPING: "Versand", PICKUP: "Abholung" },
      paymentLabel: { PREPAYMENT: "Vorkasse", CASH_ON_PICKUP: "Bar bei Abholung" },
    },
    products: {
      title: "Produkte",
      new: "Neues Produkt",
      empty: "Noch keine Produkte.",
      name: "Name",
      sku: "Artikelnr.",
      category: "Kategorie",
      price: "Preis (CHF)",
      stock: "Lager",
      active: "Im Shop sichtbar",
      inactive: "Ausgeblendet",
      edit: "Bearbeiten",
      slug: "URL-Name",
      slugHint: "Kleinbuchstaben, Ziffern und Bindestriche.",
      summary: "Kurzbeschreibung",
      description: "Beschreibung",
      descriptionHint: "Absätze mit einer Leerzeile trennen.",
      imageUrl: "Bild-URL (optional)",
      save: "Speichern",
      saved: "Gespeichert.",
      lowStock: "Wenig Lager",
      errors: {
        required: "Bitte ausfüllen.",
        price: "Ungültiger Preis (z. B. 12.50).",
        stock: "Ganze Zahl ab 0.",
        slug: "Nur Kleinbuchstaben, Ziffern und Bindestriche.",
        duplicate: "Dieser URL-Name oder diese Artikelnummer existiert bereits.",
        category: "Bitte eine Kategorie wählen.",
        imageUrl: "Nur https-Adressen sind erlaubt.",
      },
    },
  },
};

export type Dictionary = typeof de;
