/**
 * Poptávkový formulář — nová pole a to, co se z nich doopravdy odešle.
 *
 * Nejcennější tvrzení je poslední dvojice: režim domu se odvozuje ze
 * segmentu na serveru, takže počet osob dozoru poslaný u firemního pobytu
 * se musí zahodit. Kdyby to přestalo platit, prohlížeč by uměl přepnout
 * provoz domu.
 */

function isoInDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Vyplní povinnou část formuláře; termín leží daleko za blokovanými dny. */
function fillBasics(guests = 20, offset = 200) {
  cy.get("#arrival").type(isoInDays(offset));
  cy.get("#departure").type(isoInDays(offset + 4));
  cy.get("#name").clear().type("Cypress Test");
  cy.get("#email").clear().type("cypress@example.com");
  cy.get("#guests").select(String(guests));
}

describe("Poptavka", () => {
  beforeEach(() => {
    cy.intercept("POST", "/api/inquiries").as("inquiry");
    cy.visit("/cs#contact");
  });

  it("firemni prilezitost odkryje fakturacni pole", () => {
    cy.get("#companyName").should("not.exist");
    cy.get("#occasion").select("corporate");
    cy.get("input[name='invoice']").should("be.checked");
    cy.get("#companyName").should("be.visible").and("have.attr", "required");
    cy.get("#companyId").should("be.visible");
    cy.get("#vatId").should("be.visible");
  });

  it("odskrtnuta faktura pole schova a neposle je", () => {
    cy.get("#occasion").select("corporate");
    cy.get("#companyName").type("Firma s.r.o.");
    cy.get("input[name='invoice']").uncheck();
    cy.get("#companyName").should("not.exist");

    fillBasics();
    cy.get("button[type='submit']").click();
    cy.wait("@inquiry").its("request.body.companyName").should("be.null");
  });

  it("firemni poptavka odesle segment, firmu i vybranou techniku", () => {
    cy.get("#occasion").select("corporate");
    cy.get("#companyName").type("Firma s.r.o.");
    cy.get("#companyId").type("12345678");
    cy.get("#vatId").type("CZ12345678");
    cy.get("input[name='rentalInterest'][value='boat']").check();
    cy.get("input[name='rentalInterest'][value='paddleboard']").check();
    fillBasics(28);
    cy.get("button[type='submit']").click();

    cy.wait("@inquiry").then(({ request, response }) => {
      expect(response?.statusCode).to.eq(201);
      expect(request.body.segment).to.eq("corporate");
      expect(request.body.companyName).to.eq("Firma s.r.o.");
      expect(request.body.companyId).to.eq("12345678");
      expect(request.body.rentalInterest).to.deep.eq(["boat", "paddleboard"]);
      expect(request.body.supervisorCount).to.be.null;
    });
    cy.get(".form-status[data-tone='ok']").should("exist");
  });

  it("skolni prilezitost odkryje rezim s dozorem i jeho pravidla", () => {
    cy.get("#occasion").select("school");
    cy.contains("Pobyt s dozorem").should("be.visible");
    cy.contains("Jmenovaný dozor přítomný po celou dobu pobytu").should("be.visible");
    cy.contains("Po dobu pobytu uzamčeno: Tyč na pole dance").should("be.visible");
    cy.get("#supervisorCount").should("have.attr", "required");
  });

  it("pocet osob dozoru se odesila u skolni poptavky", () => {
    cy.get("#occasion").select("school");
    cy.get("#supervisorCount").type("4");
    fillBasics(30);
    cy.get("button[type='submit']").click();
    cy.wait("@inquiry").then(({ request }) => {
      expect(request.body.segment).to.eq("school");
      expect(request.body.supervisorCount).to.eq(4);
    });
  });

  it("prepnuti zpet na firemni pobyt dozor zase schova", () => {
    cy.get("#occasion").select("school");
    cy.get("#supervisorCount").should("exist");
    cy.get("#occasion").select("corporate");
    cy.get("#supervisorCount").should("not.exist");
  });

  it("server zahodi dozor poslany u firemniho pobytu", () => {
    cy.request("POST", "/api/inquiries", {
      name: "Cypress Podvrh",
      email: "cypress-podvrh@example.com",
      arrival: isoInDays(320),
      departure: isoInDays(323),
      guests: 20,
      segment: "corporate",
      supervisorCount: 9,
    }).then((response) => {
      expect(response.status).to.eq(201);
    });
    // Ověřeno ve správě: firemní poptávka nesmí mít dozor ani značku režimu.
    cy.signInAsStaff();
    cy.visit("/cs/admin");
    cy.contains("tr", "Cypress Podvrh").within(() => {
      cy.contains("Provoz s dozorem").should("not.exist");
    });
  });

  it("neznamy segment server odmitne", () => {
    cy.request({
      method: "POST",
      url: "/api/inquiries",
      failOnStatusCode: false,
      body: {
        name: "Cypress Test",
        email: "cypress@example.com",
        arrival: isoInDays(330),
        departure: isoInDays(333),
        guests: 10,
        segment: "vikend",
      },
    })
      .its("status")
      .should("eq", 400);
  });

  it("kapacita objektu plati i pri primem volani API", () => {
    cy.request({
      method: "POST",
      url: "/api/inquiries",
      failOnStatusCode: false,
      body: {
        name: "Cypress Test",
        email: "cypress@example.com",
        arrival: isoInDays(340),
        departure: isoInDays(343),
        guests: 50,
      },
    })
      .its("status")
      .should("eq", 422);
  });
});
