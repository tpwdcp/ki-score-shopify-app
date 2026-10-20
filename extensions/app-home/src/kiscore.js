// Connects the shop to a website in KIscore and activates the web pixel.
// The connection key holds the tracking secret of the website; it goes to
// KIscore once and is never stored in Shopify.

const CONNECTION_KEY = /^([A-Za-z0-9-]+)\.([A-Za-z0-9_-]+)$/

// The key from KIscore has the form "<site-id>.<secret>".
export function parseConnectionKey(value) {
  const match = String(value ?? "").trim().match(CONNECTION_KEY)
  return match ? { siteId: match[1], secret: match[2] } : null
}

const PIXEL_QUERY = "query { webPixel { id settings } }"

// The site ID the pixel reports for, null while the app has no pixel.
export function pixelSiteId(response) {
  return pixelSettings(response)?.siteId ?? null
}

export function pixelId(response) {
  return response?.data?.webPixel?.id ?? null
}

function pixelSettings(response) {
  const settings = response?.data?.webPixel?.settings
  if (!settings) return null
  try {
    return typeof settings === "string" ? JSON.parse(settings) : settings
  } catch {
    return null
  }
}

export async function loadPixel(graphql) {
  return graphql(PIXEL_QUERY)
}

// KIscore checks the Shopify ID token (signed with the app's client secret)
// and the key, then assigns the shop to the website.
export async function connectShop({ apiBase, connectionKey, idToken, fetch }) {
  let response
  try {
    response = await fetch(`${apiBase.replace(/\/+$/, "")}/shopify/connections`, {
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

const CREATE_PIXEL = `mutation webPixelCreate($webPixel: WebPixelInput!) {
  webPixelCreate(webPixel: $webPixel) { userErrors { field message code } }
}`

const UPDATE_PIXEL = `mutation webPixelUpdate($id: ID!, $webPixel: WebPixelInput!) {
  webPixelUpdate(id: $id, webPixel: $webPixel) { userErrors { field message code } }
}`

export async function activatePixel({ graphql, siteId, pixelId }) {
  const webPixel = { settings: JSON.stringify({ siteId }) }
  const response = pixelId
    ? await graphql(UPDATE_PIXEL, { id: pixelId, webPixel })
    : await graphql(CREATE_PIXEL, { webPixel })
  const payload = response?.data?.[pixelId ? "webPixelUpdate" : "webPixelCreate"]
  const failed = !payload || response.errors?.length || payload.userErrors?.length
  return failed ? { ok: false, error: "pixel" } : { ok: true }
}
