# KIscore for Shopify

Shopify app that reports visits from AI assistants (ChatGPT, Perplexity,
Gemini …) of a Shopify store to [KIscore](https://kiscore.ai). It is an
extension-only app: Shopify handles installation, and the KIscore backend
receives the data. Research and decisions behind it:
`docs/shopify-integration-research-2026-10-20.md` in the KIscore repository.

## What it does

- **App home** (`extensions/app-home`): the merchant pastes the connection key
  of the website from KIscore. The app sends it once to KIscore together with
  the Shopify ID token, then activates the web pixel with the public site ID.
- **Web pixel** (`extensions/kiscore-pixel`): for page views with `utm_*`
  parameters or an external referrer it posts the path, the utm parameters and
  the referrer to the app proxy `/apps/kiscore/track` of the store. It runs
  only with analytics consent and holds no secret.
- **App proxy** (`shopify.app.toml`): Shopify forwards `/apps/kiscore/*` to
  KIscore and signs each request (HMAC over the query parameters, including
  `shop`).

AI crawlers (GPTBot, ClaudeBot …) cannot be measured on Shopify: merchants
cannot put a proxy in front of the store, and Shopify offers apps no access to
storefront requests.

## KIscore backend contract

Both endpoints still have to be built in the KIscore backend.

| Endpoint | Auth | Body | Answer |
| --- | --- | --- | --- |
| `POST https://api.kiscore.ai/shopify/connections` | `Authorization: Bearer <Shopify ID token>`, a JWT signed with the app's client secret; `dest` names the shop | `{ "connection_key": "<site-id>.<secret>" }` | `201 { "site_id": "…" }`; `401`/`422` for a token or key that is not valid |
| `POST https://api.kiscore.ai/shopify/app_proxy/track` | Shopify app proxy `signature` over the query parameters, with `shop` and `timestamp` | `{ "url": "/path?utm_source=…", "referrer": "…", "site_id": "…" }` | `204`; only AI referrals are stored, for the website connected to `shop` |

The connections endpoint is called from the Shopify admin (app home), so it
needs CORS for the extension's origin. The client secret of the app belongs
into the KIscore credentials, never into this repository. Before a public
release the app also needs the mandatory compliance webhooks
(`customers/data_request`, `customers/redact`, `shop/redact`).

## Development

```bash
npm install
shopify app dev           # installs the app on the dev store, e.g. kiscore-testing
npm test --workspaces     # unit tests of the pixel and the app home
shopify app build
shopify app deploy        # publishes a new app version (configuration and extensions)
```

The app is linked to "KIscore" in the TPWD AG partner organization
(`client_id` in `shopify.app.toml`). Merchant-facing texts live in
`extensions/*/locales` in English and German.
