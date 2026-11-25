import { createHash, randomBytes } from 'node:crypto';
import { getDatabase } from '@netlify/database';

const digest = value => createHash('sha256').update(value).digest('hex');
const allowedEmail = /^[^\s@]+@(?:columbia\.edu|student\.ubc\.ca)$/i;
const allowedTenant = /^(?:common|organizations|consumers|[A-Za-z0-9][A-Za-z0-9.-]{0,252})$/;

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  });
}

function configuredSite() {
  try {
    return new URL(process.env.ANTIVERGIL_SITE_URL || 'https://antivergil.cc');
  } catch {
    return new URL('https://antivergil.cc');
  }
}

function safeOrigin(requested, fallback = configuredSite()) {
  if (!requested) return fallback.origin;
  try {
    const candidate = new URL(requested);
    const host = candidate.hostname.toLowerCase();
    const allowedHosts = new Set([
      fallback.hostname.toLowerCase(),
      'antivergil.cc',
      'www.antivergil.cc',
      'localhost',
      '127.0.0.1',
    ]);
    if (!['http:', 'https:'].includes(candidate.protocol) || !allowedHosts.has(host)) return fallback.origin;
    return candidate.origin;
  } catch {
    return fallback.origin;
  }
}

function safeReturnUrl(request) {
  return safeOrigin(new URL(request.url).searchParams.get('return_to'));
}

function failureRedirect(returnUrl, reason) {
  const target = new URL('/login/', returnUrl);
  target.hash = new URLSearchParams({ outlook_error: reason }).toString();
  return redirect(target.href);
}

async function profileFromGraph(accessToken) {
  const target = new URL('https://graph.microsoft.com/v1.0/me');
  target.searchParams.set('$select', 'id,displayName,mail,userPrincipalName');
  const response = await fetch(target, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Graph profile request failed: ${response.status}`);
  return response.json();
}

export default async function outlookAuth(request) {
  if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 });

  const requestUrl = new URL(request.url);
  const returnUrl = safeReturnUrl(request);
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || '');
  const tenantInput = String(process.env.MICROSOFT_TENANT_ID || 'common').trim();
  const tenant = allowedTenant.test(tenantInput) ? tenantInput : 'common';
  const redirectUri = String(
    process.env.OUTLOOK_REDIRECT_URI || new URL('/api/outlook-auth', request.url).href,
  ).trim();
  const authorizationBase = `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0`;
  const { sql } = getDatabase();

  if (!clientId || !clientSecret) return failureRedirect(returnUrl, 'unavailable');

  const oauthError = requestUrl.searchParams.get('error');
  if (oauthError) {
    const reason = oauthError === 'access_denied' ? 'access_denied' : 'unavailable';
    return failureRedirect(returnUrl, reason);
  }

  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  if (!code && !state) {
    const rawState = randomBytes(32).toString('base64url');
    await sql`DELETE FROM outlook_login_tickets WHERE expires_at <= now()`;
    await sql`INSERT INTO outlook_login_tickets (token_hash, stage, return_url, expires_at)
      VALUES (${digest(rawState)}, 'state', ${returnUrl}, now() + interval '10 minutes')`;
    const authorization = new URL(`${authorizationBase}/authorize`);
    authorization.searchParams.set('client_id', clientId);
    authorization.searchParams.set('response_type', 'code');
    authorization.searchParams.set('redirect_uri', redirectUri);
    authorization.searchParams.set('response_mode', 'query');
    authorization.searchParams.set('scope', 'openid profile email User.Read');
    authorization.searchParams.set('prompt', 'select_account');
    authorization.searchParams.set('state', rawState);
    return redirect(authorization.href);
  }

  if (!code || !state || !/^[A-Za-z0-9_-]{43}$/.test(state)) {
    return failureRedirect(returnUrl, 'expired');
  }

  const stateHash = digest(state);
  const [pending] = await sql`SELECT return_url FROM outlook_login_tickets
    WHERE token_hash = ${stateHash} AND stage = 'state' AND expires_at > now()`;
  if (!pending) return failureRedirect(returnUrl, 'expired');
  await sql`DELETE FROM outlook_login_tickets WHERE token_hash = ${stateHash} AND stage = 'state'`;

  const callbackReturnUrl = safeOrigin(pending.return_url);
  try {
    const tokenResponse = await fetch(`${authorizationBase}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    const tokens = await tokenResponse.json();
    if (!tokens.access_token) throw new Error('Microsoft did not return an access token');

    const profile = await profileFromGraph(tokens.access_token);
    const email = String(profile.mail || profile.userPrincipalName || '').trim().toLowerCase();
    const subject = String(profile.id || '').trim();
    if (!allowedEmail.test(email) || !subject) return failureRedirect(callbackReturnUrl, 'not_allowed');

    const loginTicket = randomBytes(32).toString('base64url');
    await sql`INSERT INTO outlook_login_tickets
      (token_hash, stage, email, oauth_subject, display_name, picture, return_url, expires_at)
      VALUES (
        ${digest(loginTicket)}, 'login', ${email}, ${subject},
        ${String(profile.displayName || email.split('@')[0])}, NULL,
        ${callbackReturnUrl}, now() + interval '10 minutes'
      )`;
    const destination = new URL('/login/', callbackReturnUrl);
    destination.hash = new URLSearchParams({ outlook: loginTicket }).toString();
    return redirect(destination.href);
  } catch (error) {
    console.error('Outlook authentication failed', error.code || error.name);
    return failureRedirect(callbackReturnUrl, 'unavailable');
  }
}

export const config = { path: '/api/outlook-auth' };
