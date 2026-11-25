import { getDatabase } from "@netlify/database";
import nodemailer from "nodemailer";
import { alertKind, alertTerm, aliyunMailConfig, loadAlertCatalog } from "./lib/course-alerts.mjs";

export async function recordEnrollment(sql, snapshot, catalog) {
  const { term, lastSuccessfulSyncAt: stamp } = snapshot;
  const watches = await sql`SELECT subject, call_number, enrolled, capacity FROM course_alert_watches
    WHERE term = ${term} AND (snapshot_at IS NULL OR snapshot_at < ${stamp}::timestamptz)`;
  const sections = new Map(catalog.map((section) => [String(section.callNumber), section]));
  const academicTerm = term.slice(0, 4) + ({ Spring: "1", Summer: "2", Fall: "3" })[term.split("-")[1]];
  for (const watch of watches) {
    const section = sections.get(watch.call_number);
    if (!section || !Number.isInteger(section.enrolled) || !Number.isInteger(section.capacity) || section.capacity <= 0) continue;
    const kind = alertKind(watch, section);
    const slug = section.code.trim().toLowerCase().replace(/\s+/g, "-");
    const query = new URLSearchParams({ term, section: watch.call_number });
    const courseURL = `https://antivergil.cc/course/${encodeURIComponent(slug)}/?${query}`;
    const vergil = `https://vergil.columbia.edu/vergil/class/${academicTerm}/${watch.call_number}`;
    const subjectLine = kind ? `Antivergil · ${kind} · ${section.code}` : null;
    const body = `${section.code} · ${section.title}\n${term} · Call number ${watch.call_number}\nEnrollment: ${watch.enrolled}/${watch.capacity} → ${section.enrolled}/${section.capacity}\n\nAntivergil: ${courseURL}\nVergil: ${vergil}\n\nManage or turn off this alert on the Antivergil course page.`;
    await sql`WITH changed AS (
      UPDATE course_alert_watches SET enrolled = ${section.enrolled}, capacity = ${section.capacity}, snapshot_at = ${stamp}
      WHERE subject = ${watch.subject} AND term = ${term} AND call_number = ${watch.call_number}
        AND (snapshot_at IS NULL OR snapshot_at < ${stamp}::timestamptz)
        AND enrolled IS NOT DISTINCT FROM ${watch.enrolled} AND capacity IS NOT DISTINCT FROM ${watch.capacity}
      RETURNING subject, term, call_number
    ) INSERT INTO course_alert_deliveries (subject, term, call_number, subject_line, body)
      SELECT subject, term, call_number, ${subjectLine}::text, ${body} FROM changed WHERE ${subjectLine}::text IS NOT NULL`;
  }
}

export default async function enrollmentMail() {
  const mailConfig = aliyunMailConfig();
  if (!mailConfig) return new Response("Alibaba Mail delivery is not configured.", { status: 503 });
  const { sql } = getDatabase();
  const response = await fetch("https://antivergil.cc/data/sync-status.json", { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error("Enrollment status unavailable");
  const snapshot = await response.json();
  if (snapshot.status === "ready" && alertTerm.test(snapshot.term) && Number.isFinite(Date.parse(snapshot.lastSuccessfulSyncAt))) {
    await recordEnrollment(sql, snapshot, await loadAlertCatalog(snapshot.term));
  }
  await sql`DELETE FROM course_alert_deliveries WHERE queued_at < now() - interval '24 hours'`;
  const pending = await sql`SELECT d.id, d.subject_line, d.body, r.email FROM course_alert_deliveries d
    JOIN course_alert_recipients r USING (subject) WHERE d.sent_at IS NULL ORDER BY d.id LIMIT 8`;
  const transporter = nodemailer.createTransport({
    host: "smtp.qiye.aliyun.com",
    port: 465,
    secure: true,
    auth: { user: mailConfig.user, pass: mailConfig.password },
    pool: true,
    maxConnections: 1,
    maxMessages: 8,
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 15000,
  });
  try {
    for (const entry of pending) {
      await transporter.sendMail({
        from: mailConfig.from,
        to: entry.email,
        subject: entry.subject_line,
        text: entry.body,
        messageId: `<antivergil-course-alert-${entry.id}@antivergil.cc>`,
        headers: { "X-Antivergil-Delivery-Id": String(entry.id) },
      });
      await sql`UPDATE course_alert_deliveries SET sent_at = now() WHERE id = ${entry.id}`;
    }
  } finally {
    transporter.close();
  }
  return new Response(null, { status: 204 });
}

export const config = { schedule: "*/15 * * * *" };
