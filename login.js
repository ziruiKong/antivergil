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
  if (type === "error" || type === "info") return;
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
          verificationCredential = credential;
          await sendCode(); clearStatus();
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
  $("#google-login").disabled = true;
  setStatus("Google sign-in is not configured.");
}


let verificationEmailAddress = "";
let verificationCredential = "";
let resendAvailableAt = 0;
const emailAuthEndpoint = new URL("/api/email-auth", window.COLUMBIA_AUTH?.scheduleApi || location.origin).href;
async function emailAuth(body) {
  const response = await fetch(emailAuthEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result;
}
async function sendCode() {
  let result;
  try {
    result = await emailAuth({ credential: verificationCredential });
  } catch (error) {
    if (!/Wait 60 seconds/.test(error.message)) throw error;
    const payload = JSON.parse(atob(verificationCredential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    result = { email: payload.email };
  }
  verificationEmailAddress = result.email;
  resendAvailableAt = Date.now() + 60000;
  $("#google-login-mount").hidden = true;
  $("#code-form").hidden = false;
  $("#code-destination").textContent = "We sent a six-digit code to " + verificationEmailAddress;
  $("#verification-code").focus();
}
$("#code-form").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const { token, user } = await emailAuth({ credential: verificationCredential, code: $("#verification-code").value });
    localStorage.setItem("antivergil-schedule-session", JSON.stringify({ sub: user.sub, token }));
    completeSignIn(user);
  } catch (error) { setStatus(error.message); button.disabled = false; }
});
$("#verification-code").addEventListener("input", event => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6); });
$("#change-email").addEventListener("click", () => { $("#code-form").hidden = true; $("#google-login-mount").hidden = false; verificationCredential = ""; });
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
