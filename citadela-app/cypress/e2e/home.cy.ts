/**
 * Hlavní stránka: sekce skupinové nabídky, flotila a odkazy na Booking.com.
 *
 * Počty se schválně porovnávají s čísly ze site.ts — kdyby někdo přidal
 * segment nebo kus techniky a zapomněl překlad, sekce se vykreslí prázdná
 * a typecheck to nechytí.
 */

import { segmentList, rentalItems, rentalPackageList } from "../../src/lib/site";

describe("Hlavni stranka", () => {
  beforeEach(() => {
    cy.visit("/cs");
  });

  it("presmeruje z korene na jazykovou variantu", () => {
    cy.visit("/");
    cy.location("pathname").should("match", /^\/(cs|en)$/);
  });

  it("ma sekce skupin, firem a pujcovny", () => {
    cy.get("#groups").should("exist");
    cy.get("#corporate").should("exist");
    cy.get("#rentals").should("exist");
    cy.get(".subnav a[href='#groups']").should("exist");
    cy.get(".subnav a[href='#rentals']").should("exist");
  });

  it("vypise vsechny segmenty ze site.ts", () => {
    cy.get("#groups .segment").should("have.length", segmentList.length);
    cy.get("#groups .segment-featured").should("have.length", 1);
  });

  it("skolni vylety a tabory nesou znacku rezimu s dozorem", () => {
    cy.get("#groups .segment-mode").should("have.length", 2);
    cy.get("#groups").should("contain", "Provoz s dozorem");
  });

  it("flotila ma radek pro kazdy kus techniky a kazdy s cenou", () => {
    cy.get(".fleet-table tbody tr").should("have.length", rentalItems.length);
    cy.get(".fleet-table tbody tr").each((row) => {
      cy.wrap(row).find("td").eq(2).should("contain", "Kč");
    });
  });

  it("programove balicky maji cenu za osobu", () => {
    cy.get("#rentals").next().find(".rate").should("have.length", rentalPackageList.length);
  });

  it("dum se nepoutava vekem hostu, ale vyhradnosti", () => {
    cy.get(".facilities").should("contain", "Vždy jen jedna společnost v celém objektu");
    cy.contains("Zařízeno pro dospělé hosty").should("not.exist");
  });

  it("odkazy na Booking.com miri na ID objektu", () => {
    cy.get("a[href*='booking.com']")
      .first()
      .should("have.attr", "href")
      .and("contain", "dest_id=17085726")
      .and("contain", "dest_type=hotel");
  });

  it("strukturovana data odkazuji na profil na Booking.com", () => {
    cy.get("script[type='application/ld+json']").then((script) => {
      const data = JSON.parse(script.text()) as { sameAs?: string[] };
      expect(data.sameAs?.[0]).to.contain("17085726");
    });
  });

  it("v anglicke verzi je stejna struktura", () => {
    cy.visit("/en");
    cy.get("#groups .segment").should("have.length", segmentList.length);
    cy.get(".fleet-table tbody tr").should("have.length", rentalItems.length);
    cy.get(".facilities").should("contain", "One party in the house, always");
  });
});
