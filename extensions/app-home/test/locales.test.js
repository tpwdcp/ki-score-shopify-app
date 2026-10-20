import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const load = (name) => JSON.parse(readFileSync(new URL(`../locales/${name}.json`, import.meta.url)))
const keys = (object, prefix = "") =>
  Object.entries(object).flatMap(([key, value]) =>
    typeof value === "object" ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  )
const placeholders = (text) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort()

// Every merchant-facing text exists in English and German with the same placeholders.
test("German and English have the same keys and placeholders", () => {
  const en = load("en.default")
  const de = load("de")
  assert.deepEqual(keys(de).sort(), keys(en).sort())
  for (const key of keys(en)) {
    const get = (object) => key.split(".").reduce((value, part) => value[part], object)
    assert.deepEqual(placeholders(get(de)), placeholders(get(en)), key)
  }
})

// Every key the page uses is translated.
test("the connect page uses only existing keys", () => {
  const source = readFileSync(new URL("../src/ConnectPage.jsx", import.meta.url), "utf8")
  const used = [...source.matchAll(/\bt\("([\w.]+)"/g)].map((match) => match[1])
  const errors = ["invalidKey", "rejected", "failed", "unreachable", "store"].map((error) => `errors.${error}`)
  const known = new Set(keys(load("en.default")))
  for (const key of [...used, ...errors]) assert.ok(known.has(key), key)
})
