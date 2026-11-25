import { createHash, randomBytes, randomInt } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
const google = new OAuth2Client();
import { aliyunMailConfig } from './lib/course-alerts.mjs';
import { registerCampusPerson } from './lib/campus-social.mjs';
import { verificationEmail } from './lib/verification-email.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
export default async function emailAuth(request) {
  const origin = request.headers.get('origin');
  const allowed = [new URL(request.url).origin, 'https://antivergil.cc'];
  const headers = { 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (origin && !allowed.includes(origin)) return new Response(null, { status: 403 });
  if (origin) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
  const send = (body, status = 200) => Response.json(body, { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return send({ error: 'Method not allowed.' }, 405);
  try {
    const raw = await request.text();
    if (raw.length > 9000) return send({ error: 'Request too large.' }, 413);
    const { credential, code } = JSON.parse(raw);
    if (typeof credential !== 'string' || credential.length > 7000) return send({ error: 'Choose your Google account first.' }, 401);
    const ticket = await google.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_WEB_CLIENT_ID }).catch(() => null);
    const googleUser = ticket?.getPayload();
    if (!googleUser?.email_verified || !googleUser.sub) return send({ error: 'Google sign-in expired. Choose your account again.' }, 401);
    const email = String(googleUser.email || '').toLowerCase();
    if (!/^[^\s@]+@(?:columbia\.edu|student\.ubc\.ca)$/.test(email)) return send({ error: 'Use your university email.' }, 400);
    const { sql } = getDatabase();
    if (code === undefined) {
      const config = aliyunMailConfig();
      if (!config) return send({ error: 'Email sign-in is temporarily unavailable.' }, 503);
      const value = String(randomInt(100000, 1000000));
      const hash = digest(email + ':' + value);
      const rows = await sql`INSERT INTO email_login_codes (email, code_hash, expires_at) VALUES (${email}, ${hash}, now() + interval '10 minutes') ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, sent_at = now(), attempts = 0 WHERE email_login_codes.sent_at < now() - interval '60 seconds' RETURNING email`;
      if (!rows.length) return send({ error: 'Wait 60 seconds before requesting another code.' }, 429);
      const transport = nodemailer.createTransport({ host: 'smtp.qiye.aliyun.com', port: 465, secure: true, auth: { user: config.user, pass: config.password }, connectionTimeout: 8000, socketTimeout: 15000 });
      try { await transport.sendMail({ from: config.from, to: email, ...verificationEmail(value) }); }
      catch (error) { await sql`DELETE FROM email_login_codes WHERE email = ${email} AND code_hash = ${hash}`; throw error; }
      return send({ sent: true, email });
    }
    if (!/^\d{6}$/.test(String(code))) return send({ error: 'Enter the six-digit code.' }, 400);
    const hash = digest(email + ':' + code);
    const rows = await sql`UPDATE email_login_codes SET attempts = attempts + 1 WHERE email = ${email} AND expires_at > now() AND attempts < 5 RETURNING code_hash, attempts`;
    if (!rows.length || rows[0].code_hash !== hash) return send({ error: 'Invalid or expired code.' }, 401);
    const consumed = await sql`DELETE FROM email_login_codes WHERE email = ${email} AND code_hash = ${hash} AND attempts <= 5 RETURNING email`;
    if (!consumed.length) return send({ error: 'Code already used. Request another.' }, 401);
    const [existing] = await sql`SELECT subject FROM course_alert_recipients WHERE email = ${email} ORDER BY subject LIMIT 1`;
    const sub = existing?.subject || googleUser.sub;
    const name = googleUser.name || email.split('@')[0];
    await registerCampusPerson(sql, sub, name);
    await sql`INSERT INTO course_alert_recipients (subject, email) VALUES (${sub}, ${email}) ON CONFLICT (subject) DO UPDATE SET email = excluded.email`;
    const token = randomBytes(32).toString('base64url');
    await sql`INSERT INTO course_schedule_sessions (token_hash, google_subject, expires_at) VALUES (${digest(token)}, ${sub}, now() + interval '30 days')`;
    return send({ token, user: { email, name, sub, picture: googleUser.picture, provider: 'google' } });
  } catch (error) {
    console.error('Email authentication failed', error.code || error.name);
    return send({ error: 'Email sign-in is unavailable. Please try again.' }, 503);
  }
}
export const config = { path: '/api/email-auth' };
