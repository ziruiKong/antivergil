import { randomBytes } from "node:crypto";

export async function registerCampusPerson(sql, subject, name) {
  await sql`INSERT INTO campus_people (subject, invite_code, display_name)
    VALUES (${subject}, ${randomBytes(9).toString("base64url")}, ${String(name || "Student").slice(0, 100)})
    ON CONFLICT (subject) DO UPDATE SET display_name = excluded.display_name`;
}

export async function campusSocial(request, send, sql, subject) {
  const fileId = new URL(request.url).searchParams.get("attachment");
  if (fileId && request.method === "GET") {
    if (!/^\d{1,19}$/.test(fileId)) return send({error:"Invalid file."},400);
    const [file] = await sql`SELECT m.file_data AS data FROM campus_messages m JOIN campus_friendships f
      ON f.person_a = least(m.sender,m.recipient) AND f.person_b = greatest(m.sender,m.recipient) AND f.accepted
      WHERE m.id::text = ${fileId} AND ${subject} IN (m.sender,m.recipient) AND m.file_data IS NOT NULL`;
    return file ? send(file) : send({error:"File unavailable."},404);
  }
  if (request.method === "GET") {
    const [person] = await sql`SELECT invite_code AS code FROM campus_people WHERE subject = ${subject}`;
    if (!person) return send({ error: "Reconnect your Google account to use Friends." }, 401);
    const friends = await sql`SELECT p.invite_code AS code, p.display_name AS name, f.accepted,
        f.requested_by = ${subject} AS outgoing,
        CASE WHEN f.accepted AND p.location_expires_at > now() THEN p.latitude END AS latitude,
        CASE WHEN f.accepted AND p.location_expires_at > now() THEN p.longitude END AS longitude,
        CASE WHEN f.accepted AND p.location_expires_at > now() THEN p.location_expires_at END AS "expiresAt"
      FROM campus_friendships f JOIN campus_people p
        ON p.subject = CASE WHEN f.person_a = ${subject} THEN f.person_b ELSE f.person_a END
      WHERE f.person_a = ${subject} OR f.person_b = ${subject} ORDER BY p.display_name`;
    const shares = await sql`SELECT p.invite_code AS code, s.term, s.sections FROM campus_course_shares s
      JOIN campus_people p ON p.subject = s.sender
      JOIN campus_friendships f ON f.accepted AND
        ((f.person_a = s.sender AND f.person_b = s.recipient) OR (f.person_b = s.sender AND f.person_a = s.recipient))
      WHERE s.recipient = ${subject}`;
    const messages = await sql`SELECT m.id::text AS id, p.invite_code AS code,
        m.sender = ${subject} AS mine, m.body, m.attachment, m.created_at AS "createdAt"
      FROM campus_messages m
      JOIN campus_people p ON p.subject = CASE WHEN m.sender = ${subject} THEN m.recipient ELSE m.sender END
      JOIN campus_friendships f ON f.accepted AND
        ((f.person_a = m.sender AND f.person_b = m.recipient) OR (f.person_b = m.sender AND f.person_a = m.recipient))
      WHERE m.sender = ${subject} OR m.recipient = ${subject}
      ORDER BY m.id DESC LIMIT 500`;
    return send({ code: person.code, friends, shares, messages: messages.reverse() });
  }
  if (request.method !== "PUT") return send({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length")) > 2850000) return send({ error: "Request is too large." }, 413);
  const { action, code, term, latitude, longitude, body, data, name, mime } = await request.json();
  if (action === "location") {
    if (latitude === null && longitude === null) {
      await sql`UPDATE campus_people SET latitude = NULL, longitude = NULL, location_expires_at = NULL WHERE subject = ${subject}`;
    } else {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < 40.802 || latitude > 40.814 || longitude < -73.971 || longitude > -73.953) {
        return send({ error: "Live sharing is available near Morningside campus." }, 400);
      }
      await sql`UPDATE campus_people SET latitude = ${latitude}, longitude = ${longitude},
        location_expires_at = now() + interval '75 seconds' WHERE subject = ${subject}`;
    }
    return send({ ok: true });
  }
  if (typeof code !== "string" || !/^[\w-]{12}$/.test(code)) return send({ error: "Enter a valid friend code." }, 400);
  const [person] = await sql`SELECT subject FROM campus_people WHERE invite_code = ${code}`;
  if (!person || person.subject === subject) return send({ error: "Friend code unavailable." }, 404);
  const [a, b] = [subject, person.subject].sort();
  if (action === "file" || action === "schedule") {
    let attachment;
    if (action === "file") {
      if (typeof data !== "string" || !data.length || data.length > 2796204 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || Buffer.from(data,"base64").length > 2097152)
        return send({error:"Choose a file up to 2 MB."},400);
      attachment = {kind:"file", name:String(name || "File").slice(0,180), mime:["image/jpeg","image/png","image/webp","image/gif"].includes(mime) ? mime : "application/octet-stream"};
    } else {
      if (!/^\d{4}-(Spring|Summer|Fall|Winter)$/.test(term)) return send({error:"Invalid term."},400);
      const [schedule] = await sql`SELECT sections FROM course_schedules WHERE google_subject=${subject} AND term=${term}`;
      if (!schedule?.sections?.length) return send({error:"Sync courses to your calendar first."},409);
      attachment = {kind:"schedule", term, sections:schedule.sections};
    }
    const rows = await sql`INSERT INTO campus_messages(sender,recipient,body,attachment,file_data)
      SELECT ${subject},${person.subject},${attachment.name || term + " schedule"},${JSON.stringify(attachment)}::jsonb,${action === "file" ? data : null}
      FROM campus_friendships WHERE person_a=${a} AND person_b=${b} AND accepted RETURNING id`;
    if (!rows.length) return send({error:"Friendship required."},403);
  } else if (action === "message") {
    if (typeof body !== "string" || !body.trim() || body.trim().length > 2000) return send({ error: "Enter a message of up to 2,000 characters." }, 400);
    const rows = await sql`INSERT INTO campus_messages (sender, recipient, body)
      SELECT ${subject}, ${person.subject}, ${body.trim()} FROM campus_friendships
      WHERE person_a = ${a} AND person_b = ${b} AND accepted RETURNING id`;
    if (!rows.length) return send({ error: "You can only message an accepted friend." }, 403);
  } else if (action === "invite") {
    await sql`INSERT INTO campus_friendships (person_a, person_b, requested_by)
      VALUES (${a}, ${b}, ${subject}) ON CONFLICT DO NOTHING`;
  } else if (action === "accept") {
    await sql`UPDATE campus_friendships SET accepted = true
      WHERE person_a = ${a} AND person_b = ${b} AND requested_by = ${person.subject}`;
  } else if (action === "remove") {
    await sql`WITH removed AS (
      DELETE FROM campus_friendships WHERE person_a = ${a} AND person_b = ${b}
    ) DELETE FROM campus_course_shares WHERE (sender = ${a} AND recipient = ${b}) OR (sender = ${b} AND recipient = ${a})`;
  } else if (action === "share" && typeof term === "string" && /^\d{4}-(Spring|Summer|Fall|Winter)$/.test(term)) {
    const rows = await sql`INSERT INTO campus_course_shares (sender, recipient, term, sections)
      SELECT ${subject}, ${person.subject}, s.term, s.sections FROM course_schedules s
      JOIN campus_friendships f ON f.person_a = ${a} AND f.person_b = ${b} AND f.accepted
      WHERE s.google_subject = ${subject} AND s.term = ${term} AND jsonb_array_length(s.sections) > 0
      ON CONFLICT (sender, recipient, term) DO UPDATE SET sections = excluded.sections RETURNING term`;
    if (!rows.length) return send({ error: "Sync your selected courses and confirm the friendship first." }, 409);
  } else {
    return send({ error: "Unknown action." }, 400);
  }
  return send({ ok: true });
}
