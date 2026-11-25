const STORAGE_KEY = "cu-auth-user";
const NEXT_KEY = "antivergil-next";
const DEFAULT_NEXT = "/browse/";
const $ = (selector) => document.querySelector(selector);
let statusTimer = 0;
let statusHideTimer = 0;

function isAllowedUniversityEmail(value) {
  return /^[^\s@]+@(?:columbia\.edu|student\.ubc\.ca)$/i.test(String(value || "").trim());
}

function safeNextPath() {
  let raw = "";
  try { raw = sessionStorage.getItem(NEXT_KEY) || ""; } catch (_) {}
  if (!raw) raw = new URLSearchParams(location.search).get("next") || "";
  if (!raw) return DEFAULT_NEXT;
  try {
    const next = new URL(raw, location.href);
    if (next.origin === location.origin && !/^\/login\/?$/i.test(next.pathname)) {
      return `${next.pathname}${next.search}`;
    }
  } catch (_) {}
  return DEFAULT_NEXT;
}

function setStatus(message, type = "error") {
  const status = $("#login-status");
  if (!status) return;
  window.clearTimeout(statusTimer);
  window.clearTimeout(statusHideTimer);
  status.textContent = message;
  status.classList.toggle("is-error", type === "error");
  status.classList.toggle("is-info", type === "info");
  status.classList.remove("is-leaving");
  status.hidden = false;
  status.style.animation = "none";
  void status.offsetWidth;
  status.style.animation = "";
  statusTimer = window.setTimeout(() => {
    status.classList.add("is-leaving");
    statusHideTimer = window.setTimeout(() => {
      status.hidden = true;
      status.classList.remove("is-leaving");
    }, 280);
  }, 2600);
}

function clearStatus() {
  const status = $("#login-status");
  if (!status) return;
  window.clearTimeout(statusTimer);
  window.clearTimeout(statusHideTimer);
  status.hidden = true;
  status.textContent = "";
  status.classList.remove("is-error", "is-info", "is-leaving");
}

function saveUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch (_) {}
}

function completeSignIn(user) {
  if (!isAllowedUniversityEmail(user.email)) {
    setStatus("Only supported university accounts can continue.", "error");
    return;
  }
  saveUser({ ...user, email: user.email.toLowerCase() });
  const next = safeNextPath();
  const profile = window.AntivergilProfile?.read(user.email);
  if (!profile) {
    try { sessionStorage.setItem(NEXT_KEY, next); } catch (_) {}
    location.assign("/profile/");
    return;
  }
  try { sessionStorage.removeItem(NEXT_KEY); } catch (_) {}
  location.assign(next);
}

let googleTokenClient = null;
let googleTokenClientId = "";

function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error("Google Identity Services timed out"));
    }, 10000);
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("Google Identity Services unavailable"));
    };
    document.head.appendChild(script);
  });
}

async function handleGoogleTokenResponse(response) {
  const button = $("#google-login");
  try {
    if (response?.error) throw new Error(response.error_description || response.error);
    if (!response?.access_token) throw new Error("Google did not return an access token");
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${response.access_token}` },
    });
    if (!profileResponse.ok) throw new Error(`Google profile request failed (${profileResponse.status})`);
    const payload = await profileResponse.json();
    if (!isAllowedUniversityEmail(payload.email)) {
      setStatus("Use a supported university account.", "error");
      return;
    }
    completeSignIn({
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      sub: payload.sub,
      provider: "google",
    });
  } catch (_) {
    setStatus("Google sign-in failed. Try again.", "error");
  } finally {
    if (button) button.disabled = false;
  }
}

async function startGoogleLogin() {
  clearStatus();
  const button = $("#google-login");
  const clientId = String(window.COLUMBIA_AUTH?.googleClientId || "").trim();
  if (!clientId || !/^https?:$/.test(location.protocol)) {
    $("#email-form").hidden = false;
    setStatus("Google OAuth is not configured in this preview. Continue with your university email.", "info");
    requestAnimationFrame(() => $("#email-form input")?.focus());
    return;
  }

  button.disabled = true;
  try {
    await loadGoogleScript();
    if (!window.google?.accounts?.oauth2) throw new Error("Google OAuth client unavailable");
    if (!googleTokenClient || googleTokenClientId !== clientId) {
      googleTokenClientId = clientId;
      googleTokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: handleGoogleTokenResponse,
        error_callback: (error) => {
          const message = String(error?.message || "");
          setStatus(/popup.*closed|closed|cancel/i.test(message)
            ? "Sign-in window closed. Try again."
            : "Google sign-in was cancelled. Try again.", "error");
          button.disabled = false;
        },
      });
    }
    googleTokenClient.requestAccessToken({ prompt: "select_account" });
  } catch (_) {
    button.disabled = false;
    $("#email-form").hidden = false;
    setStatus("Google sign-in is unavailable. Use your university email to continue.", "error");
    requestAnimationFrame(() => $("#email-form input")?.focus());
  }
}

$("#login-back").href = "/about/";
if (window.AntivergilScheduleCloud?.enabled) {
  const button = $("#google-login");
  const mount = $("#google-login-mount");
  button.disabled = true;
  loadGoogleScript().then(() => {
    window.google.accounts.id.initialize({
      client_id: window.COLUMBIA_AUTH.googleClientId,
      callback: async ({ credential }) => {
        try {
          setStatus("Signing in…", "info");
          completeSignIn(await window.AntivergilScheduleCloud.signIn(credential));
        } catch (error) {
          setStatus(error.message || "Cloud sign-in failed. Try again.");
        }
      },
    });
    const container = mount.parentElement;
    let renderedWidth = 0;
    const renderGoogleButton = () => {
      const width = Math.min(330, container.clientWidth);
      if (!width || width === renderedWidth) return;
      renderedWidth = width;
      mount.replaceChildren();
      window.google.accounts.id.renderButton(mount, {
        type: "standard", theme: "filled_black", shape: "rectangular", size: "large",
        text: "continue_with", logo_alignment: "left", width,
      });
    };
    button.hidden = true;
    renderGoogleButton();
    new ResizeObserver(renderGoogleButton).observe(container);
  }).catch(() => setStatus("Google sign-in is temporarily unavailable. Reload to try again."));
} else {
  $("#google-login").addEventListener("click", startGoogleLogin);
}
$("#email-form input").addEventListener("input", clearStatus);

let verificationEmailAddress = "";
let resendAvailableAt = 0;
const emailAuthEndpoint = new URL("/api/email-auth", window.COLUMBIA_AUTH?.scheduleApi || location.origin).href;
async function emailAuth(body) {
  const response = await fetch(emailAuthEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result;
}
async function sendCode() {
  await emailAuth({ email: verificationEmailAddress });
  resendAvailableAt = Date.now() + 60000;
  $("#email-form").hidden = true;
  $("#code-form").hidden = false;
  $("#code-destination").textContent = "We sent a six-digit code to " + verificationEmailAddress;
  $("#verification-code").focus();
}
$("#email-form").addEventListener("submit", async event => {
  event.preventDefault();
  verificationEmailAddress = String(new FormData(event.currentTarget).get("email") || "").trim().toLowerCase();
  if (!isAllowedUniversityEmail(verificationEmailAddress)) return setStatus("Use your university email.");
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try { await sendCode(); clearStatus(); } catch (error) { setStatus(error.message); }
  finally { button.disabled = false; }
});
$("#code-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const { token, user } = await emailAuth({ email: verificationEmailAddress, code: $("#verification-code").value });
    localStorage.setItem("antivergil-schedule-session", JSON.stringify({ sub: user.sub, token }));
    completeSignIn(user);
  } catch (error) { setStatus(error.message); button.disabled = false; }
});
$("#verification-code").addEventListener("input", event => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6); });
$("#change-email").addEventListener("click", () => { $("#code-form").hidden = true; $("#email-form").hidden = false; });
$("#resend-code").addEventListener("click", async event => {
  event.target.disabled = true;
  try { await sendCode(); } catch (error) { setStatus(error.message); }
  finally { event.target.disabled = false; }
});
setInterval(() => {
  const seconds = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
  $("#resend-code").disabled = seconds > 0;
  $("#resend-code").textContent = seconds ? "Resend in " + seconds + "s" : "Resend code";
}, 1000);
