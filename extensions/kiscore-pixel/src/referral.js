// Decides whether a page view may come from an AI answer and what leaves the
// shop: the path with its utm_* parameters and the origin of an external
// referrer. Which visits count as AI referrals decides KIscore, as for every
// integration.
export function referralReport({ href, referrer }) {
  let page
  try {
    page = new URL(href)
  } catch {
    return null
  }

  const utm = new URLSearchParams()
  for (const [key, value] of page.searchParams) {
    if (/^utm_/i.test(key)) utm.append(key, value)
  }
  const external = externalOrigin(referrer, page.host)
  if (!utm.toString() && !external) return null

  return {
    url: page.pathname + (utm.toString() ? `?${utm}` : ""),
    referrer: external,
  }
}

// The referring site only: a referrer policy such as unsafe-url would
// otherwise send the path and query of the referring page along.
function externalOrigin(referrer, host) {
  if (!referrer) return ""
  try {
    const source = new URL(referrer)
    return bareHost(source.host) !== bareHost(host) ? source.origin : ""
  } catch {
    return ""
  }
}

function bareHost(host) {
  return host.toLowerCase().replace(/^www\./, "")
}
