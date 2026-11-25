import { createHash, randomBytes } from "node:crypto";
import { getDatabase } from "@netlify/database";
import { OAuth2Client } from "google-auth-library";

const google = new OAuth2Client();
const sessionLifetime = 30 * 24 * 60 * 60 * 1000;
const termPattern = /^\d{4}-(Spring|Summer|Fall|Winter)$/;

function hash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function validSections(sections) {
  if (!Array.isArray(sections) || sections.length > 100) return false;
  const ids = new Set();
  return sections.every((section) => {
    if (typeof section?.classId !== "string" || !/^[\w.-]{1,64}$/.test(section.classId)
      || typeof section.code !== "string" || !section.code.trim() || section.code.length > 64
      || ids.has(section.classId)) return false;
    ids.add(section.classId);
    return true;
  });
}

export default async function schedule(request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const allowedOrigin = origin && [requestOrigin, "https://antivergil.cc"].includes(origin);
  const headers = { "Cache-Control": "no-store", Vary: "Origin" };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
  }
  const send = (data, status = 200) => Response.json(data, { status, headers });
  if (origin && !allowedOrigin) return send({ error: "Origin not allowed." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    const { sql } = getDatabase();
    if (request.method === "POST") {
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
      const token = randomBytes(32).toString("base64url");
      const expires = new Date(Date.now() + sessionLifetime).toISOString();
      await sql`INSERT INTO course_schedule_sessions (token_hash, google_subject, expires_at)
        VALUES (${hash(token)}, ${user.sub}, ${expires})`;
      return send({ token, user: { email, name: user.name, picture: user.picture, sub: user.sub, provider: "google" } });
    }

    const token = request.headers.get("authorization")?.match(/^Bearer ([\w-]{43})$/)?.[1];
    if (!token) return send({ error: "Sign in again to sync your schedule." }, 401);
    const tokenHash = hash(token);
    if (request.method === "DELETE") {
      await sql`DELETE FROM course_schedule_sessions WHERE token_hash = ${tokenHash}`;
      return send({ signedOut: true });
    }
    const [session] = await sql`SELECT google_subject FROM course_schedule_sessions
      WHERE token_hash = ${tokenHash} AND expires_at > now()`;
    if (!session) return send({ error: "Your cloud session expired. Sign in again." }, 401);
    const id = session.google_subject;
    if (request.method === "GET") {
      const schedules = await sql`SELECT term, sections, revision FROM course_schedules
        WHERE google_subject = ${id}`;
      return send({ schedules });
    }
    if (request.method !== "PUT") return send({ error: "Method not allowed." }, 405);

    if (Number(request.headers.get("content-length")) > 20000) return send({ error: "Schedule is too large." }, 413);
    const { term, sections, revision } = await request.json();
    if (typeof term !== "string" || !termPattern.test(term) || !validSections(sections)
      || !Number.isInteger(revision) || revision < 0 || revision >= 2147483647) {
      return send({ error: "Invalid course schedule." }, 400);
    }
    const data = JSON.stringify(sections.map(({ classId, code }) => ({ classId, code })));
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
