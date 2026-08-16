import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getDictionary, isLocale, formatPrice, type Locale } from "@/lib/i18n";
import { bookingUrl, bookingReviewsUrl } from "@/lib/booking";
import {
  site,
  bedrooms,
  amenityKeys,
  amenityIcons,
  highlightAmenities,
  rates,
  pricing,
  cancellationTiers,
  stayLengthTiers,
  groupPricing,
  segmentList,
  supervisedSegments,
  houseModes,
  houseModeRules,
  rentals,
  rentalItems,
  rentalPackageList,
  nearbyDining,
  bookingScore,
  sampleReviews,
  reviewsArePublishable,
  photos,
  galleryPhotos,
  bedroomPhotos,
} from "@/lib/site";
import { nightlyRate, packagePrice } from "@/lib/quote";
import { AmenityIcon, CheckIcon } from "@/components/Icons";
import { CitadelaMark } from "@/components/Brand";
import { ScooterPlate, RoomPlate } from "@/components/Art";
import { Gallery } from "@/components/Gallery";
import { ReserveForm } from "@/components/ReserveForm";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const dict = await getDictionary(locale);
  const session = await auth();
  const book = (extra: Parameters<typeof bookingUrl>[0] = {}) => bookingUrl({ locale, ...extra });
  const money = (n: number) => formatPrice(n, locale);

  // Formulář je klientská komponenta, takže mu nesmíme poslat funkce.
  // Obě proto rozbalíme tady a do props posíláme jen hotové řetězce —
  // `guestsOption` a `tooManyGuests` musí ze spreadu skutečně zmizet,
  // samotný typ Omit<> by je za běhu propustil dál.
  const { guestsOption, tooManyGuests, ...reserveFormText } = dict.reserve.form;
  const reserveLabels = {
    ...reserveFormText,
    guestsOptions: Array.from({ length: site.maxGuests }, (_, i) => guestsOption(i + 1)),
    tooManyGuests: tooManyGuests(site.maxGuests),
  };

  // Číselníky do formuláře — hodnoty jsou slugy ze site.ts, popisky ze slovníku.
  const occasions = [
    ...segmentList.map((segment) => ({ value: segment.slug, label: dict.groups.items[segment.slug].name })),
    { value: "other", label: dict.reserve.form.occasionOther },
  ];
  const rentalOptions = rentals.map((key) => ({ value: key, label: dict.rentals.items[key].name }));

  // Pravidla provozu s dozorem vyhodnotíme na serveru — slovník obsahuje
  // funkce a klientská komponenta si je předat nedá.
  const supervisedRules = [
    dict.groups.modes.rules.supervisors,
    dict.groups.modes.rules.timetable,
    dict.groups.modes.rules.locked(
      houseModeRules.supervised.lockedAmenities.map((key) => dict.facilities.items[key]).join(", "),
    ),
    dict.groups.modes.rules.deposit(money(houseModeRules.supervised.deposit)),
  ];

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${site.geo.lng - 0.02}%2C${
    site.geo.lat - 0.012
  }%2C${site.geo.lng + 0.02}%2C${site.geo.lat + 0.012}&layer=mapnik&marker=${site.geo.lat}%2C${site.geo.lng}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: site.name,
    description: dict.meta.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.street,
      addressLocality: site.city,
      postalCode: site.postalCode,
      addressRegion: site.region,
      addressCountry: site.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
    email: site.email,
    telephone: site.phone,
    checkinTime: site.checkIn,
    checkoutTime: site.checkOut,
    numberOfBedrooms: site.bedroomCount,
    occupancy: { "@type": "QuantitativeValue", maxValue: site.maxGuests, unitText: "guests" },
    petsAllowed: false,
    smokingAllowed: false,
    amenityFeature: amenityKeys.map((key) => ({
      "@type": "LocationFeatureSpecification",
      name: dict.facilities.items[key],
      value: true,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ---------------- HERO ---------------- */}
      <section className="hero" data-photo="true">
        <div className="hero-scene">
          <Image
            src={photos.exterior.src}
            alt={dict.photos.exterior}
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="hero-inner">
          <p className="hero-place">{dict.hero.place}</p>
          <p className="logotype">CITADELA</p>
          <p className="logo-sub">RESORT</p>
          <h1>{dict.hero.headline}</h1>
          <p className="hero-sub">{dict.hero.sub}</p>
          <ul className="hero-stats">
            <li>{dict.hero.stats.guests}</li>
            <li>{dict.hero.stats.bedrooms}</li>
            <li>{dict.hero.stats.pool}</li>
          </ul>
          <div className="cta-row">
            <a className="btn btn-solid" href={book()} target="_blank" rel="noopener noreferrer">
              <span>{dict.hero.primary}</span>
            </a>
            <a className="btn" href="#rooms">
              <span>{dict.hero.secondary}</span>
            </a>
          </div>
          <div className="divider-dot">
            <span />
          </div>
        </div>
      </section>

      {/* ---------------- STICKY SEKČNÍ NAVIGACE ---------------- */}
      <nav className="subnav" aria-label={dict.nav.menu}>
        <div className="subnav-inner">
          <a href="#groups">{dict.nav.groups}</a>
          <a href="#rooms">{dict.nav.rooms}</a>
          <a href="#wellness">{dict.nav.wellness}</a>
          <a href="#facilities">{dict.nav.facilities}</a>
          <a href="#rentals">{dict.nav.rentals}</a>
          <a href="#pricing">{dict.nav.pricing}</a>
          <a href="#contact">{dict.nav.contact}</a>
        </div>
      </nav>

      <main id="main">
        {/* ---------------- ODZNAKY ---------------- */}
        <div className="badges">
          {highlightAmenities.map((key) => (
            <div className="badge" key={key}>
              <AmenityIcon name={amenityIcons[key] ?? key} />
              <span>{dict.facilities.items[key]}</span>
            </div>
          ))}
        </div>

        {/* ---------------- O DOMĚ ---------------- */}
        <section className="section">
          <div className="feature reveal" style={{ borderTop: 0 }}>
            <div className="feature-copy">
              <p className="eyebrow">{dict.about.eyebrow}</p>
              <h2>{dict.about.heading}</h2>
              <p className="lead">{dict.about.body}</p>
              <p className="lead">{dict.about.body2}</p>
              <p className="fine-note">{dict.about.adultNote}</p>
            </div>
            <div className="plate">
              <Image
                src={photos.pool.src}
                alt={dict.photos.pool}
                width={photos.pool.width}
                height={photos.pool.height}
                sizes="(max-width: 900px) 92vw, 46vw"
              />
              <span className="corner corner-tl" />
              <span className="corner corner-tr" />
              <span className="corner corner-bl" />
              <span className="corner corner-br" />
            </div>
          </div>

          {/* Popisky vyhodnotime tady na serveru — slovnik obsahuje
              funkce, ktere se na klienta poslat nedaji. */}
          <Gallery
            photos={galleryPhotos}
            labels={{
              gallery: dict.common.gallery,
              previous: dict.common.previous,
              next: dict.common.next,
              close: dict.common.close,
              captions: galleryPhotos.map((photo) => dict.photos[photo.alt]),
              counter: dict.common.imageOf("{i}", "{n}"),
            }}
          />
        </section>

        {/* ---------------- HODNOTY ---------------- */}
        <section className="section reveal">
          <p className="eyebrow">{dict.values.eyebrow}</p>
          <h2>{dict.values.heading}</h2>
          <div className="values">
            {dict.values.items.map((item) => (
              <article className="value" key={item.num}>
                <p className="value-num">{item.num}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------------- SKUPINY ---------------- */}
        <section className="section reveal" id="groups">
          <p className="eyebrow">{dict.groups.eyebrow}</p>
          <h2>{dict.groups.heading}</h2>
          <p className="lead">{dict.groups.lead}</p>

          <div className="segments">
            {segmentList.map((segment) => {
              const text = dict.groups.items[segment.slug];
              return (
                <article
                  className={`segment${segment.featured ? " segment-featured" : ""}`}
                  key={segment.slug}
                >
                  <h3>{text.name}</h3>
                  <p className="segment-facts">
                    <span>{dict.groups.minGuests(segment.minGuests)}</span>
                    <span>{dict.groups.minNights(segment.minNights)}</span>
                    {supervisedSegments.includes(segment.slug) && (
                      <span className="segment-mode">{dict.groups.modes.items.supervised.name}</span>
                    )}
                  </p>
                  <p>{text.body}</p>
                  <p className="segment-rentals-label">{dict.groups.rentalsLabel}</p>
                  <ul className="segment-rentals">
                    {segment.rentals.map((key) => (
                      <li key={key}>
                        <AmenityIcon name={key} size={16} />
                        <span>{dict.rentals.items[key].name}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          {/* Režimy domu — pravidlo, ne věta v textu. Seznam pro provoz
              s dozorem se skládá ze site.ts, ať se text nerozejde s tím,
              podle čeho se pobyt doopravdy domlouvá. */}
          <div className="modes">
            <h3 className="terms-heading">{dict.groups.modes.heading}</h3>
            <p className="lead">{dict.groups.modes.lead}</p>
            <div className="mini-grid">
              {houseModes.map((mode) => {
                const rules = houseModeRules[mode];
                const text = dict.groups.modes.items[mode];
                return (
                  <div className="mini" key={mode}>
                    <h3>{text.name}</h3>
                    <p>{text.body}</p>
                    {mode === "supervised" && (
                      <ul className="terms">
                        {rules.requiresSupervisors && <li>{dict.groups.modes.rules.supervisors}</li>}
                        {rules.timetabledWellness && <li>{dict.groups.modes.rules.timetable}</li>}
                        {rules.lockedAmenities.length > 0 && (
                          <li>
                            {dict.groups.modes.rules.locked(
                              rules.lockedAmenities.map((key) => dict.facilities.items[key]).join(", "),
                            )}
                          </li>
                        )}
                        <li>{dict.groups.modes.rules.deposit(money(rules.deposit))}</li>
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <a className="btn" href="#contact" style={{ marginTop: 28 }}>
            <span>{dict.groups.cta}</span>
          </a>
        </section>

        {/* ---------------- FIRMY ---------------- */}
        <section className="section reveal" id="corporate">
          <p className="eyebrow">{dict.corporate.eyebrow}</p>
          <h2>{dict.corporate.heading}</h2>
          <p className="lead">{dict.corporate.lead}</p>

          <div className="terms-grid">
            <div className="mini-grid">
              {dict.corporate.points.map((point) => (
                <div className="mini" key={point.title}>
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 className="terms-heading">{dict.corporate.termsHeading}</h3>
              <ul className="terms">
                <li>{dict.corporate.terms.quote(groupPricing.quoteWithinHours)}</li>
                <li>{dict.corporate.terms.invoice(groupPricing.invoiceDueDays)}</li>
                <li>{dict.corporate.terms.identifiers}</li>
                <li>{dict.corporate.terms.advance(groupPricing.corporateAdvancePercent)}</li>
                <li>
                  {dict.corporate.terms.minimum(groupPricing.minNights, segmentList[0].minGuests)}
                </li>
                <li>{dict.corporate.terms.changes}</li>
              </ul>
              <a className="btn btn-solid" href="#contact" style={{ marginTop: 28 }}>
                <span>{dict.corporate.cta}</span>
              </a>
            </div>
          </div>
        </section>

        {/* ---------------- LOŽNICE ---------------- */}
        <section className="section reveal" id="rooms">
          <p className="eyebrow">{dict.bedrooms.eyebrow}</p>
          <h2>{dict.bedrooms.heading}</h2>
          <p className="lead">{dict.bedrooms.lead}</p>

          <div className="rooms">
            {bedrooms.map((room, i) => {
              const text = dict.bedrooms.items[room.slug];
              const photo = bedroomPhotos[room.slug];
              return (
                <article className="room" key={room.slug}>
                  <div className="room-media">
                    {photo ? (
                      <Image
                        src={photo.src}
                        alt={dict.photos[photo.alt]}
                        width={photo.width}
                        height={photo.height}
                        sizes="(max-width: 900px) 92vw, 30vw"
                        loading="lazy"
                      />
                    ) : (
                      <RoomPlate variant={i % 3} />
                    )}
                  </div>
                  <div className="room-body">
                    <h3>{text.name}</h3>
                    <p className="room-facts">
                      <span>
                        {room.capacityMax
                          ? dict.bedrooms.sleepsRange(room.capacity, room.capacityMax)
                          : dict.bedrooms.sleeps(room.capacity)}
                      </span>
                      <span>{dict.bedrooms.bathroom[room.bathroom]}</span>
                    </p>
                    <p>{text.body}</p>
                    <ul className="room-amenities">
                      {room.features.map((key) => (
                        <li key={key}>{dict.bedrooms.features[key]}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------------- WELLNESS ---------------- */}
        <section className="section section-tight" id="wellness">
          <div className="feature feature-flip reveal">
            <div className="feature-copy">
              <p className="eyebrow">{dict.wellness.eyebrow}</p>
              <h2>{dict.wellness.heading}</h2>
              <p className="lead">{dict.wellness.lead}</p>
              <ul className="tags">
                {dict.wellness.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
            <div className="plate">
              <Image
                src={photos.sauna.src}
                alt={dict.photos.sauna}
                width={photos.sauna.width}
                height={photos.sauna.height}
                sizes="(max-width: 900px) 92vw, 46vw"
              />
              <span className="corner corner-tl" />
              <span className="corner corner-tr" />
              <span className="corner corner-bl" />
              <span className="corner corner-br" />
            </div>
          </div>
        </section>

        {/* ---------------- VYBAVENÍ ---------------- */}
        <section className="section reveal" id="facilities">
          <p className="eyebrow">{dict.facilities.eyebrow}</p>
          <h2>{dict.facilities.heading}</h2>
          <p className="lead">{dict.facilities.lead}</p>
          <ul className="facilities">
            {amenityKeys.map((key) => (
              <li key={key}>
                {amenityIcons[key] ? <AmenityIcon name={amenityIcons[key]!} size={18} /> : <CheckIcon />}
                <span>{dict.facilities.items[key]}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------- PŮJČOVNA ---------------- */}
        <section className="section section-tight" id="rentals">
          <div className="feature reveal">
            <div className="feature-copy">
              <p className="eyebrow">{dict.rentals.eyebrow}</p>
              <h2>{dict.rentals.heading}</h2>
              <p className="lead">{dict.rentals.lead}</p>
              <div className="mini-grid">
                {rentals.map((key) => (
                  <div className="mini" key={key}>
                    <AmenityIcon name={key} size={28} />
                    <h3>{dict.rentals.items[key].name}</h3>
                    <p>{dict.rentals.items[key].body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="plate">
              <ScooterPlate />
              <span className="corner corner-tl" />
              <span className="corner corner-tr" />
              <span className="corner corner-bl" />
              <span className="corner corner-br" />
            </div>
          </div>
        </section>

        {/* ---------------- FLOTILA A BALÍČKY ---------------- */}
        <section className="section reveal">
          <h3 className="terms-heading">{dict.rentals.fleetHeading}</h3>
          <div className="table-wrap fleet-table">
            <table>
              <caption className="visually-hidden">{dict.rentals.fleetHeading}</caption>
              <thead>
                <tr>
                  <th scope="col">{dict.rentals.columns.item}</th>
                  <th scope="col">{dict.rentals.columns.fleet}</th>
                  <th scope="col">{dict.rentals.columns.perDay}</th>
                  <th scope="col">{dict.rentals.columns.deposit}</th>
                  <th scope="col">{dict.rentals.columns.licence}</th>
                </tr>
              </thead>
              <tbody>
                {rentalItems.map((item) => (
                  <tr key={item.slug}>
                    <td>
                      <span className="fleet-name">
                        <AmenityIcon name={item.slug} size={18} />
                        {dict.rentals.items[item.slug].name}
                      </span>
                    </td>
                    <td className="num">{item.fleet}</td>
                    <td className="num">{money(item.pricePerDay)}</td>
                    <td className="num">{item.deposit ? money(item.deposit) : dict.rentals.noDeposit}</td>
                    <td>
                      {item.licence ? dict.rentals.licences[item.licence] : dict.rentals.licences.none}
                      {item.minAge ? ` · ${dict.rentals.minAge(item.minAge)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="terms-heading" style={{ marginTop: 52 }}>
            {dict.rentals.packagesHeading}
          </h3>
          <p className="lead">{dict.rentals.packagesLead}</p>
          <div className="rate-grid">
            {rentalPackageList.map((pack) => (
              <article className="rate" key={pack.slug}>
                <h3>{dict.rentals.packages[pack.slug].name}</h3>
                <p className="rate-note">{dict.rentals.packageMeta(pack.hours, pack.minGuests)}</p>
                <p className="rate-price">{money(pack.perPerson)}</p>
                <p className="rate-meta">{dict.rentals.perPerson}</p>
                <p className="rate-meta">
                  {/* Cena za nejmensi skupinu, aby bylo videt, s cim se pocita. */}
                  {money(packagePrice(pack.perPerson, pack.minGuests, pack.minGuests))} ·{" "}
                  {dict.groups.minGuests(pack.minGuests)}
                </p>
                <ul className="segment-rentals">
                  {pack.includes.map((key) => (
                    <li key={key}>
                      <AmenityIcon name={key} size={16} />
                      <span>{dict.rentals.items[key].name}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="fine-note">{dict.rentals.note}</p>
        </section>

        {/* ---------------- CENÍK ---------------- */}
        <section className="section reveal" id="pricing">
          <p className="eyebrow">{dict.pricing.eyebrow}</p>
          <h2>{dict.pricing.heading}</h2>
          <p className="lead">{dict.pricing.lead}</p>

          <div className="rate-grid">
            {rates.map((rate) => (
              <article className={`rate${rate.featured ? " rate-featured" : ""}`} key={rate.slug}>
                <h3>{dict.pricing.rates[rate.slug].name}</h3>
                <p className="rate-note">{dict.pricing.rates[rate.slug].note}</p>
                <p className="rate-price">{money(rate.price)}</p>
                <p className="rate-meta">
                  {dict.pricing.nights(rate.nights)} · {dict.pricing.perStay}
                </p>
              </article>
            ))}
          </div>

          <p className="rate-caption">
            {dict.pricing.includedGuests(pricing.includedGuests)} ·{" "}
            {dict.pricing.extraGuest(money(pricing.extraGuestPerNight))}
          </p>

          {/* Skupinové slevy — hlavní argument pro delší a mimovíkendové pobyty.
              Pásma se vypisují vzestupně, jak je host čte; v site.ts jsou
              sestupně, protože se v nich hledá první vyhovující. */}
          <div className="group-rates">
            <h3 className="terms-heading">{dict.pricing.group.heading}</h3>
            <p className="lead">{dict.pricing.group.lead}</p>
            <p className="rate-caption">{dict.pricing.group.nightlyFrom(money(nightlyRate()))}</p>
            <ul className="terms">
              {[...stayLengthTiers]
                .sort((a, b) => a.minNights - b.minNights)
                .map((tier) => (
                  <li key={tier.minNights}>
                    {dict.pricing.group.stayLengthRow(tier.minNights, tier.percent)}
                  </li>
                ))}
              <li>{dict.pricing.group.midweekRow(groupPricing.midweekPercent)}</li>
              <li>{dict.pricing.group.maxRow(groupPricing.maxDiscountPercent)}</li>
            </ul>
            <p className="fine-note">{dict.pricing.group.quoteNote}</p>
          </div>

          <div className="terms-grid">
            <div>
              <h3 className="terms-heading">{dict.pricing.termsHeading}</h3>
              <ul className="terms">
                <li>{dict.pricing.terms.deposit(money(pricing.deposit))}</li>
                <li>{dict.pricing.terms.advance(pricing.advancePercent)}</li>
                <li>{dict.pricing.terms.touristTax(money(pricing.touristTaxPerAdultNight))}</li>
                <li>{dict.pricing.terms.checkInOut(site.checkIn, site.checkOut)}</li>
                <li>{dict.pricing.terms.season}</li>
                <li>{dict.pricing.terms.flexible}</li>
                <li>{dict.pricing.terms.capacity(site.maxGuests)}</li>
                <li>{dict.pricing.terms.parking}</li>
                <li>{dict.pricing.terms.pets}</li>
                <li>{dict.pricing.terms.energy}</li>
                <li>{dict.pricing.terms.cleaning(money(pricing.cleaningPenalty))}</li>
              </ul>
            </div>
            <div>
              <h3 className="terms-heading">{dict.pricing.cancellationHeading}</h3>
              <ul className="terms">
                {cancellationTiers.map((tier) => (
                  <li key={tier.withinDays}>{dict.pricing.cancellationRow(tier.withinDays, tier.percent)}</li>
                ))}
              </ul>
              <p className="fine-note">{dict.pricing.substitute}</p>
            </div>
          </div>
        </section>

        {/* ---------------- STŮL ---------------- */}
        <section className="section reveal">
          <p className="eyebrow">{dict.dining.eyebrow}</p>
          <h2>{dict.dining.heading}</h2>
          <div className="location-grid">
            <div>
              <p className="lead">{dict.dining.lead}</p>
              <p className="fine-note">
                <strong>{dict.dining.shopsHeading}:</strong> {dict.dining.shops}
              </p>
            </div>
            <div>
              <h3 className="terms-heading">{dict.dining.nearbyHeading}</h3>
              <ul className="distances">
                {nearbyDining.map((name) => (
                  <li key={name}>
                    <span>{name}</span>
                    <span>800 m</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------- RECENZE ---------------- */}
        <section className="section reveal" id="reviews">
          <p className="eyebrow">{dict.reviews.eyebrow}</p>
          <h2>{dict.reviews.heading}</h2>

          <div className="score">
            <p className="score-badge">{bookingScore.score.toLocaleString(locale === "cs" ? "cs-CZ" : "en-GB")}</p>
            <div>
              <p className="score-label">{dict.reviews.scoreLabel}</p>
              <p className="score-count">{dict.reviews.reviewCount(bookingScore.reviewCount)}</p>
              <a href={bookingReviewsUrl()} target="_blank" rel="noopener noreferrer">
                {dict.reviews.readAll}
              </a>
            </div>
          </div>

          {/* Citace se zveřejní teprve tehdy, až budou v site.ts skutečné recenze. */}
          {reviewsArePublishable && (
            <div className="review-strip">
              {sampleReviews.map((review, i) => (
                <figure className="review" key={i}>
                  <p className="review-stars" aria-label={`${review.score} / 10`}>
                    ★★★★★
                  </p>
                  <blockquote className="review-quote">{review.quote}</blockquote>
                  <figcaption className="review-meta">
                    {review.author} · {new Date(review.date).toLocaleDateString(locale === "cs" ? "cs-CZ" : "en-GB")}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <p className="fine-note">{dict.reviews.source}</p>
        </section>

        {/* ---------------- POLOHA ---------------- */}
        <section className="section reveal">
          <p className="eyebrow">{dict.location.eyebrow}</p>
          <h2>{dict.location.heading}</h2>
          <div className="location-grid">
            <div>
              <p className="lead">{dict.location.lead}</p>
              <ul className="distances">
                {dict.location.distances.map((d) => (
                  <li key={d.label}>
                    <span>{d.label}</span>
                    <span>{d.value}</span>
                  </li>
                ))}
              </ul>
              <a
                className="btn"
                href={`https://www.openstreetmap.org/?mlat=${site.geo.lat}&mlon=${site.geo.lng}#map=16/${site.geo.lat}/${site.geo.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 28 }}
              >
                <span>{dict.location.openMap}</span>
              </a>
            </div>
            <div className="map-frame">
              <iframe
                src={mapSrc}
                title={dict.location.heading}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <p className="lead" style={{ marginTop: 40 }}>
            <strong style={{ color: "var(--gold-hi)" }}>{dict.activities.heading}</strong>
            <br />
            {dict.activities.lead}
          </p>
        </section>

        {/* ---------------- POPTÁVKA ---------------- */}
        <section className="section reveal" id="contact">
          <p className="eyebrow eyebrow-center">{dict.reserve.eyebrow}</p>
          <h2 className="h2-center">{dict.reserve.heading}</h2>
          <p className="lead lead-center">{dict.reserve.lead}</p>

          <div className="reserve-split">
            <div className="reserve-card">
              <h3>Booking.com</h3>
              <p className="reserve-note">{dict.reserve.bookingNote}</p>
              <a
                className="btn btn-solid btn-block"
                href={book()}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 24 }}
              >
                <span>{dict.reserve.bookingCta}</span>
              </a>
              <p className="reserve-note" style={{ marginTop: 22 }}>
                <a href={`mailto:${site.email}`}>{site.email}</a>
                <br />
                <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
                <br />
                {site.street}, {site.postalCode} {site.city}
              </p>
            </div>

            <ReserveForm
              labels={reserveLabels}
              locale={locale}
              maxGuests={site.maxGuests}
              occasions={occasions}
              rentalOptions={rentalOptions}
              invoiceSegment="corporate"
              supervisedOccasions={[...supervisedSegments]}
              supervisedRules={supervisedRules}
              signedInEmail={session?.user?.email ?? null}
              signedInName={session?.user?.name ?? null}
            />
          </div>
        </section>
      </main>

      {/* ---------------- ZÁPATÍ ---------------- */}
      <footer className="footer">
        <div className="footer-mark">
          <CitadelaMark size={60} />
        </div>
        <p className="footer-wm">CITADELA</p>
        <p className="footer-sub">RESORT</p>
        <p className="footer-meta">
          {site.street} · {site.postalCode} {site.city} · {dict.hero.place}
        </p>
        <p className="footer-meta">
          <a href={`mailto:${site.email}`}>{site.email}</a> &nbsp;·&nbsp;{" "}
          <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
        </p>
        <p className="footer-times">
          <span>
            {dict.footer.checkIn} {site.checkIn}
          </span>
          <span>
            {dict.footer.checkOut} {site.checkOut}
          </span>
        </p>
        <p className="footer-signoff">{dict.footer.signoff}</p>
        <p className="footer-legal">
          © {new Date().getFullYear()} {site.legalName}. {dict.footer.rights}
        </p>
      </footer>
    </>
  );
}
