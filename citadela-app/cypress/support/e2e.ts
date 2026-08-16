/**
 * Sdílené příkazy pro e2e testy.
 *
 * Přihlášení personálu jde přes Auth.js provider `staff` (ne `credentials`)
 * a potřebuje CSRF token — proto se dělá požadavkem, ne proklikáním
 * formuláře. Test tak ověřuje správu, ne přihlašovací obrazovku.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      signInAsStaff(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("signInAsStaff", () => {
  const email = Cypress.env("ADMIN_EMAIL") ?? "admin@citadela.cz";
  const password = Cypress.env("ADMIN_PASSWORD") ?? "zmente-me-pred-nasazenim";

  cy.request("/api/auth/csrf").then((csrf) => {
    cy.request({
      method: "POST",
      url: "/api/auth/callback/staff",
      form: true,
      body: { csrfToken: csrf.body.csrfToken, email, password },
      followRedirect: false,
    });
  });
});

export {};
