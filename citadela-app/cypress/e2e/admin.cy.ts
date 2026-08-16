/**
 * Správa poptávek. Data pochází z demo seedu:
 * SEED_DEMO_ACCESS=1 npm run db:seed
 *
 * Testuje se to, co provoz při ranním otevření potřebuje poznat na první
 * pohled: kdo píše, jestli chce fakturu a jestli pobyt poběží s dozorem.
 */

describe("Sprava poptavek", () => {
  it("bez prihlaseni se na spravu nedostane", () => {
    cy.visit("/cs/admin", { failOnStatusCode: false });
    cy.location("pathname").should("contain", "/login");
  });

  describe("prihlaseny personal", () => {
    beforeEach(() => {
      cy.signInAsStaff();
      cy.visit("/cs/admin");
    });

    it("ukazuje pocet firemnich poptavek", () => {
      cy.contains("dt", "Firemních poptávek")
        .siblings("dd")
        .invoke("text")
        .then((text) => expect(Number(text)).to.be.greaterThan(0));
    });

    it("u firemni poptavky vypisuje firmu, ICO i DIC", () => {
      cy.contains("tr", "Jana Nováková").within(() => {
        cy.contains("Firemní teambuilding").should("exist");
        cy.contains("Demo Firma s.r.o.").should("exist");
        cy.contains("IČO 12345678").should("exist");
        cy.contains("DIČ CZ12345678").should("exist");
      });
    });

    it("u firemni poptavky vypisuje zajem o pujcovnu", () => {
      cy.contains("tr", "Jana Nováková").should("contain", "Motorový člun");
    });

    it("skolni poptavka nese rezim s dozorem a pocet osob", () => {
      cy.contains("tr", "ZŠ Rozdrojovice").within(() => {
        cy.contains("Provoz s dozorem").should("exist");
        cy.contains("4 osoby dozoru").should("exist");
      });
    });

    it("soukroma poptavka bez segmentu se hlasi jako neco jineho", () => {
      cy.contains("tr", "Petr Novák").should("contain", "Něco jiného");
    });

    it("anglicka verze spravy ukazuje tytez radky", () => {
      cy.visit("/en/admin");
      cy.contains("tr", "ZŠ Rozdrojovice").should("contain", "Supervised mode");
    });
  });
});
