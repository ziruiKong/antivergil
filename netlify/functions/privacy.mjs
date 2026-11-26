import { createHash } from "node:crypto";
import { getDatabase } from "@netlify/database";

const policyVersion = "2026-11-26";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^Bearer ([\w-]{43})$/;

function requestHeaders(request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
  const allowed = !origin || localOrigin || [requestOrigin, "https://antivergil.cc"].includes(origin);
  const headers = { "Cache-Control": "no-store", Vary: "Origin" };
  if (origin && allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
  }
  return { origin, allowed, headers };
}

function pagePath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 200 || /[\x00-\x1f]/.test(value)) return "";
  return value.split("?")[0].replace(/\/{2,}/g, "/");
}

function referrerHost(value) {
  if (typeof value !== "string" || !value || value.length > 200) return null;
  return /^[a-z0-9.-]+$/i.test(value) ? value.toLowerCase() : null;
}

async function marketingConsent(sql, request, active, send) {
  const token = request.headers.get("authorization")?.match(tokenPattern)?.[1];
  if (!token) return send({ recorded: false, pending: "sign-in" });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [recipient] = await sql`SELECT r.subject, r.email
    FROM course_schedule_sessions s
    JOIN course_alert_recipients r ON r.subject = s.google_subject
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > now()`;
  if (!recipient) return send({ error: "Sign in again to update marketing preferences." }, 401);

  if (!active) {
    await sql`UPDATE marketing_contacts
      SET marketing_active = false, revoked_at = now(), updated_at = now(), policy_version = ${policyVersion}
      WHERE subject = ${recipient.subject}`;
    return send({ recorded: true, marketing: "inactive" });
  }

  await sql`INSERT INTO marketing_contacts
      (subject, email, marketing_active, policy_version, consented_at, revoked_at)
    VALUES (${recipient.subject}, ${recipient.email}, true, ${policyVersion}, now(), NULL)
    ON CONFLICT (subject) DO UPDATE SET
      email = excluded.email,
      marketing_active = true,
      policy_version = excluded.policy_version,
      consented_at = CASE
        WHEN marketing_contacts.marketing_active IS DISTINCT FROM true THEN now()
        ELSE marketing_contacts.consented_at
      END,
      revoked_at = NULL,
      updated_at = now()`;
  return send({ recorded: true, marketing: "active" });
}

async function analyticsSummary(sql, send) {
  const [today] = await sql`SELECT count(*)::int AS views, count(DISTINCT session_hash)::int AS sessions
    FROM privacy_pageviews WHERE viewed_at >= date_trunc('day', now())`;
  const [week] = await sql`SELECT count(*)::int AS views, count(DISTINCT session_hash)::int AS sessions
    FROM privacy_pageviews WHERE viewed_at >= now() - interval '7 days'`;
  const pages = await sql`SELECT page_path AS path, count(*)::int AS views,
      count(DISTINCT session_hash)::int AS sessions
    FROM privacy_pageviews
    WHERE viewed_at >= now() - interval '7 days'
    GROUP BY page_path
    ORDER BY views DESC, path
    LIMIT 10`;
  const [marketing] = await sql`SELECT
      count(*) FILTER (WHERE marketing_active)::int AS active,
      count(*) FILTER (WHERE NOT marketing_active AND revoked_at IS NOT NULL)::int AS revoked
    FROM marketing_contacts`;
  return send({ today, last7Days: week, topPages: pages, marketing, policyVersion });
}

export default async function privacy(request) {
  const { origin, allowed, headers } = requestHeaders(request);
  const send = (body, status = 200) => Response.json(body, { status, headers });
  if (!allowed) return send({ error: "Origin not allowed." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  try {
    const { sql } = getDatabase();
    if (request.method === "GET") return await analyticsSummary(sql, send);
    if (request.method !== "POST") return send({ error: "Method not allowed." }, 405);
    if (Number(request.headers.get("content-length")) > 6000) return send({ error: "Request too large." }, 413);

    const body = await request.json();
    if (body?.type === "marketing-consent") {
      if (typeof body.marketing !== "boolean") return send({ error: "Invalid marketing choice." }, 400);
      return await marketingConsent(sql, request, body.marketing, send);
    }

    if (body?.type !== "pageview") return send({ error: "Invalid privacy request." }, 400);
    if (body.statistics !== true) return send({ recorded: false, reason: "statistics-disabled" });
    const path = pagePath(body.path);
    if (!path || typeof body.sessionId !== "string" || !uuidPattern.test(body.sessionId)) {
      return send({ error: "Invalid analytics event." }, 400);
    }
    const sessionHash = createHash("sha256").update(body.sessionId).digest("hex");
    const [recent] = await sql`SELECT 1 FROM privacy_pageviews
      WHERE session_hash = ${sessionHash} AND page_path = ${path}
        AND viewed_at > now() - interval '30 minutes'
      LIMIT 1`;
    if (recent) return send({ recorded: false, reason: "recent-view" });
    await sql`INSERT INTO privacy_pageviews (page_path, referrer_host, session_hash)
      VALUES (${path}, ${referrerHost(body.referrerHost)}, ${sessionHash})`;
    return send({ recorded: true });
  } catch (error) {
    if (error instanceof SyntaxError) return send({ error: "Invalid JSON." }, 400);
    console.error("Privacy request failed", error?.code || error?.name);
    return send({ error: "Privacy settings are temporarily unavailable." }, 503);
  }
}

export const config = { path: "/api/privacy" };
