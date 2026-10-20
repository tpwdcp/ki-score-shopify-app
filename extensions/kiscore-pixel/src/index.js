import { register } from "@shopify/web-pixels-extension"

import { referralReport } from "./referral.js"

// Sends page views that may come from an AI answer to the KIscore app proxy
// of this shop. Shopify signs the forwarded request, so the pixel itself holds
// no secret; KIscore checks the signature and which shop it belongs to.
register(({ analytics, settings }) => {
  analytics.subscribe("page_viewed", (event) => {
    const { location, referrer } = event.context.document
    const report = referralReport({ href: location.href, referrer })
    if (!report) return

    fetch(`${location.origin}/apps/kiscore/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...report, site_id: settings.siteId }),
      keepalive: true,
    }).catch(() => {})
  })
})
