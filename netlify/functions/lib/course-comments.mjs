export async function courseComments(request, send, sql, subject) {
  const params = new URL(request.url).searchParams;
  const course = params.get("reviews");
  if (!/^[A-Z0-9]{2,10} [A-Z0-9]{2,12}$/.test(course || "")) return send({ error: "Invalid course code." }, 400);
  if (params.has("files")) return courseFiles(request, send, sql, subject, course, params.get("file"));
  if (request.method === "GET") {
    const comments = await sql`SELECT p.display_name AS author, c.body, c.updated_at AS "updatedAt"
      FROM course_comments c JOIN campus_people p USING (subject)
      WHERE c.course = ${course} AND c.subject <> ${subject}
      ORDER BY c.updated_at DESC, c.subject LIMIT 50`;
    const [own] = await sql`SELECT body, updated_at AS "updatedAt"
      FROM course_comments WHERE subject = ${subject} AND course = ${course}`;
    return send({ comments, own: own || null });
  }
  if (request.method === "DELETE") {
    await sql`DELETE FROM course_comments WHERE subject = ${subject} AND course = ${course}`;
    return send({ deleted: true });
  }
  if (request.method !== "PUT") return send({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length")) > 12000) return send({ error: "Comment is too long." }, 413);
  const { body } = await request.json();
  const comment = typeof body === "string" ? body.trim() : "";
  if (!comment || comment.length > 1000) return send({ error: "Enter a comment of up to 1,000 characters." }, 400);
  const [saved] = await sql`INSERT INTO course_comments (subject, course, body)
    SELECT subject, ${course}, ${comment} FROM campus_people WHERE subject = ${subject}
    ON CONFLICT (subject, course) DO UPDATE SET body = excluded.body, updated_at = now()
    RETURNING body, updated_at AS "updatedAt"`;
  return saved ? send({ own: saved }) : send({ error: "Reconnect Google to post a comment." }, 401);
}

async function courseFiles(request, send, sql, subject, course, id) {
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return send({ error: "Invalid file." }, 400);
  if (request.method === "GET") {
    if (id) {
      const [file] = await sql`SELECT name, content FROM course_files WHERE id::text = ${id} AND course = ${course}`;
      return file ? send(file) : send({ error: "File unavailable." }, 404);
    }
    const files = await sql`SELECT id, name, subject = ${subject} AS own
      FROM course_files WHERE course = ${course} ORDER BY created_at DESC, id LIMIT 50`;
    return send({ files });
  }
  if (request.method === "DELETE" && id) {
    await sql`DELETE FROM course_files WHERE id::text = ${id} AND subject = ${subject} AND course = ${course}`;
    return send({ deleted: true });
  }
  if (request.method !== "PUT" || id) return send({ error: "Method not allowed." }, 405);
  if (Number(request.headers.get("content-length")) > 1400000) return send({ error: "PDF exceeds 1 MB." }, 413);
  const { name, content } = await request.json();
  if (typeof name !== "string" || !/\.pdf$/i.test(name) || name.length > 150 || /[\\/\x00-\x1f]/.test(name) ||
    typeof content !== "string" || content.length > 1398104 || !/^[a-z0-9+/]+={0,2}$/i.test(content)) {
    return send({ error: "Choose a PDF up to 1 MB." }, 400);
  }
  const bytes = Buffer.from(content, "base64");
  if (bytes.length > 1048576 || bytes.subarray(0, 5).toString() !== "%PDF-") {
    return send({ error: "Choose a valid PDF up to 1 MB." }, 400);
  }
  const [saved] = await sql`INSERT INTO course_files (subject, course, name, content)
    SELECT subject, ${course}, ${name}, ${content} FROM campus_people
    WHERE subject = ${subject} AND (SELECT count(*) FROM course_files WHERE subject = ${subject} AND course = ${course}) < 5
    RETURNING id`;
  return saved ? send({ id: saved.id }) : send({ error: "Reconnect Google or remove a file before adding another. Limit: 5 PDFs per course." }, 409);
}
