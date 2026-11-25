export const alertTerm = /^\d{4}-(Spring|Summer|Fall)$/;
export const callPattern = /^\d{4,6}$/;

export function aliyunMailConfig() {
  const user = String(process.env.ALIYUN_SMTP_USER || "").trim();
  const password = String(process.env.ALIYUN_SMTP_PASSWORD || "");
  const from = String(process.env.COURSE_ALERT_FROM || user).trim();
  const fromAddress = (from.match(/<([^<>]+)>/)?.[1] || from).trim().toLowerCase();
  if (!user || !password || fromAddress !== user.toLowerCase()) return null;
  return { user, password, from };
}

export function isMailDeliveryConfigured() {
  return Boolean(aliyunMailConfig());
}

export async function loadAlertCatalog(term, fetcher = fetch) {
  if (!alertTerm.test(term)) throw new Error("Invalid term");
  const response = await fetcher(`https://antivergil.cc/data/courses-${term}.js`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Course data unavailable");
  const source = await response.text();
  return JSON.parse(source.slice(source.indexOf("=") + 1).trim().replace(/;$/, ""));
}

export function alertKind(before, after) {
  if (![before.enrolled, before.capacity, after.enrolled, after.capacity].every(Number.isInteger) ||
    before.capacity <= 0 || after.capacity <= 0) return null;
  const prior = before.capacity - before.enrolled;
  const remaining = after.capacity - after.enrolled;
  if (prior <= 0 && remaining > 0) return "Seats reopened";
  if (prior > 0 && remaining <= 0) return "Section full";
  if (prior > 3 && remaining > 0 && remaining <= 3) return "Almost full";
  return null;
}

export async function courseAlerts(request, send, sql, subject) {
  const ready = isMailDeliveryConfigured();
  if (request.method === "GET") {
    const watches = await sql`SELECT term, call_number AS "callNumber" FROM course_alert_watches WHERE subject = ${subject}`;
    return send({ watches, ready });
  }
  if (request.method !== "PUT") return send({ error: "Method not allowed." }, 405);
  const { term, callNumber, enabled } = await request.json();
  if (typeof term !== "string" || !alertTerm.test(term) || typeof callNumber !== "string" ||
    !callPattern.test(callNumber) || typeof enabled !== "boolean") return send({ error: "Invalid section." }, 400);
  if (!enabled) {
    await sql`DELETE FROM course_alert_watches WHERE subject = ${subject} AND term = ${term} AND call_number = ${callNumber}`;
    return send({ enabled, ready });
  }
  const [recipient] = await sql`SELECT 1 FROM course_alert_recipients WHERE subject = ${subject}`;
  if (!recipient) return send({ error: "Reconnect Google to verify your email." }, 401);
  const snapshot = await fetch("https://antivergil.cc/data/sync-status.json", { signal: AbortSignal.timeout(4000) }).then((result) => result.json());
  if (snapshot.status !== "ready" || snapshot.term !== term || !snapshot.lastSuccessfulSyncAt) {
    return send({ error: "Email alerts are available for the term receiving live enrollment updates." }, 409);
  }
  const section = (await loadAlertCatalog(term)).find((course) => String(course.callNumber) === callNumber);
  if (!section || !Number.isInteger(section.enrolled) || !Number.isInteger(section.capacity) || section.capacity <= 0) {
    return send({ error: "This section does not publish enrollment and capacity." }, 409);
  }
  await sql`INSERT INTO course_alert_watches (subject, term, call_number, enrolled, capacity, snapshot_at)
    VALUES (${subject}, ${term}, ${callNumber}, ${section.enrolled}, ${section.capacity}, ${snapshot.lastSuccessfulSyncAt})
    ON CONFLICT DO NOTHING`;
  return send({ enabled, ready });
}
