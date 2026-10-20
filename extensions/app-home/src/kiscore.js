// Connects the shop to a website in KIscore. KIscore then reads the shop's
// session statistics itself. The connection key holds the tracking secret of
// the website; it goes to KIscore once and is never stored in Shopify.

const CONNECTION_KEY = /^([A-Za-z0-9-]+)\.([A-Za-z0-9_-]+)$/

// The key from KIscore has the form "<site-id>.<secret>".
export function parseConnectionKey(value) {
  const match = String(value ?? "").trim().match(CONNECTION_KEY)
  return match ? { siteId: match[1], secret: match[2] } : null
}

const CONNECTION_QUERY = `query {
  currentAppInstallation { id metafield(namespace: "kiscore", key: "site_id") { value } }
}`

// The KIscore website this shop is connected to, null before the first
// connection. It lives in a metafield of the app's own installation.
export async function loadConnection(graphql) {
  const installation = (await graphql(CONNECTION_QUERY))?.data?.currentAppInstallation
  return { installationId: installation?.id ?? null, siteId: installation?.metafield?.value ?? null }
}

// KIscore checks the Shopify ID token (signed with the app's client secret)
// and the key, then assigns the shop to the website.
export async function connectShop({ apiBase, connectionKey, idToken, fetch }) {
  let response
  try {
    response = await fetch(`${apiBase.replace(/\/+$/, "")}/api/v1/shopify/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ connection_key: connectionKey }),
    })
  } catch {
    return { ok: false, error: "unreachable" }
  }

  if (response.status === 401 || response.status === 403 || response.status === 422) {
    return { ok: false, error: "rejected" }
  }
  if (!response.ok) return { ok: false, error: "failed" }

  const body = await response.json().catch(() => ({}))
  return { ok: true, siteId: body.site_id }
}

const SAVE_CONNECTION = `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) { userErrors { field message code } }
}`

export async function saveConnection({ graphql, installationId, siteId }) {
  const response = await graphql(SAVE_CONNECTION, {
    metafields: [
      { ownerId: installationId, namespace: "kiscore", key: "site_id", type: "single_line_text_field", value: siteId },
    ],
  })
  const payload = response?.data?.metafieldsSet
  const failed = !payload || response.errors?.length || payload.userErrors?.length
  return failed ? { ok: false, error: "store" } : { ok: true }
}
