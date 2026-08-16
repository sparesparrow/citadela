/**
 * Podmínky půjčovny. Dvě věci, na kterých záleží: sazebník na stránce se
 * bere ze stejných dat jako ceník, a dokud není sjednané pojištění, stránka
 * se hlásí jako pracovní verze a nesmí tvrdit spoluúčast, kterou nikdo nezná.
 */

import { rentalItems, rentalTerms, rentalTermsArePublishable } from "../../src/lib/site";

describe("Podminky pujcovny", () => {
  beforeEach(() => {
    cy.visit("/cs/rental-terms");
  });

  it("je dostupna z pujcovny i ze zapati", () => {
    cy.visit("/cs");
    cy.get("footer a[href='/cs/rental-terms']").should("exist");
    cy.get("a[href='/cs/rental-terms']").first().click();
    cy.location("pathname").should("eq", "/cs/rental-terms");
  });

  it("nese verzi, kterou se razitkuji zapujcky", () => {
    cy.contains(`Verze ${rentalTerms.version}`).should("exist");
  });

  it("vypisuje pozadavky pro kazdy kus techniky", () => {
    cy.get("table tbody tr").should("have.length", rentalItems.length);
    cy.contains("tr", "Motorový člun").should("contain", "Průkaz VMP");
    cy.contains("tr", "Motorky").should("contain", "21");
  });

  it("bez sjednaneho pojisteni se hlasi jako pracovni verze", () => {
    if (rentalTermsArePublishable) {
      cy.contains("Pracovní verze").should("not.exist");
      return;
    }
    cy.contains("Pracovní verze").should("be.visible");
    cy.contains("Pojištění se sjednává").should("be.visible");
    cy.contains("spoluúčast").should("exist");
  });

  it("vyhledavace ji nemaji indexovat, dokud neplati", () => {
    cy.get("head meta[name='robots']").should("have.attr", "content").and("contain", "noindex");
  });

  it("existuje i anglicky", () => {
    cy.visit("/en/rental-terms");
    cy.contains("Rental terms").should("exist");
    cy.get("table tbody tr").should("have.length", rentalItems.length);
  });
});
