// Decides whether a page view may come from an AI answer and what leaves the
// shop: the path with its utm_* parameters and an external referrer. Which
// visits count as AI referrals decides KIscore, as for every integration.
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
  const external = isExternal(referrer, page.host) ? referrer : ""
  if (!utm.toString() && !external) return null

  return {
    url: page.pathname + (utm.toString() ? `?${utm}` : ""),
    referrer: external,
  }
}

function isExternal(referrer, host) {
  if (!referrer) return false
  try {
    return bareHost(new URL(referrer).host) !== bareHost(host)
  } catch {
    return false
  }
}

function bareHost(host) {
  return host.toLowerCase().replace(/^www\./, "")
}
