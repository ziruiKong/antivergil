import { createHash, randomBytes, randomInt } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { aliyunMailConfig } from './lib/course-alerts.mjs';
import { registerCampusPerson } from './lib/campus-social.mjs';
import { verificationEmail } from './lib/verification-email.mjs';

const google = new OAuth2Client();
const digest = value => createHash('sha256').update(value).digest('hex');
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmail = value => {
  const email = String(value || '').trim();
  return email.length <= 254 && EMAIL_PATTERN.test(email);
};

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
    const body = JSON.parse(raw);
    let email, subject, name, picture, provider;

    if (body.provider === 'email' || body.provider === 'ubc-email') {
      email = String(body.email || '').trim().toLowerCase();
      if (!validEmail(email)) return send({ error: 'Use a valid email address.' }, 400);
      const { sql } = getDatabase();
      const [existing] = await sql`SELECT subject FROM course_alert_recipients WHERE email = ${email} ORDER BY subject LIMIT 1`;
      subject = existing?.subject || `email:${email}`;
      name = email.split('@')[0];
      provider = 'email';
    } else {
      const { credential } = body;
      if (typeof credential !== 'string' || credential.length > 7000) return send({ error: 'Choose your Google account first.' }, 401);
      const ticket = await google.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_WEB_CLIENT_ID }).catch(() => null);
      const googleUser = ticket?.getPayload();
      if (!googleUser?.email_verified || !googleUser.sub) return send({ error: 'Google sign-in expired. Choose your account again.' }, 401);
      email = String(googleUser.email || '').toLowerCase();
      if (!validEmail(email)) return send({ error: 'Use a valid Google account email.' }, 400);
      subject = googleUser.sub;
      name = googleUser.name || email.split('@')[0];
      picture = googleUser.picture;
      provider = 'google';
    }

    const { sql } = getDatabase();
    const [grant] = await sql`SELECT google_subject FROM email_verification_grants
      WHERE google_subject = ${subject} AND email = ${email} AND verified_until > now()`;
    const code = body.code;

    if (code === undefined && !grant) {
      const config = aliyunMailConfig();
      if (!config) return send({ error: 'Email sign-in is temporarily unavailable.' }, 503);
      const value = String(randomInt(100000, 1000000));
      const hash = digest(email + ':' + value);
      const rows = await sql`INSERT INTO email_login_codes (email, code_hash, expires_at) VALUES (${email}, ${hash}, now() + interval '10 minutes') ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, sent_at = now(), attempts = 0 WHERE email_login_codes.sent_at < now() - interval '60 seconds' RETURNING email`;
      if (!rows.length) return send({ error: 'Wait 60 seconds before requesting another code.' }, 429);
      const transport = nodemailer.createTransport({ host: 'smtp.qiye.aliyun.com', port: 465, secure: true, auth: { user: config.user, pass: config.password }, connectionTimeout: 8000, socketTimeout: 15000 });
      const accountName = String(name || email.split('@')[0]).split(/\s+/)[0];
      try { await transport.sendMail({ from: config.from, to: email, ...verificationEmail(value, accountName) }); }
      catch (error) { await sql`DELETE FROM email_login_codes WHERE email = ${email} AND code_hash = ${hash}`; throw error; }
      return send({ sent: true, email });
    }

    if (!grant) {
      if (!/^\d{6}$/.test(String(code))) return send({ error: 'Enter the six-digit code.' }, 400);
      const hash = digest(email + ':' + code);
      const rows = await sql`UPDATE email_login_codes SET attempts = attempts + 1 WHERE email = ${email} AND expires_at > now() AND attempts < 5 RETURNING code_hash, attempts`;
      if (!rows.length || rows[0].code_hash !== hash) return send({ error: 'Invalid or expired code.' }, 401);
      const consumed = await sql`DELETE FROM email_login_codes WHERE email = ${email} AND code_hash = ${hash} AND attempts <= 5 RETURNING email`;
      if (!consumed.length) return send({ error: 'Code already used. Request another.' }, 401);
      await sql`INSERT INTO email_verification_grants (google_subject, email, verified_until)
        VALUES (${subject}, ${email}, now() + interval '24 hours')
        ON CONFLICT (google_subject) DO UPDATE SET email = excluded.email, verified_until = excluded.verified_until`;
    }

    const [existing] = await sql`SELECT subject FROM course_alert_recipients WHERE email = ${email} ORDER BY subject LIMIT 1`;
    const accountSubject = existing?.subject || subject;
    await registerCampusPerson(sql, accountSubject, name);
    await sql`INSERT INTO course_alert_recipients (subject, email) VALUES (${accountSubject}, ${email}) ON CONFLICT (subject) DO UPDATE SET email = excluded.email`;
    const token = randomBytes(32).toString('base64url');
    await sql`INSERT INTO course_schedule_sessions (token_hash, google_subject, expires_at) VALUES (${digest(token)}, ${accountSubject}, now() + interval '30 days')`;
    return send({ token, user: { email, name, sub: accountSubject, picture, provider } });
  } catch (error) {
    console.error('Email authentication failed', error.code || error.name);
    return send({ error: 'Email sign-in is unavailable. Please try again.' }, 503);
  }
}

export const config = { path: '/api/email-auth' };
