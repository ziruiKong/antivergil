const STORAGE_KEY = "cu-auth-user";
const AUTH_COOKIE = "antivergil-auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const NEXT_KEY = "antivergil-next";
const DEFAULT_NEXT = "/browse/";
const $ = (selector) => document.querySelector(selector);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let statusTimer = 0;
let statusHideTimer = 0;
let googleButtonRendered = false;

function isValidEmail(value) {
  const email = String(value || "").trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email);
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
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(JSON.stringify(user))}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  } catch (_) {}
}

function completeSignIn(user) {
  if (!isValidEmail(user.email)) {
    setStatus("Use a valid email address.", "error");
    return;
  }
  saveUser({ ...user, email: user.email.toLowerCase() });
  const next = safeNextPath();
  const profile = window.AntivergilProfile?.read(user.email);
  if (!profile) {
    try { sessionStorage.setItem(NEXT_KEY, next); } catch (_) {}
    location.assign("/onboarding/");
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

function setGoogleControlVisible(visible) {
  $("#google-login-mount").hidden = !(visible && googleButtonRendered);
  $("#google-login").hidden = visible && googleButtonRendered ? true : !visible;
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
          manualEmailMode = false;
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
      googleButtonRendered = true;
      button.hidden = true;
    };
    renderGoogleButton();
    new ResizeObserver(renderGoogleButton).observe(container);
  }).catch(() => setStatus("Google sign-in is temporarily unavailable. Reload to try again."));
} else {
  $("#google-login").disabled = true;
  setStatus("Google sign-in is not configured.");
}


let verificationEmailAddress = "";
let verificationCredential = "";
let manualEmailMode = false;
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
  setGoogleControlVisible(false);
  $("#show-email-register").hidden = true;
  $("#email-register-form").hidden = true;
  $("#code-form").hidden = false;
  codeInput.focus();
}

async function requestEmailCode() {
  const email = $("#registration-email").value.trim().toLowerCase();
  if (!isValidEmail(email)) {
    setStatus("Use a valid email address.");
    return;
  }
  manualEmailMode = true;
  verificationCredential = "";
  verificationEmailAddress = email;
  setStatus("Sending a verification code…", "info");
  try {
    const result = await emailAuth({ provider: "email", email });
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
const localCodePreview = ["localhost", "127.0.0.1"].includes(location.hostname)
  && new URLSearchParams(location.search).get("preview") === "code";
if (localCodePreview) {
  requestAnimationFrame(() => showCodeEntry("student@student.ubc.ca"));
}

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
    const payload = manualEmailMode
      ? { provider: "email", email: verificationEmailAddress, code }
      : { credential: verificationCredential, code };
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
$("#show-email-register").addEventListener("click", () => {
  manualEmailMode = true;
  setGoogleControlVisible(false);
  $("#show-email-register").hidden = true;
  $("#email-register-form").hidden = false;
  $("#registration-email").focus();
});
$("#back-to-google").addEventListener("click", () => {
  manualEmailMode = false;
  $("#email-register-form").hidden = true;
  $("#show-email-register").hidden = false;
  setGoogleControlVisible(true);
  clearStatus();
});
$("#email-register-form").addEventListener("submit", event => { event.preventDefault(); requestEmailCode(); });
$("#change-email").addEventListener("click", () => {
  $("#code-form").hidden = true;
  codeInput.value = "";
  codeInput.readOnly = false;
  if (manualEmailMode) {
    $("#email-register-form").hidden = false;
    $("#registration-email").focus();
  } else {
    setGoogleControlVisible(true);
    $("#show-email-register").hidden = false;
  }
  verificationCredential = "";
});
$("#resend-code").addEventListener("click", async event => {
  event.target.disabled = true;
  try {
    if (manualEmailMode) {
      const result = await emailAuth({ provider: "email", email: verificationEmailAddress });
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
