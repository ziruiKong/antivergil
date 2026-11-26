(() => {
  const find = (id) => document.getElementById(id);
  const panel = find("campus-friends");
  const street = find("campus-street-map");
  const baseButton = find("campus-base-switch");
  const locate = find("campus-locate");
  const share = find("campus-share-location");
  const locationStatus = find("campus-location-status");
  const text = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const center = [40.8077, -73.9621];
  let user, term, social, activeFriend, request, streetLoad, map, markers;
  let watch, own, locationRefreshPending = false, sharing = false, locationWrites = Promise.resolve(), lastSent = 0, sentLocation = false;

  async function call(body) {
    return window.AntivergilScheduleCloud.social(user, body);
  }

  function renderFriends(message = "") {
    if (!panel || !user) return;
    if (!social) {
      const needsGoogle = !user.sub;
      panel.innerHTML = `<div class="my-panel-head"><h2>Friends</h2><span>Share course plans</span></div>
        <p class="campus-friend-status" role="status" aria-live="polite">${text(message || (needsGoogle ? "Friends will be ready when Google is connected." : "Loading…"))}</p>
        ${needsGoogle ? `<form class="campus-friend-verify" data-campus-google-verify hidden>
            <label for="campus-google-code">Verification code</label>
            <div><input id="campus-google-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required placeholder="6-digit code">
              <button type="submit">Verify</button></div>
          </form>` : `<a class="campus-friend-connect" href="/login/?next=%2Faccount%2F">Reconnect Google <span aria-hidden="true">↗</span></a>`}`;
      return;
    }
    const incoming = social.friends.filter((friend) => !friend.accepted && !friend.outgoing);
    const outgoing = social.friends.filter((friend) => !friend.accepted && friend.outgoing);
    const accepted = social.friends.filter((friend) => friend.accepted);
    const selected = accepted.find((friend) => friend.code === activeFriend);
    const shares = selected ? social.shares.filter((entry) => entry.code === selected.code) : [];
    const incomingRows = incoming.map((friend) => `<li class="is-incoming"><div class="campus-friend-person"><b>${text(friend.name)}</b><span class="campus-friend-tag">Needs your response</span></div>
      <div class="campus-friend-actions"><button data-friend-action="accept" data-code="${text(friend.code)}">Accept</button>
      <button data-friend-action="remove" data-code="${text(friend.code)}">Decline</button></div></li>`).join("");
    const outgoingRows = outgoing.map((friend) => `<li><div class="campus-friend-person"><b>${text(friend.name)}</b><span class="campus-friend-tag">Awaiting response</span></div>
      <button data-friend-action="remove" data-code="${text(friend.code)}">Cancel request</button></li>`).join("");
    const acceptedRows = accepted.map((friend) => `<li><div class="campus-friend-person"><b>${text(friend.name)}</b></div>
      <div class="campus-friend-actions"><button data-friend-action="open" data-code="${text(friend.code)}">View profile</button>
      <button data-friend-action="remove" data-code="${text(friend.code)}">Remove</button></div></li>`).join("");
    panel.innerHTML = `<div class="my-panel-head"><h2>Friends</h2><span>Share course plans</span></div>
      <div class="campus-friend-toolbar">
        <div class="campus-friend-code"><span>Your friend code</span><code>${text(social.code)}</code></div>
        <form id="campus-friend-invite" class="campus-friend-invite"><label for="campus-friend-code">Add a friend</label>
          <div class="campus-friend-invite-row"><input id="campus-friend-code" name="code" required pattern="[A-Za-z0-9_\\-]{12}" maxlength="12" placeholder="Friend code">
          <button type="submit">Send request</button></div>
        </form>
      </div>
      <p id="campus-friend-status" class="campus-friend-status ${message ? "has-update" : ""}" role="status" aria-live="polite">${text(message)}</p>
      <section class="campus-friend-group" aria-labelledby="campus-incoming-heading">
        <div class="campus-friend-group-head"><h3 id="campus-incoming-heading">Incoming requests</h3>
          <span class="campus-friend-request-count ${incoming.length ? "has-requests" : ""}">${incoming.length ? `${incoming.length} waiting` : "None"}</span></div>
        ${incoming.length ? `<ul class="campus-friend-list">${incomingRows}</ul>` : '<p class="campus-friend-empty">No new requests right now.</p>'}
      </section>
      ${outgoing.length ? `<section class="campus-friend-group" aria-labelledby="campus-outgoing-heading">
        <div class="campus-friend-group-head"><h3 id="campus-outgoing-heading">Sent requests</h3></div>
        <ul class="campus-friend-list">${outgoingRows}</ul></section>` : ""}
      ${accepted.length ? `<section class="campus-friend-group" aria-labelledby="campus-accepted-heading">
        <div class="campus-friend-group-head"><h3 id="campus-accepted-heading">Your friends</h3></div>
        <ul class="campus-friend-list">${acceptedRows}</ul></section>` : ""}
      ${selected ? `<section class="campus-friend-profile">
        <h3>${text(selected.name)}</h3>
        <button data-friend-action="share" data-code="${text(selected.code)}">Share my ${text(term.replace("-", " "))} courses</button>
        <h4>Courses shared with you</h4>
        ${shares.length ? shares.map((entry) => `<p><strong>${text(entry.term.replace("-", " "))}</strong> · ${entry.sections.map((section) => text(section.code)).join(", ")}</p>`).join("") : "<p>No courses shared yet.</p>"}
      </section>` : ""}`;
  }

  async function refresh() {
    if (!user?.sub || request) return request;
    const account = user.sub;
    request = call().then((response) => {
      if (user?.sub !== account) return;
      const previous = social;
      const acceptedByOther = previous?.friends.find((friend) => friend.outgoing && !friend.accepted
        && response.friends.some((next) => next.code === friend.code && next.accepted));
      const newIncoming = response.friends.filter((friend) => !friend.accepted && !friend.outgoing
        && !previous?.friends.some((old) => old.code === friend.code && !old.accepted && !old.outgoing));
      const changed = !previous || JSON.stringify([previous.code, previous.shares, previous.friends.map(({code, name, accepted, outgoing}) => [code, name, accepted, outgoing])])
        !== JSON.stringify([response.code, response.shares, response.friends.map(({code, name, accepted, outgoing}) => [code, name, accepted, outgoing])]);
      social = response;
      if (changed) {
        const message = acceptedByOther
          ? `${acceptedByOther.name} accepted your friend request. You are now friends.`
          : newIncoming.length === 1
            ? `${newIncoming[0].name} sent you a friend request.`
            : newIncoming.length > 1
              ? `You have ${newIncoming.length} new friend requests.`
              : "";
        renderFriends(message);
      }
      share.hidden = false;
      renderPoints();
    }).catch((error) => {
      if (!social && user?.sub === account) renderFriends(error.message);
    }).finally(() => { request = null; });
    return request;
  }

  async function perform(action, code) {
    const friend = social?.friends.find((entry) => entry.code === code);
    const name = friend?.name || "your friend";
    try {
      await call({ action, code, term });
      if (request) await request;
      await refresh();
      const status = find("campus-friend-status");
      if (status) {
        status.textContent = ({
          share: "Courses shared.",
          invite: "Friend request sent. Waiting for a response.",
          accept: `You and ${name} are now friends.`,
          remove: friend?.accepted ? "Friend removed." : friend?.outgoing ? "Friend request canceled." : "Friend request declined.",
        })[action];
        status.classList.add("has-update");
        status.classList.remove("is-error");
      }
    } catch (error) {
      const status = find("campus-friend-status");
      if (status) {
        status.textContent = error.message;
        status.classList.remove("has-update");
        status.classList.add("is-error");
      }
    }
  }

  panel?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.matches("[data-campus-google-verify]")) {
      const code = new FormData(event.target).get("code").trim();
      document.dispatchEvent(new CustomEvent("campus-google-verification", { detail: { code } }));
      return;
    }
    if (event.target.id === "campus-friend-invite") {
      perform("invite", new FormData(event.target).get("code").trim());
    }
  });
  panel?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-friend-action]");
    if (!button) return;
    const { friendAction: action, code } = button.dataset;
    if (action === "open") {
      activeFriend = code;
      renderFriends();
    } else {
      perform(action, code);
    }
  });

  function renderPoints() {
    const people = (social?.friends || []).filter((friend) => friend.accepted && Number.isFinite(friend.latitude) && Number.isFinite(friend.longitude) && Date.parse(friend.expiresAt) > Date.now());
    if (own) people.push(own);
    window.updateCampusLivePoints?.(people);
    if (!markers) return;
    markers.clearLayers();
    for (const point of people) {
      const coordinates = [point.latitude, point.longitude];
      const tooltip = document.createElement("span");
      tooltip.textContent = point.name;
      if (point.self && point.accuracy > 0) {
        L.circle(coordinates, { radius: point.accuracy, weight: 1, color: "#245d8e", fillOpacity: 0.09 }).addTo(markers);
      }
      L.circleMarker(coordinates, { radius: 7, color: "#fff", weight: 2,
        fillColor: point.self ? "#245d8e" : "#9b3151", fillOpacity: 1 }).bindTooltip(tooltip).addTo(markers);
    }
  }

  function loadStreetMap() {
    if (streetLoad) return streetLoad;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    css.crossOrigin = "anonymous";
    document.head.append(css);
    streetLoad = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        css.remove();
        streetLoad = null;
        reject(new Error("Street map unavailable."));
      };
      document.head.append(script);
    }).then(() => {
      map = L.map(street, { zoomControl: false }).setView(center, 17);
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      L.tileLayer(window.COLUMBIA_MAPS?.streetTiles || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      }).addTo(map);
      markers = L.layerGroup().addTo(map);
      renderPoints();
    });
    return streetLoad;
  }

  async function switchBase(showStreet) {
    street.hidden = !showStreet;
    baseButton.textContent = showStreet ? "Campus model" : "Street map";
    baseButton.setAttribute("aria-pressed", String(showStreet));
    if (!showStreet) return;
    try {
      await loadStreetMap();
      if (!street.hidden) map.invalidateSize();
    } catch (error) {
      switchBase(false);
      locationStatus.textContent = error.message;
    }
  }

  function sendLocation(point) {
    const account = user;
    if (!account?.sub) return;
    locationWrites = locationWrites.catch(() => {}).then(() =>
      window.AntivergilScheduleCloud.social(account, { action: "location", latitude: point?.latitude ?? null, longitude: point?.longitude ?? null })
    ).catch((error) => {
      if (sharing || !point) locationStatus.textContent = error.message;
    });
  }

  function shareCurrent() {
    if (!sharing || !own || Date.now() - own.timestamp > 45000 || Date.now() - lastSent < 15000) return;
    const { latitude, longitude } = own;
    if (latitude < 40.802 || latitude > 40.814 || longitude < -73.971 || longitude > -73.953) {
      if (sentLocation) sendLocation(null);
      sentLocation = false;
      locationStatus.textContent = "Live sharing is available near Morningside campus.";
      return;
    }
    locationStatus.textContent = "Sharing with accepted friends.";
    lastSent = Date.now();
    sentLocation = true;
    sendLocation(own);
  }

  function stopSharing() {
    if (sentLocation) sendLocation(null);
    sharing = false;
    sentLocation = false;
    lastSent = 0;
    share.textContent = "Share with friends";
    share.setAttribute("aria-pressed", "false");
  }

  function stop() {
    if (watch !== undefined) navigator.geolocation.clearWatch(watch);
    watch = undefined;
    own = null;
    stopSharing();
    locate.setAttribute("aria-pressed", "false");
    locate.textContent = "Locate me";
    locationStatus.textContent = "";
    renderPoints();
  }

  function start() {
    if (!navigator.geolocation) { locationStatus.textContent = "Location is unavailable in this browser."; return; }
    locationStatus.textContent = "Finding your location…";
    locate.setAttribute("aria-pressed", "true");
    locate.textContent = "Stop locating";
    watch = navigator.geolocation.watchPosition(updatePosition, (error) => {
      if (error.code === 1) stop();
      locationStatus.textContent = error.code === 1 ? "Location access denied." : "Waiting for a location fix.";
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
  }

  async function updatePosition({ coords, timestamp }) {
    if (watch === undefined) return;
    const first = !own;
    own = { name: "You", self: true, timestamp, latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
    locationStatus.textContent = "Your location · ±" + Math.round(coords.accuracy) + " m";
    renderPoints();
    if (first && street.hidden && (Math.abs(coords.latitude - center[0]) > 0.003 || Math.abs(coords.longitude - center[1]) > 0.005)) {
      await switchBase(true);
    }
    if (first && map && !street.hidden && own) map.setView([own.latitude, own.longitude], 17);
    shareCurrent();
  }

  baseButton?.addEventListener("click", () => switchBase(street.hidden));
  locate?.addEventListener("click", () => watch === undefined ? start() : stop());
  share?.addEventListener("click", () => {
    if (sharing) { stopSharing(); locationStatus.textContent = "Sharing stopped."; return; }
    sharing = true;
    share.textContent = "Stop sharing";
    share.setAttribute("aria-pressed", "true");
    if (!navigator.geolocation) { stopSharing(); start(); return; }
    if (watch === undefined) start();
    else shareCurrent();
  });
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopSharing();
    else if (!find("view-map")?.hidden || !find("view-me")?.hidden) refresh();
  });
  setInterval(() => {
    if (document.hidden) return;
    renderPoints();
    if (!find("view-map")?.hidden || !find("view-me")?.hidden) refresh();
    if (!find("view-map")?.hidden) {
      shareCurrent();
      if (sharing && !locationRefreshPending && Date.now() - (own?.timestamp || 0) > 30000) {
        locationRefreshPending = true;
        navigator.geolocation.getCurrentPosition((position) => {
          locationRefreshPending = false;
          if (sharing) updatePosition(position);
        }, () => { locationRefreshPending = false; }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 });
      }
    } else if (watch !== undefined) stop();
  }, 12000);

  window.CampusSocial = {
    setGoogleConnectStatus(message, error = false) {
      const status = find("campus-friend-status");
      if (!status) return;
      status.textContent = message || "";
      status.classList.toggle("is-error", Boolean(error));
    },
    showGoogleVerification(email) {
      const status = find("campus-friend-status");
      const form = panel?.querySelector("[data-campus-google-verify]");
      if (status) {
        status.textContent = `A code was sent to ${email}. Enter it here to finish connecting.`;
        status.classList.remove("is-error");
      }
      if (form) {
        form.hidden = false;
        form.querySelector("input")?.focus();
      }
    },
    setAccount(account, currentTerm) {
      const changed = user?.sub !== account?.sub || term !== currentTerm;
      user = account;
      term = currentTerm;
      if (panel) panel.hidden = !user;
      if (changed) renderFriends();
      if (user?.sub) refresh();
    },
    stop,
  };
})();
