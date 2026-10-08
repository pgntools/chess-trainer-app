/*
  **Azure Static Web Apps' sign-in, switched off** (CTA-159). Every Static Web
  App answers a built-in `/.auth/` folder on every plan, the Free one included:
  sign-in with GitHub or Microsoft Entra ID (`/.auth/login/github`,
  `/.auth/login/aad`), `/.auth/me`, `/.auth/logout`. A sign-in sets a cookie,
  `StaticWebAppsAuthCookie`, and the App has no sign-in, so the Cookies Notice
  says chessapp.dev sets no cookies. These routes answer 404 instead.

  - **The two provider routes are Microsoft's documented way** to block a
    provider: a route rule with `statusCode: 404`
    (learn.microsoft.com/azure/static-web-apps/authentication-authorization,
    "Block an authentication provider").
  - **`/.auth/*` is a catch-all for the rest.** Microsoft does not document a
    wildcard over the system folder, so it is a second line, not the only one:
    the provider rules block sign-in on their own. After a deploy,
    `docs/privacy-policy-checks.md` §2 checks what the host actually answers.
  - **The App sign-in some day** means removing these, and listing the cookie
    in the Cookies Notice (`docs/privacy-policy-checks.md` §4).

  One definition, read by the pre-render (written first into
  `staticwebapp.config.json`'s `routes`) and by `yarn check:pages`.
*/

/** The routes the swa host answers with a 404 — the specific ones first, as rules match in order. */
export const BLOCKED_AUTH_ROUTES = ["/.auth/login/github", "/.auth/login/aad", "/.auth/*"];
