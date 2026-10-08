# Keeping the Privacy Policy and the Cookies Notice true

The [Privacy Policy](../src/views/blog/articles/app-pages/privacy.mdx) and the
[Cookies Notice](../src/views/blog/articles/app-pages/cookies.mdx) (CTA-159)
make claims about the code **and about the hosts**. A test covers the code.
Nothing automatic covers the hosts, so this page lists what to run and when.
How the pages are built and added is [`in-app-pages.md`](in-app-pages.md).

## 1. What the documents claim, and what keeps each claim true

| Claim | Kept true by |
| --- | --- |
| Every `localStorage` / `sessionStorage` key and IndexedDB database is listed | `src/views/legal/legalDocuments.test.ts`: it fails when a document omits a key or database the code names. A new one is a line in both pages, in both languages. |
| No third-party scripts, fonts or images | `yarn check:pages` on the `swa` build fails when a pre-rendered page loads a sub-resource from another origin ([`static-pages.md`](../.claude/rules/static-pages.md) §5). |
| The App sets no cookies, and the sites it is served from set none | The code has no `document.cookie`. Azure's built-in sign-in, which would set one, answers 404 (`scripts/swaBlockedAuth.mjs`, held by `yarn check:pages`). The hosts: §2 below. |
| "We do not receive or analyse these logs" (the hosts' server logs) | Azure: §3 below. GitHub Pages gives a site owner no request logs at all. |
| The contact address, `privacy@chessapp.dev` | The mailbox must exist and reach the controller. The policy promises a reply within one month. |

## 2. The hosts set no cookies

```bash
for url in https://chessapp.dev/ https://pgntools.github.io/chess-trainer-app/; do
  echo "== $url"; curl -sI "$url" | grep -i '^set-cookie' || echo "no Set-Cookie"
done
```

Checked on 8 October 2026: neither sent a `Set-Cookie` header.

### Azure's built-in sign-in is blocked

Azure Static Web Apps answers a built-in `/.auth/` folder on every plan
(sign-in with GitHub or Microsoft Entra ID at `/.auth/login/github` and
`/.auth/login/aad`, plus `/.auth/me` and `/.auth/logout`), and a sign-in **sets a
cookie**, `StaticWebAppsAuthCookie`. The App has no sign-in, so the `swa`
build answers those routes with a 404: `scripts/swaBlockedAuth.mjs` lists
them, `scripts/prerender.mjs` writes them first into `staticwebapp.config.json`'s
`routes`, and `yarn check:pages` fails a build without them.

- The two provider rules are Microsoft's documented way to block a provider.
  `/.auth/*` is a catch-all for the rest of the folder; Microsoft does not
  document a wildcard over it, so check what the host does after a deploy:

  ```bash
  for path in /.auth/login/github /.auth/login/aad /.auth/me /.auth/logout; do
    curl -s -o /dev/null -w "%{http_code} $path\n" "https://chessapp.dev$path"
  done
  ```

  Fine when `/.auth/login/github` and `/.auth/login/aad` answer `404`. If
  `/.auth/me` or `/.auth/logout` still answer, the wildcard is not honoured.
  That is harmless (neither signs a reader in, so neither sets the cookie),
  but note it on this page.
- If the App ever gets sign-in, remove the rules in `swaBlockedAuth.mjs` and
  list the cookie in the Cookies Notice (§4).

## 3. Azure Static Web Apps: is anything logging requests?

Sign in (`az login`), then find the app by its domain (the resource names are
not in this public repository):

```bash
read -r N G < <(az staticwebapp list \
  --query "[?contains(customDomains, 'chessapp.dev')].[name, resourceGroup]" -o tsv)
ID=$(az staticwebapp show -n "$N" -g "$G" --query id -o tsv)
```

| # | What it would reveal | Command | Fine when |
| --- | --- | --- | --- |
| 1 | An Application Insights link: an `APPLICATIONINSIGHTS_CONNECTION_STRING` or `APPINSIGHTS_INSTRUMENTATIONKEY` app setting | `az staticwebapp appsettings list -n "$N" -g "$G" --query properties` | `{}`, or no key with `INSIGHTS` in its name |
| 2 | Logs exported to Log Analytics, a storage account or an Event Hub (diagnostic settings) | `az monitor diagnostic-settings list --resource "$ID"` | `[]` |
| 3 | An Application Insights or Log Analytics resource beside the app | `az resource list -g "$G" --query "[].[name, type]" -o tsv` | Only the `Microsoft.Web/staticSites` resource |
| 4 | An attached API: managed functions or a linked backend | `az staticwebapp functions show -n "$N" -g "$G"` and `az staticwebapp backends show -n "$N" -g "$G"` | On the **Free** plan both refuse with "must have 'Standard' SKU": there is no API. On Standard: an empty answer. |

Checked on 8 October 2026, on the Free plan: no app settings, no diagnostic
settings, no other resource in the group, no API. The policy's wording is
accurate.

## 4. After a change to the hosting

Run §2 and §3 again **after any of these**, before the change ships:

- **The Static Web App moves to the Standard plan.** Standard adds what Free
  lacks: managed or linked APIs (check 4 now answers), Application Insights for
  those APIs (check 1), private endpoints and the enterprise-grade edge.
- **An API is added** (an `api/` folder, a linked Function App or Container App).
- **Application Insights or a diagnostic setting is turned on**, in the portal
  or by a workflow.
- **A new host serves the site**, or a CDN or proxy is put in front of either
  host.
- **The App gains sign-in** (§2: the auth cookie, and the blocked routes to remove).

If a check is no longer "fine", update **both** documents, in **both**
languages, before the change ships:

- **Logs you can now read** (checks 1–3): the Privacy Policy's *Hosting and
  server logs* section. It must say what is logged, why (the legal basis),
  for how long, and who can see it, instead of "we do not receive or analyse
  these logs".
- **A cookie** (§2): the Cookies Notice's opening line and its list, and the
  Privacy Policy's "The App sets no cookies". If the cookie is not strictly
  necessary (analytics, for example), the App needs a consent banner before
  setting it.
- **An API that receives the reader's data**: the Privacy Policy's opening
  promise ("never sent to us"), *What we do not do*, *Your rights* and the
  legal basis. This needs the owner's legal review.

Then move each document's "Last updated" date, and update the "Checked on"
lines on this page.
