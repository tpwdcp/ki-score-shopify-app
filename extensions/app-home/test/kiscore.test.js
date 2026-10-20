import { test } from "node:test"
import assert from "node:assert/strict"

import { activatePixel, connectShop, parseConnectionKey, pixelSiteId } from "../src/kiscore.js"

test("reads site ID and secret from one connection key", () => {
  assert.deepEqual(parseConnectionKey(" 622e7ea0728b43cc2a87a4b793c1ac28.a1b2c3 \n"), {
    siteId: "622e7ea0728b43cc2a87a4b793c1ac28",
    secret: "a1b2c3",
  })
})

test("rejects anything but site-id.secret", () => {
  for (const key of ["", "only-site", ".secret", "site.", "site.sec.ret", "site id.secret"]) {
    assert.equal(parseConnectionKey(key), null, key)
  }
})

test("reads the site ID of the activated pixel, none without a pixel", () => {
  assert.equal(pixelSiteId({ data: { webPixel: { id: "gid://shopify/WebPixel/1", settings: '{"siteId":"abc"}' } } }), "abc")
  assert.equal(pixelSiteId({ data: { webPixel: null }, errors: [{ message: "No web pixel was found for this app." }] }), null)
})

test("registers the shop with KIscore using the Shopify ID token", async () => {
  const calls = []
  const result = await connectShop({
    apiBase: "https://api.kiscore.ai/",
    connectionKey: "site-1.secret-1",
    idToken: "jwt-token",
    fetch: async (url, init) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ site_id: "site-1" }), { status: 201 })
    },
  })

  assert.deepEqual(result, { ok: true, siteId: "site-1" })
  assert.equal(calls[0].url, "https://api.kiscore.ai/shopify/connections")
  assert.equal(calls[0].init.method, "POST")
  assert.equal(calls[0].init.headers.Authorization, "Bearer jwt-token")
  assert.deepEqual(JSON.parse(calls[0].init.body), { connection_key: "site-1.secret-1" })
})

test("names why KIscore refused the connection", async () => {
  const answer = (status) => async () => new Response("{}", { status })
  const connect = (fetch) => connectShop({ apiBase: "https://api.kiscore.ai", connectionKey: "a.b", idToken: "t", fetch })

  assert.deepEqual(await connect(answer(401)), { ok: false, error: "rejected" })
  assert.deepEqual(await connect(answer(500)), { ok: false, error: "failed" })
  assert.deepEqual(
    await connect(async () => {
      throw new TypeError("network")
    }),
    { ok: false, error: "unreachable" }
  )
})

test("creates the pixel, or updates the one that exists, with the site ID", async () => {
  const queries = []
  const graphql = async (query, variables) => {
    queries.push({ query, variables })
    return { data: { webPixelCreate: { userErrors: [] }, webPixelUpdate: { userErrors: [] } } }
  }

  assert.deepEqual(await activatePixel({ graphql, siteId: "site-1", pixelId: null }), { ok: true })
  assert.match(queries[0].query, /webPixelCreate/)
  assert.deepEqual(queries[0].variables, { webPixel: { settings: '{"siteId":"site-1"}' } })

  await activatePixel({ graphql, siteId: "site-2", pixelId: "gid://shopify/WebPixel/7" })
  assert.match(queries[1].query, /webPixelUpdate/)
  assert.deepEqual(queries[1].variables, { id: "gid://shopify/WebPixel/7", webPixel: { settings: '{"siteId":"site-2"}' } })
})

test("reports user errors of the pixel mutation", async () => {
  const graphql = async () => ({ data: { webPixelCreate: { userErrors: [{ message: "Invalid settings" }] } } })

  assert.deepEqual(await activatePixel({ graphql, siteId: "x", pixelId: null }), { ok: false, error: "pixel" })
})
