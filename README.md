# KIscore for Shopify

Shopify app that brings the visits from AI assistants (ChatGPT, Google AI
Mode and Gemini, Microsoft Copilot, Shop …) of a Shopify store into
[KIscore](https://kiscore.ai). It is an extension-only app: Shopify handles
installation, and the KIscore backend reads the store's own session
statistics.

## How it works

1. The merchant installs the app and opens it in the Shopify admin
   (`extensions/app-home`).
2. They paste the connection key of their website from KIscore
   (Settings › Traffic tracking › Shopify). The app sends it once to KIscore
   with the Shopify ID token and stores the connected site ID in a metafield
   of its own installation.
3. KIscore verifies the ID token with the app's client secret, exchanges it
   for an expiring offline access token and reads the store's ShopifyQL
   `sessions`: human sessions per AI source and landing page, and bot sessions
   per landing page, as daily counts. It imports 90 days at once and the last
   days every night.

The app adds no code to the store and transfers no customer data. AI crawlers
(GPTBot, ClaudeBot …) cannot be measured individually on Shopify: merchants
cannot put a proxy in front of the store, and Shopify reports bots only as a
class.

## Access

- `read_reports` for ShopifyQL. Shopify also requires level 2 access to
  protected customer data for `shopifyqlQuery`, although KIscore reads only
  session counts.
- No other scopes. The app home stores its own metafield through direct API
  access.

## KIscore backend

`POST https://api.kiscore.ai/api/v1/shopify/connections` with
`Authorization: Bearer <Shopify ID token>` and
`{ "connection_key": "<site-id>.<secret>" }` answers `201 { "site_id": "…" }`,
`401` for an invalid token and `422` for a key that belongs to no website.
The client secrets of both apps belong into the KIscore credentials
(`shopify.apps`), never into this repository.

## Apps

| Config | App | Distribution |
| --- | --- | --- |
| `shopify.app.toml` | KIscore | public, after review |
| `shopify.app.pilot.toml` | KIscore Pilot | custom, one pilot store |

A distribution method cannot be changed once selected, hence two apps from
one code base.

## Development

```bash
npm install
shopify app dev                      # dev store, e.g. kiscore-testing
npm test --workspaces
shopify app build
shopify app deploy --config pilot    # new version of the pilot app
```

Merchant-facing texts live in `extensions/app-home/locales` in English and
German.
