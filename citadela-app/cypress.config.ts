import { defineConfig } from "cypress";

/**
 * E2E testy běží proti skutečnému dev nebo produkčnímu serveru s databází —
 * stejná dělba jako u simulátoru čteček: čistá logika ve Vitestu, cesty
 * skrz aplikaci proti běžícímu serveru.
 *
 * Data očekávají demo seed: SEED_DEMO_ACCESS=1 npm run db:seed
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: false,
    video: false,
    screenshotOnRunFailure: false,
    viewportWidth: 1280,
    viewportHeight: 900,
    // Vila se pronajímá vcelku a poptávka běží přes jeden formulář, takže
    // testů je málo a smí být pomalejší; radši počkat než blikat.
    defaultCommandTimeout: 8000,
    retries: { runMode: 1, openMode: 0 },
  },
});
