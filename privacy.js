(function () {
  const consentKey = "antivergil-consent-v1";
  const analyticsSessionKey = "antivergil-analytics-session";
  const scheduleSessionKey = "antivergil-schedule-session";
  const configuredEndpoint = window.COLUMBIA_AUTH?.privacyApi;
  const fallbackEndpoint = window.COLUMBIA_AUTH?.scheduleApi
    ? new URL("/api/privacy", window.COLUMBIA_AUTH.scheduleApi).href
    : "/api/privacy";
  const endpoint = configuredEndpoint || fallbackEndpoint;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function storedConsent() {
    try {
      const value = JSON.parse(localStorage.getItem(consentKey) || "null");
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }

  function read() {
    const value = storedConsent();
    return {
      configured: Boolean(value),
      necessary: true,
      preferences: value?.preferences !== false,
      statistics: value?.statistics === true,
      marketing: value?.marketing === true,
    };
  }

  function save(value) {
    const consent = {
      necessary: true,
      preferences: value?.preferences !== false,
      statistics: value?.statistics === true,
      marketing: value?.marketing === true,
      updatedAt: new Date().toISOString(),
    };
    try { localStorage.setItem(consentKey, JSON.stringify(consent)); } catch {}
    if (consent.statistics) trackPageview();
    syncMarketing();
    return consent;
  }

  function analyticsSession() {
    try {
      const current = sessionStorage.getItem(analyticsSessionKey);
      if (uuidPattern.test(current || "")) return current;
      const created = crypto.randomUUID();
      sessionStorage.setItem(analyticsSessionKey, created);
      return created;
    } catch {
      return crypto.randomUUID();
    }
  }

  function scheduleToken() {
    try {
      const session = JSON.parse(localStorage.getItem(scheduleSessionKey) || "null");
      return typeof session?.token === "string" ? session.token : "";
    } catch {
      return "";
    }
  }

  async function post(body, token = "") {
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      keepalive: true,
      signal: AbortSignal.timeout(5000),
    }).then(async (response) => {
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Privacy request failed.");
      return result;
    });
  }

  function trackPageview() {
    const consent = read();
    if (!consent.configured || !consent.statistics) return;
    let referrerHost = "";
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer && referrer.origin !== location.origin) referrerHost = referrer.hostname;
    } catch {}
    post({
      type: "pageview",
      statistics: consent.statistics,
      path: location.pathname.slice(0, 200),
      referrerHost: referrerHost.slice(0, 200),
      sessionId: analyticsSession(),
    }).catch(() => {});
  }

  function syncMarketing() {
    const consent = storedConsent();
    const token = scheduleToken();
    if (!consent || !token) return;
    post({ type: "marketing-consent", marketing: consent.marketing === true }, token).catch(() => {});
  }

  window.AntivergilPrivacy = { endpoint, read, save, trackPageview, syncMarketing };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      trackPageview();
      syncMarketing();
    }, { once: true });
  } else {
    trackPageview();
    syncMarketing();
  }
})();
