import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "@netlify/database";
import { OAuth2Client } from "google-auth-library";

import { campusSocial, registerCampusPerson } from "./lib/campus-social.mjs";

import { courseAlerts, isMailDeliveryConfigured } from "./lib/course-alerts.mjs";

import { courseComments } from "./lib/course-comments.mjs";

const google = new OAuth2Client();
const sessionLifetime = 30 * 24 * 60 * 60 * 1000;
const termPattern = /^\d{4}-(Spring|Summer|Fall|Winter)$/;

function hash(token) {
  return createHash("sha256").update(token).digest("hex");
}

const calendarTerm = "_calendar";

function validEvents(events) {
  const ids = new Set();
  if (!Array.isArray(events) || events.length > 500 || JSON.stringify(events).length > 260000) return false;
  return events.every((event) => {
    if (!event || !/^[\w-]{1,128}$/.test(event.id || "") || ids.has(event.id)
      || typeof event.title !== "string" || !event.title.trim() || event.title.length > 1024
      || !["study", "tasks", "personal"].includes(event.source)
      || !/^\d{4}-\d{2}-\d{2}$/.test(event.date || "")
      || typeof event.allDay !== "boolean"
      || (!event.allDay && (!Number.isInteger(event.start) || !Number.isInteger(event.end)
        || event.start < 0 || event.start >= event.end || event.end > 1440))) return false;
    ids.add(event.id);
    return true;
  });
}

function validSections(sections) {
  if (!Array.isArray(sections) || sections.length > 100) return false;
  const ids = new Set();
  return sections.every((section) => {
    if (typeof section?.classId !== "string" || !/^[\w.-]{1,64}$/.test(section.classId)
      || typeof section.code !== "string" || !section.code.trim() || section.code.length > 64) return false;
    const key = section.classId + ":" + section.code.trim().toUpperCase().replace(/\s+/g, " ");
    if (ids.has(key)) return false;
    ids.add(key);
    return true;
  });
}

export default async function schedule(request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const allowedOrigin = origin && [requestOrigin, "https://antivergil.cc"].includes(origin);
  const headers = { "Cache-Control": "no-store", Vary: "Origin", "X-Antivergil-Calendar-Sync": "1", "X-Antivergil-Friends": "1", "X-Antivergil-Enrollment-Alerts": "1", "X-Antivergil-Community": "2" };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
  }
  if (new URL(request.url).searchParams.has("alerts")) {
    headers["X-Antivergil-Mail-Delivery"] = isMailDeliveryConfigured() ? "configured" : "pending";
  }
  const send = (data, status = 200) => Response.json(data, { status, headers });
  if (origin && !allowedOrigin) return send({ error: "Origin not allowed." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    const { sql } = getDatabase();
    const social = new URL(request.url).searchParams.has("social");
    const alerts = new URL(request.url).searchParams.has("alerts");
    const reviews = new URL(request.url).searchParams.has("reviews");
    if (!social && !alerts && !reviews && request.method === "POST") {
      const audience = process.env.GOOGLE_WEB_CLIENT_ID;
      if (!audience) return send({ error: "Google sign-in is not configured." }, 503);
      const { credential } = await request.json();
      if (typeof credential !== "string" || credential.length > 7000) return send({ error: "Invalid credential." }, 400);
      const ticket = await google.verifyIdToken({ idToken: credential, audience }).catch(() => null);
      const user = ticket?.getPayload();
      const email = user?.email?.toLowerCase();
      if (!user?.sub || !user.email_verified || !/^[^\s@]+@(?:columbia\.edu|student\.ubc\.ca)$/.test(email || "")) {
        return send({ error: "Sign in with a verified university Google account." }, 401);
      }
      const [account] = await sql`SELECT subject FROM course_alert_recipients WHERE email = ${email} ORDER BY subject LIMIT 1`;
      const subject = account?.subject || user.sub;
      const token = randomBytes(32).toString("base64url");
      const expires = new Date(Date.now() + sessionLifetime).toISOString();
      await registerCampusPerson(sql, subject, user.name);
      await sql`INSERT INTO course_alert_recipients (subject, email) VALUES (${subject}, ${email})
        ON CONFLICT (subject) DO UPDATE SET email = excluded.email`;
      await sql`INSERT INTO course_schedule_sessions (token_hash, google_subject, expires_at)
        VALUES (${hash(token)}, ${subject}, ${expires})`;
      return send({ token, user: { email, name: user.name, picture: user.picture, sub: subject, provider: "google" } });
    }

    const token = request.headers.get("authorization")?.match(/^Bearer ([\w-]{43})$/)?.[1];
    if (!token) return send({ error: "Sign in again to sync your schedule." }, 401);
    const tokenHash = hash(token);
    if (!social && !alerts && !reviews && request.method === "DELETE") {
      await sql`DELETE FROM course_schedule_sessions WHERE token_hash = ${tokenHash}`;
      return send({ signedOut: true });
    }
    const [session] = await sql`SELECT google_subject FROM course_schedule_sessions
      WHERE token_hash = ${tokenHash} AND expires_at > now()`;
    if (!session) return send({ error: "Your cloud session expired. Sign in again." }, 401);
    const id = session.google_subject;
    if (social) return await campusSocial(request, send, sql, id);
    if (alerts) return await courseAlerts(request, send, sql, id);
    if (reviews) return await courseComments(request, send, sql, id);
    if (request.method === "GET") {
      const schedules = await sql`SELECT term, sections, revision FROM course_schedules
        WHERE google_subject = ${id}`;
      return send({
        schedules: schedules.filter((row) => row.term !== calendarTerm),
        calendar: schedules.find((row) => row.term === calendarTerm) || null,
      });
    }
    if (request.method !== "PUT") return send({ error: "Method not allowed." }, 405);

    if (Number(request.headers.get("content-length")) > 300000) return send({ error: "Schedule is too large." }, 413);
    const { term, sections, revision } = await request.json();
    const validData = term === calendarTerm
      ? validEvents(sections)
      : typeof term === "string" && termPattern.test(term) && validSections(sections);
    if (!validData
      || !Number.isInteger(revision) || revision < 0 || revision >= 2147483647) {
      return send({ error: "Invalid course schedule." }, 400);
    }
    const data = JSON.stringify(term === calendarTerm ? sections : sections.map(({ classId, code }) => ({ classId, code })));
    const rows = revision === 0
      ? await sql`INSERT INTO course_schedules (google_subject, term, sections)
          VALUES (${id}, ${term}, ${data}::jsonb)
          ON CONFLICT DO NOTHING RETURNING term, sections, revision`
      : await sql`UPDATE course_schedules SET sections = ${data}::jsonb, revision = revision + 1
          WHERE google_subject = ${id} AND term = ${term} AND revision = ${revision}
          RETURNING term, sections, revision`;
    return rows.length ? send(rows[0]) : send({ error: "Schedule changed on another device." }, 409);
  } catch (error) {
    if (error instanceof SyntaxError) return send({ error: "Invalid JSON." }, 400);
    console.error("Course schedule request failed", error?.code || error?.name);
    return send({ error: "Cloud schedule is temporarily unavailable." }, 503);
  }
}

export const config = { path: "/api/schedule" };
