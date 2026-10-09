/**
 * Náhrada za balíček `server-only` v testech.
 *
 * Ten balíček existuje jen proto, aby build spadl, když se serverový modul
 * omylem importuje do klientské komponenty. Ve Vitestu (prostředí node)
 * se nemá o co opřít a import by selhal, takže ho nahrazujeme prázdným
 * modulem — viz alias ve `vitest.config.ts`.
 */
export {};
