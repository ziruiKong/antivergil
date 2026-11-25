(function () {
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
    if (value?.sub !== user?.sub || !value?.token) throw new Error("Sign in again to sync your schedule.");
    return value.token;
  }

  const serialize = (sections) => sections.map(({ classId, code }) => ({ classId: String(classId), code }));

  function applyChanges(sections, changes) {
    const selected = new Map(sections.map((item) => [item.classId, item]));
    for (const id of changes.remove) selected.delete(id);
    for (const item of changes.add) selected.set(item.classId, item);
    return [...selected.values()];
  }

  async function synchronize(user, previousSchedules) {
    const token = session(user);
    const remote = new Map((await request("GET", null, token)).schedules.map((row) => [row.term, row]));
    for (const [term, sections] of Object.entries(previousSchedules)) {
      if (remote.has(term) || !sections.length) continue;
      try {
        const row = await request("PUT", { term, sections: serialize(sections), revision: 0 }, token);
        remote.set(term, row);
      } catch (error) {
        if (error.status !== 409) throw error;
        for (const row of (await request("GET", null, token)).schedules) remote.set(row.term, row);
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
          for (const row of (await request("GET", null, token)).schedules) remote.set(row.term, row);
        }
      }
      if (!saved) throw new Error("Your schedule changed on another device. Sync will retry next time.");
      remote.set(saved.term, saved);
      const remaining = read(queueKey(user), []).filter((item) => item.id !== changes.id);
      localStorage.setItem(queueKey(user), JSON.stringify(remaining));
    }
    return Object.fromEntries([...remote].map(([term, row]) => [term, row.sections]));
  }

  function sync(user, previousSchedules = {}) {
    const task = pending.catch(() => {}).then(() => synchronize(user, previousSchedules));
    pending = task;
    return task;
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
      const old = new Map(serialize(before).map((item) => [item.classId, item]));
      const next = new Map(serialize(after).map((item) => [item.classId, item]));
      const remove = [...old.keys()].filter((id) => !next.has(id));
      const add = [...next.values()].filter((item) => old.get(item.classId)?.code !== item.code);
      if (remove.length || add.length) {
        const queue = read(queueKey(user), []);
        queue.push({ id: crypto.randomUUID(), term, add, remove });
        localStorage.setItem(queueKey(user), JSON.stringify(queue));
      }
      return sync(user, { [term]: before });
    },
  };
})();
