const STORAGE_KEY = "cu-auth-user";
const NEXT_KEY = "antivergil-next";
const OUTLOOK_TICKET_KEY = "antivergil-outlook-ticket";
const DEFAULT_NEXT = "/browse/";
const $ = (selector) => document.querySelector(selector);
let statusTimer = 0;
let statusHideTimer = 0;
let verificationEmailAddress = "";
let verificationCredential = "";
let verificationProvider = "google";
let outlookLoginTicket = "";
let manualUbcMode = false;
let resendAvailableAt = 0;

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

function verificationPayload() {
  return verificationProvider === "outlook"
    ? { provider: "outlook", ticket: outlookLoginTicket }
    : { credential: verificationCredential };
}

function completeSignIn(user) {
  if (!isAllowedUniversityEmail(user.email)) {
    setStatus("Only supported university accounts can continue.", "error");
    return;
  }
  try { sessionStorage.removeItem(OUTLOOK_TICKET_KEY); } catch (_) {}
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
          verificationProvider = "google";
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
      localizeGoogleLabel();
    };
    const localizeGoogleLabel = () => {
      mount.querySelectorAll(".nsm7Bb-HzV7m-LgbsSe-BPrWId").forEach(label => {
        if (/continue with google/i.test(label.textContent || "")) label.textContent = "Continue with LionMail";
      });
    };
    new MutationObserver(localizeGoogleLabel).observe(mount, { childList: true, characterData: true, subtree: true });
    button.hidden = true;
    renderGoogleButton();
    new ResizeObserver(renderGoogleButton).observe(container);
  }).catch(() => setStatus("Google sign-in is temporarily unavailable. Reload to try again."));
} else {
  $("#google-login").disabled = true;
  $("#outlook-login").disabled = true;
  setStatus("Cloud sign-in is not configured.");
}


const emailAuthEndpoint = new URL("/api/email-auth", window.COLUMBIA_AUTH?.scheduleApi || location.origin).href;
async function emailAuth(body) {
  const response = await fetch(emailAuthEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "Please try again.");
    error.status = response.status;
    error.payload = result;
    throw error;
  }
  return result;
}
async function sendCode() {
  let result;
  try {
    result = await emailAuth(verificationPayload());
  } catch (error) {
    if (!/Wait 60 seconds/.test(error.message)) throw error;
    result = { email: error.payload?.email || verificationEmailAddress };
    if (!result.email) throw error;
  }
  if (result.token && result.user) {
    localStorage.setItem("antivergil-schedule-session", JSON.stringify({ sub: result.user.sub, token: result.token }));
    completeSignIn(result.user);
    return;
  }
  showCodeEntry(result.email);
}

function showCodeEntry(email) {
  verificationEmailAddress = email;
  $("#code-destination").textContent = email;
  lastSubmittedCode = "";
  codeInput.value = "";
  codeInput.dispatchEvent(new Event("input"));
  resendAvailableAt = Date.now() + 60000;
  $("#google-login-mount").hidden = true;
  $("#show-ubc-register").hidden = true;
  $("#outlook-login").hidden = true;
  $("#ubc-email-form").hidden = true;
  $("#code-form").hidden = false;
  codeInput.focus();
}

async function requestUbcCode() {
  const email = $("#ubc-email").value.trim().toLowerCase();
  if (!/^[^\s@]+@student\.ubc\.ca$/i.test(email)) {
    setStatus("Use your UBC student email ending in @student.ubc.ca.");
    return;
  }
  manualUbcMode = true;
  verificationProvider = "email";
  verificationCredential = "";
  outlookLoginTicket = "";
  try { sessionStorage.removeItem(OUTLOOK_TICKET_KEY); } catch (_) {}
  verificationEmailAddress = email;
  setStatus("Sending a verification code…", "info");
  try {
    const result = await emailAuth({ provider: "ubc-email", email });
    clearStatus();
    if (result.token && result.user) {
      localStorage.setItem("antivergil-schedule-session", JSON.stringify({ sub: result.user.sub, token: result.token }));
      completeSignIn(result.user);
      return;
    }
    showCodeEntry(result.email || email);
  } catch (error) {
    setStatus(error.message || "Could not send a code. Try again.");
  }
}

let verifyingCode = false;
let verifiedCode = false;
let lastSubmittedCode = "";
const codeInput = $("#verification-code");
const codeForm = $("#code-form");
const feedback = $("#verification-feedback");
async function verifyEnteredCode() {
  const code = codeInput.value;
  if (!/^\d{6}$/.test(code) || verifyingCode || verifiedCode || code === lastSubmittedCode) return;
  verifyingCode = true;
  lastSubmittedCode = code;
  codeInput.readOnly = true;
  codeForm.setAttribute("aria-busy", "true");
  codeForm.classList.remove("verification-error");
  feedback.textContent = "Verifying…";
  try {
    const payload = manualUbcMode
      ? { provider: "ubc-email", email: verificationEmailAddress, code }
      : { ...verificationPayload(), code };
    const { token, user } = await emailAuth(payload);
    localStorage.setItem("antivergil-schedule-session", JSON.stringify({ sub: user.sub, token }));
    verifiedCode = true;
    codeForm.classList.add("verification-success");
    feedback.textContent = "";
    window.setTimeout(() => completeSignIn(user), 350);
  } catch (error) {
    codeForm.classList.remove("verification-error");
    void codeForm.offsetWidth;
    codeForm.classList.add("verification-error");
    feedback.textContent = "";
    codeInput.readOnly = false;
    codeInput.focus();
    codeInput.select();
  } finally {
    verifyingCode = false;
    codeForm.removeAttribute("aria-busy");
  }
}
codeForm.addEventListener("submit", event => { event.preventDefault(); verifyEnteredCode(); });
codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
  codeForm.classList.remove("verification-error");
  feedback.textContent = "";
  if (codeInput.value !== lastSubmittedCode) lastSubmittedCode = "";
  verifyEnteredCode();
});
$("#show-ubc-register").addEventListener("click", () => {
  manualUbcMode = true;
  verificationProvider = "email";
  outlookLoginTicket = "";
  try { sessionStorage.removeItem(OUTLOOK_TICKET_KEY); } catch (_) {}
  $("#google-login-mount").hidden = true;
  $("#outlook-login").hidden = true;
  $("#show-ubc-register").hidden = true;
  $("#ubc-email-form").hidden = false;
  $("#ubc-email").focus();
});
$("#back-to-google").addEventListener("click", () => {
  manualUbcMode = false;
  verificationProvider = "google";
  $("#ubc-email-form").hidden = true;
  $("#show-ubc-register").hidden = false;
  $("#google-login-mount").hidden = false;
  $("#outlook-login").hidden = false;
  clearStatus();
});
$("#ubc-email-form").addEventListener("submit", event => { event.preventDefault(); requestUbcCode(); });
$("#change-email").addEventListener("click", () => {
  $("#code-form").hidden = true;
  codeInput.value = "";
  codeInput.readOnly = false;
  if (manualUbcMode) {
    $("#ubc-email-form").hidden = false;
    $("#ubc-email").focus();
  } else {
    $("#google-login-mount").hidden = false;
    $("#outlook-login").hidden = false;
    $("#show-ubc-register").hidden = false;
  }
  manualUbcMode = false;
  verificationProvider = "google";
  verificationCredential = "";
  outlookLoginTicket = "";
  try { sessionStorage.removeItem(OUTLOOK_TICKET_KEY); } catch (_) {}
});
$("#resend-code").addEventListener("click", async event => {
  event.target.disabled = true;
  try {
    if (manualUbcMode) {
      const result = await emailAuth({ provider: "ubc-email", email: verificationEmailAddress });
      if (result.token && result.user) {
        localStorage.setItem("antivergil-schedule-session", JSON.stringify({ sub: result.user.sub, token: result.token }));
        completeSignIn(result.user);
      } else {
        resendAvailableAt = Date.now() + 60000;
      }
    } else {
      await sendCode();
    }
  } catch (error) { setStatus(error.message); }
  finally { event.target.disabled = false; }
});
setInterval(() => {
  const seconds = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
  $("#resend-code").disabled = seconds > 0;
  $("#resend-code").textContent = seconds ? "Resend in " + seconds + "s" : "Resend code";
}, 1000);

function beginOutlookSignIn() {
  const configuredUrl = window.COLUMBIA_AUTH?.outlookAuthUrl;
  const base = configuredUrl || window.COLUMBIA_AUTH?.scheduleApi || location.origin;
  const endpoint = new URL(configuredUrl || "/api/outlook-auth", base);
  endpoint.searchParams.set("return_to", location.origin);
  location.assign(endpoint.href);
}

function consumeOutlookRedirect() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const ticket = hash.get("outlook") || "";
  const error = hash.get("outlook_error") || "";
  if (!ticket && !error) return false;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  if (error) {
    const messages = {
      access_denied: "Outlook sign-in was cancelled.",
      cancelled: "Outlook sign-in was cancelled.",
      not_allowed: "Use a supported university Outlook account.",
      unavailable: "Outlook sign-in is temporarily unavailable.",
    };
    setStatus(messages[error] || "Outlook sign-in could not be completed. Try again.");
    return true;
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) {
    setStatus("Outlook sign-in expired. Choose your account again.");
    return true;
  }
  manualUbcMode = false;
  verificationProvider = "outlook";
  verificationCredential = "";
  outlookLoginTicket = ticket;
  try { sessionStorage.setItem(OUTLOOK_TICKET_KEY, ticket); } catch (_) {}
  setStatus("Sending a verification code…", "info");
  sendCode().then(clearStatus).catch(error => setStatus(error.message || "Outlook sign-in failed."));
  return true;
}

$("#outlook-login").addEventListener("click", () => {
  if (!window.AntivergilScheduleCloud?.enabled) {
    setStatus("Outlook sign-in is not configured.");
    return;
  }
  beginOutlookSignIn();
});

if (!consumeOutlookRedirect()) {
  let savedTicket = "";
  try { savedTicket = sessionStorage.getItem(OUTLOOK_TICKET_KEY) || ""; } catch (_) {}
  if (/^[A-Za-z0-9_-]{43}$/.test(savedTicket)) {
    verificationProvider = "outlook";
    outlookLoginTicket = savedTicket;
    setStatus("Sending a verification code…", "info");
    sendCode().then(clearStatus).catch(error => setStatus(error.message || "Outlook sign-in failed."));
  }
}
