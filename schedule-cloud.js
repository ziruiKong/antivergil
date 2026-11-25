(function () {
  const calendarTerm = "_calendar";
  const sessionKey = "antivergil-schedule-session";
  const endpoint = window.COLUMBIA_AUTH?.scheduleApi;
  let pending = Promise.resolve();
  const queueKey = (user) => `antivergil-schedule-outbox:${user.sub}`;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }

  async function request(method, body, token) {
    const response = await fetch(endpoint, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Cloud schedule sync failed.");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function session(user) {
    const value = read(sessionKey, null);
    if (!user?.sub || value?.sub !== user.sub || !value?.token) {
      const error = new Error("Sign in again to sync your schedule.");
      error.status = 401;
      throw error;
    }
    return value.token;
  }

  const serialize = (sections) => sections.map(({ classId, code }) => ({ classId: String(classId), code }));

  const sectionKey = (item) => item.classId + ":" + String(item.code || "").trim().toUpperCase().replace(/\s+/g, " ");

  function applyChanges(sections, changes) {
    const key = changes.term === calendarTerm ? (item) => item.id : sectionKey;
    const selected = new Map(sections.map((item) => [key(item), item]));
    for (const id of changes.remove) {
      selected.delete(id);
      // Older course outboxes used the section ID alone.
      if (changes.term !== calendarTerm && !id.includes(":")) {
        for (const [entry, item] of selected) if (item.classId === id) selected.delete(entry);
      }
    }
    for (const item of changes.add) selected.set(key(item), item);
    return [...selected.values()];
  }

  async function fetchRows(token) {
    const { schedules, calendar } = await request("GET", null, token);
    return calendar ? [...schedules, calendar] : schedules;
  }

  async function synchronize(user, previousSchedules) {
    const token = session(user);
    const remote = new Map((await fetchRows(token)).map((row) => [row.term, row]));
    for (const [term, sections] of Object.entries(previousSchedules)) {
      if (remote.has(term) || !sections.length) continue;
      try {
        const row = await request("PUT", { term, sections: serialize(sections), revision: 0 }, token);
        remote.set(term, row);
      } catch (error) {
        if (error.status !== 409) throw error;
        for (const row of await fetchRows(token)) remote.set(row.term, row);
      }
    }

    for (const changes of read(queueKey(user), [])) {
      let saved;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const current = remote.get(changes.term);
        const sections = applyChanges(current?.sections || [], changes);
        try {
          saved = await request("PUT", { term: changes.term, sections, revision: current?.revision || 0 }, token);
          break;
        } catch (error) {
          if (error.status !== 409) throw error;
          for (const row of await fetchRows(token)) remote.set(row.term, row);
        }
      }
      if (!saved) throw new Error("Your schedule changed on another device. Sync will retry next time.");
      remote.set(saved.term, saved);
      const remaining = read(queueKey(user), []).filter((item) => item.id !== changes.id);
      localStorage.setItem(queueKey(user), JSON.stringify(remaining));
    }
    const calendar = remote.get(calendarTerm)?.sections;
    remote.delete(calendarTerm);
    return { schedules: Object.fromEntries([...remote].map(([term, row]) => [term, row.sections])), calendar };
  }

  function sync(user, previousSchedules = {}) {
    const task = pending.catch(() => {}).then(() => synchronize(user, previousSchedules));
    pending = task;
    return task;
  }

  function enqueue(user, term, before, after, key) {
    const old = new Map(before.map((item) => [key(item), item]));
    const next = new Map(after.map((item) => [key(item), item]));
    const remove = [...old.keys()].filter((id) => !next.has(id));
    const add = [...next.values()].filter((item) => JSON.stringify(old.get(key(item))) !== JSON.stringify(item));
    if (!remove.length && !add.length) return;
    const queue = read(queueKey(user), []);
    queue.push({ id: crypto.randomUUID(), term, add, remove });
    localStorage.setItem(queueKey(user), JSON.stringify(queue));
  }

  window.AntivergilScheduleCloud = {
    enabled: Boolean(endpoint),
    async signIn(credential) {
      const { token, user } = await request("POST", { credential });
      localStorage.setItem(sessionKey, JSON.stringify({ sub: user.sub, token }));
      return user;
    },
    async signOut(user) {
      const value = read(sessionKey, null);
      localStorage.removeItem(sessionKey);
      if (value?.sub === user?.sub && value?.token) await request("DELETE", null, value.token);
    },
    sync,
    update(user, term, before, after) {
      enqueue(user, term, serialize(before), serialize(after), sectionKey);
      return sync(user, { [term]: before });
    },
    updateCalendar(user, before, after) {
      enqueue(user, calendarTerm, before, after, (event) => event.id);
      return sync(user);
    },
  };
})();
