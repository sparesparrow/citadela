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

/** Storno podmínky — dny před nástupem a podíl z ceny. */
export const cancellationTiers = [
  { withinDays: 91, percent: 10 },
  { withinDays: 61, percent: 50 },
  { withinDays: 60, percent: 70 },
  { withinDays: 29, percent: 100 },
] as const;

// ---------------------------------------------------------------------------
// Půjčovna
// ---------------------------------------------------------------------------

export const rentals = ["scooter", "chopper"] as const;
export type RentalKey = (typeof rentals)[number];

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

export const sectionIds = ["rooms", "wellness", "facilities", "pricing", "contact"] as const;
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
