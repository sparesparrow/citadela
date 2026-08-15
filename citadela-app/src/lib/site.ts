/**
 * Strukturální data o objektu. Veškeré texty žijí ve slovnících
 * (src/dictionaries), tady jsou jen slugy, čísla a odkazy.
 */

export const site = {
  name: "Citadela Resort",
  shortName: "Citadela",
  legalName: "Citadela Resort",
  street: "Za Humny 262",
  city: "Rozdrojovice",
  postalCode: "664 34",
  region: "Jihomoravský kraj",
  country: "CZ",
  email: "info@citadelaresort.cz",
  phone: "+420777130013",
  phoneDisplay: "+420 777 130 013",
  geo: { lat: 49.25069, lng: 16.51027 },
  checkIn: "16:00",
  checkOut: "10:00",
  currency: "CZK",
  /** Objekt se pronajímá vcelku, ne po pokojích. */
  maxGuests: 40,
  bedroomCount: 8,
  socialSpaceCount: 4,
  parkingSpaces: 8,
  poolTemperature: 29,
  wifiMbit: 250,
} as const;

/** Hodnocení převzaté z Booking.com — aktualizujte při synchronizaci. */
export const bookingScore = {
  score: 9.1,
  max: 10,
  reviewCount: 128,
} as const;

// ---------------------------------------------------------------------------
// Ložnice
// ---------------------------------------------------------------------------

export type BedroomSlug =
  | "gold"
  | "silver"
  | "silverPlus"
  | "bronze"
  | "blue"
  | "green"
  | "mezzanineUpper"
  | "mezzanineLower";

export interface Bedroom {
  slug: BedroomSlug;
  /** Dolní a horní hranice počtu osob. */
  capacity: number;
  capacityMax?: number;
  /** Vlastní koupelna, nebo společné sociální zařízení. */
  bathroom: "ensuite" | "shared";
  features: BedroomFeature[];
}

export type BedroomFeature = "doubleBed" | "extraBed" | "cornerBath" | "bidet" | "balcony" | "underfloor" | "japanese";

export const bedrooms: Bedroom[] = [
  { slug: "gold", capacity: 2, bathroom: "ensuite", features: ["doubleBed", "cornerBath", "bidet", "underfloor"] },
  { slug: "silver", capacity: 2, bathroom: "ensuite", features: ["doubleBed", "cornerBath", "bidet", "underfloor"] },
  { slug: "silverPlus", capacity: 2, capacityMax: 3, bathroom: "ensuite", features: ["doubleBed", "extraBed", "cornerBath", "bidet"] },
  { slug: "bronze", capacity: 2, bathroom: "shared", features: ["doubleBed", "balcony", "japanese"] },
  { slug: "blue", capacity: 2, bathroom: "shared", features: ["doubleBed"] },
  { slug: "green", capacity: 2, bathroom: "shared", features: ["doubleBed"] },
  { slug: "mezzanineUpper", capacity: 2, bathroom: "shared", features: ["doubleBed"] },
  { slug: "mezzanineLower", capacity: 2, bathroom: "ensuite", features: ["doubleBed", "bidet"] },
];

// ---------------------------------------------------------------------------
// Vybavení
// ---------------------------------------------------------------------------

export const amenityKeys = [
  "pool",
  "finnishSauna",
  "infraSauna",
  "whirlpool",
  "wifi",
  "parking",
  "billiards",
  "danceFloor",
  "soundSystem",
  "poleDance",
  "summerKitchen",
  "firePit",
  "spitRoast",
  "kitchen",
  "dishwasher",
  "coffeeMachine",
  "laundry",
  "tv",
  "underfloorHeating",
  "gate",
  "fenced",
  "sunbeds",
  "outdoorSeating",
  "garden",
  "linens",
  "nonSmoking",
  "lakeView",
  "adultsOriented",
] as const;

export type AmenityKey = (typeof amenityKeys)[number];

/** Šest odznaků zvýrazněných hned pod hero sekcí. */
export const highlightAmenities: AmenityKey[] = [
  "pool",
  "finnishSauna",
  "whirlpool",
  "parking",
  "wifi",
  "summerKitchen",
];

/** Ikony máme jen pro část klíčů; ostatní dostanou obecné zaškrtnutí. */
export const amenityIcons: Partial<Record<AmenityKey, string>> = {
  pool: "pool",
  finnishSauna: "sauna",
  infraSauna: "sauna",
  whirlpool: "whirlpool",
  wifi: "wifi",
  parking: "parking",
  summerKitchen: "grill",
  firePit: "firePit",
  spitRoast: "grill",
  kitchen: "kitchen",
  coffeeMachine: "coffee",
  billiards: "billiards",
  soundSystem: "sound",
  tv: "tv",
  lakeView: "lakeView",
  garden: "garden",
  nonSmoking: "nonSmoking",
  laundry: "laundry",
};

// ---------------------------------------------------------------------------
// Ceník
// ---------------------------------------------------------------------------

export interface Rate {
  slug: "week" | "christmas" | "newYear" | "easter";
  price: number;
  nights: number;
  /** Zvýraznit v ceníku. */
  featured?: boolean;
}

export const rates: Rate[] = [
  { slug: "week", price: 85_000, nights: 6, featured: true },
  { slug: "christmas", price: 75_000, nights: 4 },
  { slug: "newYear", price: 150_000, nights: 5 },
  { slug: "easter", price: 75_000, nights: 4 },
];

export const pricing = {
  /** Cena zahrnuje tento počet osob. */
  includedGuests: 25,
  /** Příplatek za osobu nad rámec zahrnutých, za noc. */
  extraGuestPerNight: 300,
  /** Vratná kauce. */
  deposit: 20_000,
  /** Rekreační poplatek obci za dospělou osobu a noc. */
  touristTaxPerAdultNight: 30,
  /** Záloha pro závaznou rezervaci, v procentech. */
  advancePercent: 50,
  /** Pokuta za neprovedený závěrečný úklid. */
  cleaningPenalty: 2_000,
} as const;

/**
 * Sleva za délku pobytu. Čím delší pobyt, tím méně nástupů a předání —
 * úklid, praní a přebírání domu stojí stejně u dvou nocí jako u čtrnácti.
 * Řadí se od nejdelšího pobytu; `stayLengthDiscount()` bere první, které sedí.
 */
export const stayLengthTiers = [
  { minNights: 14, percent: 15 },
  { minNights: 10, percent: 10 },
  { minNights: 7, percent: 5 },
] as const;

/** Podmínky skupinových a firemních pobytů. */
export const groupPricing = {
  /** Minimum nocí, od kterého skupinovou nabídku stavíme. */
  minNights: 2,
  /** Od kolika osob mluvíme o velké skupině. */
  largeGroupSize: 25,
  /**
   * Sleva na pobyt, který celý proběhne mezi nedělí a čtvrtkem. Pracovní
   * týden je kapacita, kterou jinak neprodáme; víkendy se plní samy.
   */
  midweekPercent: 15,
  /** Splatnost firemní faktury ve dnech od vystavení. */
  invoiceDueDays: 14,
  /** Firemní záloha v procentech — nižší než u soukromých hostů, proti objednávce. */
  corporateAdvancePercent: 30,
  /** Do kolika hodin posíláme cenovou nabídku na firemní poptávku. */
  quoteWithinHours: 24,
  /** Strop pro součet slev — pod tuto hranici dům neprodáváme. */
  maxDiscountPercent: 25,
} as const;

/** Storno podmínky — dny před nástupem a podíl z ceny. */
export const cancellationTiers = [
  { withinDays: 91, percent: 10 },
  { withinDays: 61, percent: 50 },
  { withinDays: 60, percent: 70 },
  { withinDays: 29, percent: 100 },
] as const;

// ---------------------------------------------------------------------------
// Segmenty — kdo dům bere
// ---------------------------------------------------------------------------

/**
 * Vila se pronajímá vcelku, takže se vyplatí jen velká společnost na delší
 * dobu. Segmenty popisují, komu tu nabídku adresujeme; pořadí je zároveň
 * pořadím na webu — firemní pobyty jsou první, protože platí za celý dům
 * i mimo sezónu a mimo víkend, což je jediná kapacita, která nám leží ladem.
 */
export const segments = ["corporate", "wedding", "holiday", "school", "camp"] as const;
export type SegmentKey = (typeof segments)[number];

export interface Segment {
  slug: SegmentKey;
  /** Od kolika osob nabídku stavíme. */
  minGuests: number;
  /** Doporučená délka pobytu v nocích. */
  minNights: number;
  /** Půjčovna, kterou k segmentu nabízíme jako první. */
  rentals: RentalKey[];
  /** Zvýrazněný segment na webu. */
  featured?: boolean;
}

export const segmentList: Segment[] = [
  {
    slug: "corporate",
    minGuests: 15,
    minNights: 2,
    rentals: ["boat", "paddleboard", "scooter", "bike"],
    featured: true,
  },
  { slug: "wedding", minGuests: 20, minNights: 2, rentals: ["boat", "car"] },
  { slug: "holiday", minGuests: 10, minNights: 6, rentals: ["paddleboard", "bike", "motorcycle"] },
  { slug: "school", minGuests: 20, minNights: 3, rentals: ["paddleboard", "bike"] },
  { slug: "camp", minGuests: 25, minNights: 6, rentals: ["boat", "paddleboard", "bike"] },
];

/** Segmenty, které vozí i nedospělé účastníky — potřebují dohodu navíc. */
export const supervisedSegments: SegmentKey[] = ["school", "camp"];

/** Poptávky nesou segment jako slug, takže se hodí ověřit, že ho ještě známe. */
export function isSegmentKey(value: string): value is SegmentKey {
  return (segments as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Půjčovna
// ---------------------------------------------------------------------------

export const rentals = ["boat", "paddleboard", "scooter", "bike", "motorcycle", "car"] as const;
export type RentalKey = (typeof rentals)[number];

export interface RentalItem {
  slug: RentalKey;
  /** Kolik kusů máme k dispozici. */
  fleet: number;
  /** Cena za kus a den. */
  pricePerDay: number;
  /** Vratná kauce za kus; u drobné techniky ji nebereme. */
  deposit?: number;
  /** Skupina řidičského oprávnění, nebo `vmp` pro vůdce malého plavidla. */
  licence?: "A" | "B" | "vmp";
  /** Minimální věk řidiče. */
  minAge?: number;
}

/**
 * ORIENTAČNÍ CENÍK — před spuštěním potvrďte s provozem.
 * Ceny jsou v korunách za kus a den, stejně jako `rates` níže; halíře
 * se používají až ve folio položkách přístupového systému.
 */
export const rentalItems: RentalItem[] = [
  { slug: "boat", fleet: 1, pricePerDay: 3_500, deposit: 10_000, licence: "vmp", minAge: 18 },
  { slug: "paddleboard", fleet: 6, pricePerDay: 450 },
  { slug: "scooter", fleet: 8, pricePerDay: 390 },
  { slug: "bike", fleet: 6, pricePerDay: 590 },
  { slug: "motorcycle", fleet: 2, pricePerDay: 1_900, deposit: 15_000, licence: "A", minAge: 21 },
  { slug: "car", fleet: 2, pricePerDay: 1_500, deposit: 10_000, licence: "B", minAge: 21 },
];

export const rentalBySlug: Record<RentalKey, RentalItem> = Object.fromEntries(
  rentalItems.map((item) => [item.slug, item]),
) as Record<RentalKey, RentalItem>;

/**
 * Programové balíčky — půjčovna poskládaná do půldne nebo dne, s cenou
 * za osobu. Firmy nekupují kusy techniky, kupují hotový program, který
 * si nemusí nikdo z nich organizovat.
 */
export const rentalPackages = ["water", "ride", "grandTour"] as const;
export type RentalPackageKey = (typeof rentalPackages)[number];

export interface RentalPackage {
  slug: RentalPackageKey;
  /** Cena za osobu. */
  perPerson: number;
  minGuests: number;
  hours: number;
  includes: RentalKey[];
}

export const rentalPackageList: RentalPackage[] = [
  { slug: "water", perPerson: 690, minGuests: 10, hours: 4, includes: ["boat", "paddleboard"] },
  { slug: "ride", perPerson: 590, minGuests: 10, hours: 4, includes: ["scooter", "bike"] },
  {
    slug: "grandTour",
    perPerson: 1_290,
    minGuests: 15,
    hours: 8,
    includes: ["boat", "paddleboard", "scooter", "bike"],
  },
];

// ---------------------------------------------------------------------------
// Okolí
// ---------------------------------------------------------------------------

/** Restaurace v okruhu 800 m — vlastní jména, nepřekládají se. */
export const nearbyDining = [
  "Hostinec U Helánů",
  "Restaurace U Ševčíků",
  "Hotel Atlantis",
  "Maximus Resort",
  "Restaurace Princezna",
] as const;

// ---------------------------------------------------------------------------
// Fotografie
// ---------------------------------------------------------------------------

export interface Photo {
  src: string;
  width: number;
  height: number;
  /** Klíč popisku ve slovníku (photos.alt). */
  alt: PhotoAltKey;
}

export type PhotoAltKey = "exterior" | "pool" | "sauna" | "bathroom";

export const photos: Record<PhotoAltKey, Photo> = {
  exterior: { src: "/photos/citadela-exterier.jpg", width: 1183, height: 720, alt: "exterior" },
  pool: { src: "/photos/citadela-bazen.jpg", width: 1280, height: 853, alt: "pool" },
  sauna: { src: "/photos/citadela-sauna.jpg", width: 1280, height: 853, alt: "sauna" },
  bathroom: { src: "/photos/citadela-koupelna-stribrny.jpg", width: 1280, height: 853, alt: "bathroom" },
};

/** Pořadí ve fotogalerii. */
export const galleryPhotos: Photo[] = [photos.exterior, photos.pool, photos.sauna, photos.bathroom];

/** Fotky přiřazené ložnicím; ostatní použijí generovanou grafiku. */
export const bedroomPhotos: Partial<Record<BedroomSlug, Photo>> = {
  silver: photos.bathroom,
};

export const sectionIds = ["groups", "rooms", "wellness", "facilities", "rentals", "pricing", "contact"] as const;
export type SectionId = (typeof sectionIds)[number];

/**
 * ZÁSTUPNÁ DATA — nahraďte skutečnými recenzemi z Booking.com.
 * Nejsou to reálné výroky hostů; slouží jen k sestavení rozvržení.
 */
export const sampleReviews: { quote: string; author: string; date: string; score: number }[] = [
  { quote: "…", author: "—", date: "2026-05-01", score: 10 },
  { quote: "…", author: "—", date: "2026-04-18", score: 9 },
  { quote: "…", author: "—", date: "2026-04-02", score: 10 },
];

/** Přepněte na true, až budou v sampleReviews skutečné recenze. */
export const reviewsArePublishable = false;
