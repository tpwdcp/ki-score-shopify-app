import { useEffect, useState } from "preact/hooks"

import { connectShop, loadConnection, parseConnectionKey, saveConnection } from "./kiscore.js"

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
  const [connection, setConnection] = useState({ loading: true, installationId: null, siteId: null })
  const [key, setKey] = useState("")
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setConnection({ loading: false, ...(await loadConnection(graphql)) })
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
      // Admin UI extensions expose the ID token under shopify.auth.
      const idToken = await shopify.auth.idToken()
      if (!idToken) {
        setError("failed")
        return
      }
      const result = await connectShop({
        apiBase: KISCORE_API,
        connectionKey: key.trim(),
        idToken,
        fetch,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      const stored = await saveConnection({
        graphql,
        installationId: connection.installationId,
        siteId: result.siteId,
      })
      if (!stored.ok) {
        setError(stored.error)
        return
      }
      setKey("")
      await refresh()
      shopify.toast.show(t("connected"))
    } catch {
      setError("failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <s-page heading={t("heading")}>
      <s-section heading={t("statusHeading")}>
        {connection.loading ? (
          <s-spinner accessibilityLabel={t("loading")} />
        ) : connection.siteId ? (
          <s-banner tone="success">{t("statusConnected", { siteId: connection.siteId })}</s-banner>
        ) : (
          <s-banner tone="info">{t("statusNotConnected")}</s-banner>
        )}
        <s-paragraph>{t("intro")}</s-paragraph>
      </s-section>

      <s-section heading={connection.siteId ? t("changeHeading") : t("connectHeading")}>
        <s-stack gap="base">
          {/* The key holds the tracking secret: masked like a password. */}
          <s-password-field
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
