(() => {
  const find = (id) => document.getElementById(id);
  const panel = find("community-chat-root");
  const street = find("campus-street-map");
  const baseButton = find("campus-base-switch");
  const locate = find("campus-locate");
  const share = find("campus-share-location");
  const locationStatus = find("campus-location-status");
  const text = (value) => String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const center = [40.8077, -73.9621];
  let user, term, social, activeFriend, request, streetLoad, map, markers;
  let pendingMessages = [];
  let communityTab = 'chats';
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
    if (!accepted.some((friend) => friend.code === activeFriend)) activeFriend = accepted[0]?.code;
    const selected = accepted.find((friend) => friend.code === activeFriend);
    const incomingRows = incoming.map((friend) => `<li class="is-incoming"><div class="campus-friend-person"><b>${text(friend.name)}</b><span class="campus-friend-tag">Needs your response</span></div>
      <div class="campus-friend-actions"><button data-friend-action="accept" data-code="${text(friend.code)}">Accept</button>
      <button data-friend-action="remove" data-code="${text(friend.code)}">Decline</button></div></li>`).join("");
    const outgoingRows = outgoing.map((friend) => `<li><div class="campus-friend-person"><b>${text(friend.name)}</b><span class="campus-friend-tag">Awaiting response</span></div>
      <button data-friend-action="remove" data-code="${text(friend.code)}">Cancel request</button></li>`).join("");
    const acceptedRows = accepted.map((friend) => `<li><div class="campus-friend-person"><b>${text(friend.name)}</b></div>
      <div class="campus-friend-actions"><button data-friend-action="open" data-code="${text(friend.code)}">Message</button>
      <button data-friend-action="remove" data-code="${text(friend.code)}">Remove</button></div></li>`).join("");
    const messages = (social.messages || []).filter((entry) => entry.code === activeFriend);
    const conversations = accepted.map((friend) => {
      const last = (social.messages || []).filter((entry) => entry.code === friend.code).at(-1);
      const preview = last?.attachment?.kind === "schedule"
        ? `${scheduleTermLabel(last.attachment.term)} schedule · ${last.attachment.sections?.length || 0} courses`
        : last?.body || "Start a conversation";
      return `<button type="button" class="community-conversation ${friend.code === activeFriend ? "is-active" : ""}" data-name="${text(friend.name.toLowerCase())}" data-friend-action="open" data-code="${text(friend.code)}"><span class="community-avatar">${text(friend.name.trim().charAt(0).toUpperCase())}</span><span class="community-conversation-copy"><b>${text(friend.name)}</b><small>${text(preview)}</small></span>${last ? `<time class="community-list-time">${text(new Date(last.createdAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}))}</time>` : ''}</button>`;
    }).join("");
    const chat = selected ? `<header class="community-chat-head"><b>${text(selected.name)}</b></header>
      <div class="community-messages" aria-live="polite">${messages.length ? messages.map((entry) => `<div class="community-message ${entry.mine ? "is-mine" : ""} ${entry.pending ? "is-pending" : ""} ${entry.attachment?.kind === "schedule" ? "has-schedule" : entry.attachment?.kind === "file" ? `has-file ${String(entry.attachment.mime || "").startsWith("image/") ? "has-image" : ""}` : ""}">${messageContent(entry)}<time datetime="${text(entry.createdAt)}">${text(new Date(entry.createdAt).toLocaleString("en-US", {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"}))}</time></div>`).join("") : '<p class="community-chat-empty">Say hello to start your conversation.</p>'}</div>
      <form id="community-message-form" class="community-compose"><details class="attachment-menu"><summary aria-label="Add attachment">＋</summary><div><label>File or photo<input type="file" data-upload hidden></label><button type="button" data-share-term>Share schedule</button></div></details><label class="community-sr-only" for="community-message-input">Message</label><textarea id="community-message-input" name="body" maxlength="2000" required></textarea><button type="submit" aria-label="Send message" title="Send (Enter)"><svg width="20" height="20" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></button></form>` : `<div class="community-empty-state"><svg aria-hidden="true" viewBox="0 0 48 48" fill="none"><path d="M7 21c0-7.2 7-13 15.6-13S38 13.8 38 21 31 34 22.6 34c-2 0-4-.3-5.7-1l-6.4 3 1.5-5.5C8.9 28.2 7 24.8 7 21Z" fill="currentColor"/><circle cx="17" cy="19" r="1.6" fill="#f8f8f7"/><circle cx="27" cy="19" r="1.6" fill="#f8f8f7"/></svg><span>${accepted.length ? 'Select a conversation' : 'Add a friend to start chatting'}</span></div>`;
    panel.innerHTML = `<div class="community-tabs" hidden></div>
      <div id="community-panel-chats" ${communityTab === 'chats' ? '' : 'hidden'}><div class="community-layout"><aside class="community-sidebar"><header class="community-list-heading"><div class="community-search"><label class="community-sr-only" for="community-search-input">Search conversations</label><input id="community-search-input" type="search" placeholder="Search"></div><button type="button" class="community-add" data-community-tab="friends" aria-label="Add a friend" title="Add a friend">＋</button></header><div class="community-conversations">${conversations || '<p class="community-chat-empty">No conversations yet.</p>'}</div></aside><section class="community-chat" aria-label="Conversation">${chat}</section></div></div>
      <p id="campus-friend-status" class="campus-friend-status ${message ? "has-update" : ""}" role="status" aria-live="polite">${text(message)}</p>
      <section id="community-panel-friends" class="community-friend-settings" ${communityTab === 'friends' ? '' : 'hidden'}><div class="community-friends-heading"><button type="button" class="community-back-to-chats" data-community-tab="chats">← Chats</button><div><h3>Friends and invitations</h3><p>Manage your friends and requests.</p></div></div>
      <div class="campus-friend-toolbar">
        <div class="campus-friend-code"><span>Your friend code</span><code>${text(social.code)}</code></div>
        <form id="campus-friend-invite" class="campus-friend-invite"><label for="campus-friend-code">Add a friend</label>
          <div class="campus-friend-invite-row"><input id="campus-friend-code" name="code" required pattern="[A-Za-z0-9_\\-]{12}" maxlength="12" placeholder="Friend code">
          <button type="submit">Send request</button></div>
        </form>
      </div>
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
      </section>
      <div id="community-toast" class="community-toast" role="status" aria-live="polite" hidden></div>`;
    const scroller = panel.querySelector(".community-messages");
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    hydrateMediaAttachments();
  }

  const scheduleCatalogCache = new Map();
  const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function scheduleTermLabel(term) {
    const match = String(term || "").match(/^(\d{4})-(Spring|Summer|Fall|Winter)$/);
    return match ? `${match[2]} ${match[1]}` : String(term || "Course");
  }

  function scheduleCatalog(term) {
    if (scheduleCatalogCache.has(term)) return scheduleCatalogCache.get(term);
    const globalName = `COURSES_${String(term || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
    const sources = [
      window[globalName],
      window.COURSES_2027_SPRING,
      window.COURSES_2026_FALL,
      window.COURSES_2026_SPRING,
    ];
    const catalog = new Map();
    const key = (classId, code) => `${String(classId)}:${String(code || "").trim().toUpperCase().replace(/\s+/g, " ")}`;
    for (const course of sources.flatMap((source) => Array.isArray(source) ? source : [])) {
      if (!course?.classId) continue;
      catalog.set(key(course.classId, course.code), course);
    }
    scheduleCatalogCache.set(term, catalog);
    return catalog;
  }

  function formatScheduleTime(section) {
    const minutes = (value) => {
      if (!Number.isFinite(value)) return "";
      const hour = Math.floor(value / 60);
      const minute = value % 60;
      const ampm = hour < 12 ? "am" : "pm";
      return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${ampm}`;
    };
    const start = section.startLabel || minutes(section.start);
    const end = section.endLabel || minutes(section.end);
    return start && end ? `${start}–${end}` : "Time TBA";
  }

  function scheduleRows(item) {
    const catalog = scheduleCatalog(item.term);
    return (Array.isArray(item.sections) ? item.sections : []).map((section) => {
      const classId = String(section.classId || "");
      const normalizedCode = String(section.code || "").trim().toUpperCase().replace(/\s+/g, " ");
      const course = catalog.get(`${classId}:${normalizedCode}`) || null;
      const days = (course?.days || section.days || [])
        .map((day) => weekdayShort[Number(day) - 1])
        .filter(Boolean);
      return {
        source: section,
        course,
        code: course?.code || section.code || "Course",
        title: course?.title || section.title || "",
        section: classId.split("-").pop() || section.callNumber || "—",
        instructor: course?.instructor || section.instructor || "",
        meeting: days.length ? `${days.join(" ")} · ${formatScheduleTime(course || section)}` : "Time TBA",
      };
    });
  }

  function scheduleAttachment(entry) {
    const item = entry.attachment;
    const rows = scheduleRows(item);
    const count = rows.length;
    const table = count ? `<div class="community-schedule-table-wrap"><table>
      <thead><tr><th>Course</th><th class="community-schedule-section-col">Section</th><th>Meeting</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <td><b>${text(row.code)}</b>${row.title ? `<span>${text(row.title)}</span>` : ""}</td>
        <td class="community-schedule-section-col"><b>${text(row.section)}</b>${row.instructor ? `<span>${text(row.instructor)}</span>` : ""}</td>
        <td>${text(row.meeting)}</td>
      </tr>`).join("")}</tbody>
    </table></div>` : '<p class="community-schedule-empty">No courses in this schedule.</p>';
    return `<section class="community-schedule-card" aria-label="${text(scheduleTermLabel(item.term))} course schedule">
      <header><div><b>${text(scheduleTermLabel(item.term))} schedule</b><span>${count} ${count === 1 ? "course" : "courses"}</span></div><span class="community-schedule-mark">SCHEDULE</span></header>
      ${table}
      <button type="button" data-attachment="${text(entry.id)}" data-schedule-count="${count}">Add ${count} ${count === 1 ? "course" : "courses"} to my calendar</button>
    </section>`;
  }

  function fileDetails(item, entry) {
    const name = String(item.name || entry.body || "File").trim();
    const mime = String(item.mime || "").toLowerCase();
    const fromName = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
    const extension = fromName || mime.split("/").pop() || "file";
    const kind = extension === "pdf" ? "pdf"
      : ["doc", "docx", "rtf", "pages"].includes(extension) ? "document"
        : ["xls", "xlsx", "csv", "numbers"].includes(extension) ? "spreadsheet"
          : ["ppt", "pptx", "key"].includes(extension) ? "presentation"
            : ["zip", "rar", "7z", "tar", "gz"].includes(extension) ? "archive"
              : mime.startsWith("image/") ? "image"
                : ["txt", "md", "json", "js", "ts", "html", "css"].includes(extension) ? "text"
                  : "file";
    const label = {
      pdf: "PDF document",
      document: "Document",
      spreadsheet: "Spreadsheet",
      presentation: "Presentation",
      archive: "Archive",
      image: "Image",
      text: "Text file",
      file: "File",
    }[kind];
    return { name, extension: extension.slice(0, 6).toUpperCase(), kind, label, isImage: mime.startsWith("image/") };
  }

  function fileAttachment(entry) {
    const item = entry.attachment;
    const file = fileDetails(item, entry);
    if (file.isImage) {
      return `<article class="community-image-message" data-download-attachment="${text(entry.id)}" role="button" tabindex="0" aria-label="Download ${text(file.name)}" title="Click to download ${text(file.name)}">
        <div class="community-image-preview" data-image-attachment="${text(entry.id)}"><span>Loading image…</span></div>
      </article>`;
    }
    return `<article class="community-file-card" data-file-kind="${file.kind}" data-download-attachment="${text(entry.id)}" role="button" tabindex="0" aria-label="Download ${text(file.name)}" title="Click to download ${text(file.name)}">
      <div class="community-file-info">
        <span class="community-file-icon" aria-hidden="true">${text(file.extension)}</span>
        <div class="community-file-copy"><b>${text(file.name)}</b><span>${text(file.label)}</span></div>
        <span class="community-file-arrow" aria-hidden="true">↓</span>
      </div>
    </article>`;
  }

  function messageContent(entry) {
    if (entry.attachment?.kind === "schedule") return scheduleAttachment(entry);
    if (entry.attachment?.kind === "file") return fileAttachment(entry);
    return `<p>${text(entry.body)}</p>`;
  }

  let attachmentObserver;
  async function loadCommunityImage(slot) {
    if (slot.dataset.loading === "true") return;
    slot.dataset.loading = "true";
    const scroller = slot.closest(".community-messages");
    const followBottom = scroller
      && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 100;
    const entry = social?.messages?.find((message) => String(message.id) === slot.dataset.imageAttachment);
    try {
      const { data } = await window.AntivergilScheduleCloud.attachment(user, slot.dataset.imageAttachment);
      const blob = new Blob(
        [Uint8Array.from(atob(data), (character) => character.charCodeAt(0))],
        { type: entry?.attachment?.mime || "image/jpeg" },
      );
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.alt = entry?.attachment?.name || entry?.body || "Shared image";
      image.loading = "lazy";
      image.decoding = "async";
      image.onload = () => URL.revokeObjectURL(url);
      image.onerror = () => {
        URL.revokeObjectURL(url);
        slot.innerHTML = "<span>Preview unavailable</span>";
      };
      image.src = url;
      slot.replaceChildren(image);
      if (followBottom) requestAnimationFrame(() => { scroller.scrollTop = scroller.scrollHeight; });
    } catch {
      slot.innerHTML = "<span>Preview unavailable</span>";
    }
    slot.dataset.loading = "false";
  }

  function hydrateMediaAttachments() {
    attachmentObserver?.disconnect();
    const slots = [...(panel?.querySelectorAll("[data-image-attachment]") || [])];
    if (!slots.length) return;
    if (!("IntersectionObserver" in window)) {
      slots.forEach(loadCommunityImage);
      return;
    }
    attachmentObserver = new IntersectionObserver((entries, observer) => {
      for (const item of entries) {
        if (!item.isIntersecting) continue;
        observer.unobserve(item.target);
        loadCommunityImage(item.target);
      }
    }, { root: panel.querySelector(".community-messages"), rootMargin: "240px 0px" });
    slots.forEach((slot) => attachmentObserver.observe(slot));
  }

  async function attachmentAction(work) {
    try { await work(); }
    catch (error) {
      const status = find("campus-friend-status");
      if (status) status.textContent = "";
      showCommunityToast(error.message, true);
    }
  }

  let communityToastTimer;
  function showCommunityToast(message, error = false) {
    const toast = find("community-toast");
    if (!toast || !message) return;
    clearTimeout(communityToastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", error);
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    communityToastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => { toast.hidden = true; }, 180);
    }, 2800);
  }
  panel?.addEventListener("change", event => {
    if (!event.target.matches("[data-upload]")) return;
    const file = event.target.files[0], code = activeFriend;
    if (!file) return;
    attachmentAction(async () => {
      if (!file.size || file.size > 2097152) throw new Error("Choose a nonempty file up to 2 MB.");
      const reader = new FileReader();
      const encoded = await new Promise((resolve,reject) => {
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsDataURL(file);
      });
      await call({action:"file",code,name:file.name,mime:file.type,data:encoded});
      if (request) await request;
      await refresh();
    });
  });
  panel?.addEventListener("click", event => {
    const target = event.target.closest("[data-download-attachment]");
    if (!target) return;
    attachmentAction(async () => {
      target.setAttribute("aria-busy", "true");
      try {
        const entry = social.messages.find((message) => String(message.id) === target.dataset.downloadAttachment);
        if (!entry) throw new Error("Attachment unavailable.");
        const { data } = await window.AntivergilScheduleCloud.attachment(user, entry.id);
        const blob = new Blob(
          [Uint8Array.from(atob(data), (character) => character.charCodeAt(0))],
          { type: entry.attachment.mime || "application/octet-stream" },
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = entry.attachment.name || entry.body || "attachment";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        showCommunityToast(`Downloading ${link.download}`);
      } finally {
        target.removeAttribute("aria-busy");
      }
    });
  });
  panel?.addEventListener("keydown", (event) => {
    const target = event.target.closest?.('[data-download-attachment][role="button"]');
    if (!target || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    target.click();
  });
  panel?.addEventListener("click", event => {
    const button = event.target.closest("[data-share-term],[data-attachment]");
    if (!button) return;
    attachmentAction(async () => {
      button.disabled = true;
      try {
        if (button.hasAttribute("data-share-term")) {
          await call({action:"schedule",code:activeFriend,term});
          if (request) await request;
          await refresh();
          return;
        }
        const entry = social.messages.find(m => String(m.id) === button.dataset.attachment);
        if (entry.attachment.kind === "schedule") {
          const rows = scheduleRows(entry.attachment);
          await window.importCommunitySchedule({
            term: entry.attachment.term,
            sections: rows.map((row) => row.course || row.source),
          });
          button.textContent = "Added to my calendar";
          button.classList.add("is-added");
          showCommunityToast(`${scheduleTermLabel(entry.attachment.term)} schedule added to your calendar.`);
          return;
        }
      } finally { button.disabled = false; }
    });
  });

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
      const responseMessages = response.messages || [];
      const matchedPending = new Set();
      for (const message of responseMessages) {
        const match = pendingMessages.find((pending) => !matchedPending.has(pending.id)
          && pending.userSub === account && pending.code === message.code
          && pending.body === message.body && Boolean(message.mine)
          && Math.abs(Date.parse(message.createdAt) - Date.parse(pending.createdAt)) < 10 * 60 * 1000);
        if (match) matchedPending.add(match.id);
      }
      pendingMessages = pendingMessages.filter((pending) => !matchedPending.has(pending.id));
      const visibleMessages = [
        ...responseMessages,
        ...pendingMessages.filter((pending) => pending.userSub === account),
      ];
      const changed = !previous || JSON.stringify([previous.code, previous.shares, previous.messages, previous.friends.map(({code, name, accepted, outgoing}) => [code, name, accepted, outgoing])])
        !== JSON.stringify([response.code, response.shares, response.messages, response.friends.map(({code, name, accepted, outgoing}) => [code, name, accepted, outgoing])]);
      social = { ...response, messages: visibleMessages };
      if (changed) {
        const draft = panel.querySelector('#community-message-input')?.value || '';
        const composing = document.activeElement === panel.querySelector('#community-message-input');
        const message = acceptedByOther
          ? `${acceptedByOther.name} accepted your friend request. You are now friends.`
          : newIncoming.length === 1
            ? `${newIncoming[0].name} sent you a friend request.`
            : newIncoming.length > 1
              ? `You have ${newIncoming.length} new friend requests.`
              : "";
        renderFriends(message);
        if (panel.querySelector('#community-message-input')) panel.querySelector('#community-message-input').value = draft;
        if (composing) panel.querySelector('#community-message-input')?.focus();
      }
      share.hidden = false;
      renderPoints();
      return social;
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
        status.textContent = action === "share" ? "" : ({
          share: "Courses shared.",
          invite: "Friend request sent. Waiting for a response.",
          accept: `You and ${name} are now friends.`,
          remove: friend?.accepted ? "Friend removed." : friend?.outgoing ? "Friend request canceled." : "Friend request declined.",
        })[action];
        status.classList.toggle("has-update", action !== "share");
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

  panel?.addEventListener("keydown", (event) => {
    const input = event.target;
    if (input.id !== "community-message-input" || event.key !== "Enter" ||
        event.shiftKey || event.ctrlKey || event.metaKey || event.altKey ||
        event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    const send = input.form.querySelector('button[type="submit"]');
    if (!event.repeat && input.value.trim() && !send.disabled) input.form.requestSubmit(send);
  });
  panel?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.id === "community-message-form") {
      const form = event.target;
      const input = form.elements.body;
      const body = input.value.trim();
      if (!body || !activeFriend) return;
      const recipient = activeFriend;
      form.querySelector('[type="submit"]').disabled = true;
      const optimistic = {
        id: `pending-${crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`,
        userSub: user?.sub,
        code: recipient,
        mine: true,
        body,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      pendingMessages.push(optimistic);
      social = { ...social, messages: [...(social.messages || []), optimistic] };
      input.value = '';
      renderFriends();
      panel.querySelector('#community-message-input')?.focus();
      call({action: 'message', code: recipient, body}).then(async () => {
        if (request) await request;
        await refresh();
      }).catch((error) => {
        pendingMessages = pendingMessages.filter((message) => message.id !== optimistic.id);
        if (social) social.messages = social.messages.filter((message) => message.id !== optimistic.id);
        renderFriends(error.message);
      }).finally(() => {
        const sendButton = panel.querySelector('#community-message-form [type="submit"]');
        if (sendButton) sendButton.disabled = false;
      });
      return;
    }
    if (event.target.matches("[data-campus-google-verify]")) {
      const code = new FormData(event.target).get("code").trim();
      document.dispatchEvent(new CustomEvent("campus-google-verification", { detail: { code } }));
      return;
    }
    if (event.target.id === "campus-friend-invite") {
      perform("invite", new FormData(event.target).get("code").trim());
    }
  });
  panel?.addEventListener('input', (event) => {
    if (event.target.id !== 'community-search-input') return;
    const query = event.target.value.trim().toLowerCase();
    panel.querySelectorAll('.community-conversation').forEach((row) => { row.hidden = !row.dataset.name.includes(query); });
  });
  panel?.addEventListener("click", (event) => {
    const tabButton = event.target.closest('[data-community-tab]');
    if (tabButton) {
      communityTab = tabButton.dataset.communityTab;
      renderFriends();
      panel.querySelector(`[data-community-tab="${communityTab}"]`)?.focus();
      return;
    }
    const button = event.target.closest("[data-friend-action]");
    if (!button) return;
    const { friendAction: action, code } = button.dataset;
    if (action === "open") {
      activeFriend = code;
      if (communityTab === "friends") communityTab = "chats";
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
    else if (!find("view-map")?.hidden || !find("view-community")?.hidden) refresh();
  });
  setInterval(() => {
    if (document.hidden) return;
    renderPoints();
    if (!find("view-map")?.hidden || !find("view-community")?.hidden) refresh();
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
      if (user?.sub !== account?.sub) pendingMessages = [];
      user = account;
      term = currentTerm;
      if (panel) panel.hidden = !user;
      if (changed) renderFriends();
      if (user?.sub) refresh();
    },
    stop,
  };
})();
