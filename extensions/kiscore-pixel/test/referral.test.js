import { test } from "node:test"
import assert from "node:assert/strict"

import { referralReport } from "../src/referral.js"

// Like the KIscore integrations: only the path and utm_* parameters leave the
// shop, and only for visits that may come from an AI answer.
test("reports a visit with utm_source, without other query parameters", () => {
  assert.deepEqual(
    referralReport({
      href: "https://shop.example/products/cup?utm_source=chatgpt.com&email=a@b.de",
      referrer: "",
    }),
    { url: "/products/cup?utm_source=chatgpt.com", referrer: "" }
  )
})

test("reports a visit that arrives from another site", () => {
  assert.deepEqual(
    referralReport({ href: "https://shop.example/", referrer: "https://www.perplexity.ai/" }),
    { url: "/", referrer: "https://www.perplexity.ai/" }
  )
})

test("stays silent for navigation inside the shop and direct visits", () => {
  assert.equal(referralReport({ href: "https://shop.example/b", referrer: "https://shop.example/a" }), null)
  assert.equal(referralReport({ href: "https://shop.example/", referrer: "" }), null)
})

test("treats the www and bare host of the shop as the same site", () => {
  assert.equal(
    referralReport({ href: "https://www.shop.example/b", referrer: "https://shop.example/a" }),
    null
  )
})

test("ignores addresses it cannot parse", () => {
  assert.equal(referralReport({ href: "not a url", referrer: "" }), null)
})
