import { test } from "node:test"
import assert from "node:assert/strict"

import { connectShop, loadConnection, parseConnectionKey, saveConnection } from "../src/kiscore.js"

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
  assert.equal(calls[0].url, "https://api.kiscore.ai/api/v1/shopify/connections")
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

// The app remembers which KIscore website it is connected to in a metafield
// of its own installation; no extra access scope is needed for that.
test("reads the connected site from the app installation", async () => {
  const graphql = async () => ({
    data: { currentAppInstallation: { id: "gid://shopify/AppInstallation/1", metafield: { value: "site-1" } } },
  })
  assert.deepEqual(await loadConnection(graphql), { installationId: "gid://shopify/AppInstallation/1", siteId: "site-1" })

  const empty = async () => ({ data: { currentAppInstallation: { id: "gid://shopify/AppInstallation/1", metafield: null } } })
  assert.deepEqual(await loadConnection(empty), { installationId: "gid://shopify/AppInstallation/1", siteId: null })
})

test("stores the connected site on the app installation", async () => {
  const queries = []
  const graphql = async (query, variables) => {
    queries.push({ query, variables })
    return { data: { metafieldsSet: { userErrors: [] } } }
  }

  assert.deepEqual(await saveConnection({ graphql, installationId: "gid://shopify/AppInstallation/1", siteId: "site-1" }), { ok: true })
  assert.match(queries[0].query, /metafieldsSet/)
  assert.deepEqual(queries[0].variables.metafields, [
    { ownerId: "gid://shopify/AppInstallation/1", namespace: "kiscore", key: "site_id", type: "single_line_text_field", value: "site-1" },
  ])
})

test("reports user errors when the connection cannot be stored", async () => {
  const graphql = async () => ({ data: { metafieldsSet: { userErrors: [{ message: "Invalid" }] } } })

  assert.deepEqual(await saveConnection({ graphql, installationId: "x", siteId: "s" }), { ok: false, error: "store" })
})
