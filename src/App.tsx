import { createBrowserRouter, RouterProvider } from "react-router";
import { useTranslation } from "react-i18next";

import { asAppLanguage, type AppLanguage } from "./i18n";
import { routerBasename } from "./lib/languagePath";
import { appRoutes } from "./routes";

type Router = ReturnType<typeof createBrowserRouter>;

let current: { language: AppLanguage; router: Router } | undefined;

/**
 * **The router for a language** (CTA-136). Its `basename` is the deployed
 * sub-path ("/chess-trainer-app/" on GitHub Pages, "/" on chessapp.dev and
 * under Vitest — Vite's `base`) followed by the language's prefix ("he"; none
 * for English), so every route and every link the app makes stays under both
 * (`lib/languagePath.ts`). A router cannot change its basename, so a change of
 * language makes a new one — at the address the language switch has already
 * moved to — and retires the old.
 */
const routerFor = (language: AppLanguage): Router => {
  if (current?.language !== language) {
    current?.router.dispose();
    current = { language, router: createBrowserRouter(appRoutes, { basename: routerBasename(import.meta.env.BASE_URL, language) }) };
  }
  return current.router;
};

function App() {
  const { i18n } = useTranslation();
  const language = asAppLanguage(i18n.language);
  // Keyed on the language: the screens remount under the new router, as the
  // language switch warns a reader with unsaved work.
  return <RouterProvider key={language} router={routerFor(language)} />;
}

export default App;
