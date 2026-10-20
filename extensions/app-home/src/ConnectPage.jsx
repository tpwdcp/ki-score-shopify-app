import { useEffect, useState } from "preact/hooks"

import { activatePixel, connectShop, loadPixel, parseConnectionKey, pixelId, pixelSiteId } from "./kiscore.js"

const KISCORE_API = "https://api.kiscore.ai"
const KISCORE_TRACKING_SETTINGS = "https://toolkit.kiscore.ai/dashboard/integration"

// The Admin API, called from the browser through App Bridge (direct API access).
async function graphql(query, variables) {
  const response = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  })
  return response.json()
}

export default function ConnectPage() {
  const t = (key, values) => shopify.i18n.translate(key, values)
  const [pixel, setPixel] = useState({ loading: true, id: null, siteId: null })
  const [key, setKey] = useState("")
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    const response = await loadPixel(graphql)
    setPixel({ loading: false, id: pixelId(response), siteId: pixelSiteId(response) })
  }

  useEffect(() => {
    refresh()
  }, [])

  const connect = async () => {
    setError(null)
    if (!parseConnectionKey(key)) {
      setError("invalidKey")
      return
    }
    setSaving(true)
    try {
      const connection = await connectShop({
        apiBase: KISCORE_API,
        connectionKey: key.trim(),
        idToken: await shopify.idToken(),
        fetch,
      })
      if (!connection.ok) {
        setError(connection.error)
        return
      }
      const activation = await activatePixel({ graphql, siteId: connection.siteId, pixelId: pixel.id })
      if (!activation.ok) {
        setError(activation.error)
        return
      }
      setKey("")
      await refresh()
      shopify.toast.show(t("connected"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <s-page heading={t("heading")}>
      <s-section heading={t("statusHeading")}>
        {pixel.loading ? (
          <s-spinner accessibilityLabel={t("loading")} />
        ) : pixel.siteId ? (
          <s-banner tone="success">{t("statusConnected", { siteId: pixel.siteId })}</s-banner>
        ) : (
          <s-banner tone="info">{t("statusNotConnected")}</s-banner>
        )}
        <s-paragraph>{t("intro")}</s-paragraph>
      </s-section>

      <s-section heading={pixel.siteId ? t("changeHeading") : t("connectHeading")}>
        <s-stack gap="base">
          <s-text-field
            label={t("keyLabel")}
            value={key}
            error={error ? t(`errors.${error}`) : undefined}
            onInput={(event) => setKey(event.currentTarget.value)}
          />
          <s-paragraph>
            {t("keyHelp")}{" "}
            <s-link href={KISCORE_TRACKING_SETTINGS} target="_blank">
              {t("keyHelpLink")}
            </s-link>
          </s-paragraph>
          <s-button variant="primary" loading={saving} onClick={connect}>
            {t("connectButton")}
          </s-button>
        </s-stack>
      </s-section>

      <s-section heading={t("dataHeading")}>
        <s-paragraph>{t("dataDescription")}</s-paragraph>
        <s-paragraph>{t("crawlerLimit")}</s-paragraph>
      </s-section>
    </s-page>
  )
}
