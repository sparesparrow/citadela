import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Testuje se jen ciste logika (src/lib). Routy potrebuji databazi
 * a testuji se proti bezicimu serveru, viz scripts/simulate-reader.ts.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.join(import.meta.dirname, "src"),
      // `server-only` je jen build-time pojistka Next.js; v node prostredi
      // neexistuje, takze ji nahradime prazdnym modulem.
      "server-only": path.join(import.meta.dirname, "src/test/server-only.ts"),
    },
  },
});
