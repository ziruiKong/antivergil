import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, "_site");

const runtimeFiles = [
  "CNAME",
  "index.html",
  "home.html",
  "login.html",
  "styles.css",
  "app.js",
  "home-motion.css",
  "home-motion.js",
  "login.css",
  "login.js",
  "profile-store.js",
  "schedule-cloud.js",
  "profile.css",
  "profile.js",
  "campus-model.js",
  "campus-social.js",
];

const appRoutes = [
  "browse",
  "rankings",
  "enrollment",
  "planner",
  "calendar",
  "map",
  "history",
  "account",
  "search",
  "instructor",
  "department",
];

function withRootBase(html) {
  if (/<base\s+href=["']\/["']/i.test(html)) return html;
  return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n  <base href="/" />`);
}

async function writeRoute(route, sourceName) {
  const source = path.join(root, sourceName);
  const html = withRootBase(await readFile(source, "utf8"));
  const targetDir = path.join(output, route);
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(targetDir, "index.html"), html);
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await Promise.all([
  cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true }),
  cp(path.join(root, "data"), path.join(output, "data"), { recursive: true }),
  ...runtimeFiles.map((name) => cp(path.join(root, name), path.join(output, name))),
]);

await writeFile(
  path.join(output, "index.html"),
  withRootBase(await readFile(path.join(root, "index.html"), "utf8")),
);
await writeRoute("home", "home.html");
await writeRoute("about", "home.html");
await writeRoute("login", "login.html");
await writeRoute("profile", "profile.html");
await Promise.all(appRoutes.map((route) => writeRoute(route, "index.html")));
const coursePages = new Map();
const catalogFiles = (await readdir(path.join(root, "data"))).filter((file) => /^courses-\d{4}-(Spring|Summer|Fall)\.js$/.test(file));
for (const file of catalogFiles.sort().reverse()) {
  const data = await readFile(path.join(root, "data", file), "utf8");
  const term = file.slice(8, -3);
  for (const { code } of JSON.parse(data.slice(data.indexOf("=") + 1).trim().replace(/;$/, ""))) {
    const slug = code.trim().toLowerCase().replace(/\s+/g, "-");
    if (/^[a-z0-9-]+$/.test(slug) && !coursePages.has(slug)) coursePages.set(slug, { code, term });
  }
}
for (const [slug, { code, term }] of coursePages) {
  const folder = path.join(output, "course", slug);
  const params = new URLSearchParams({ course: code, term, coursePath: slug });
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><title>${code} · Antivergil</title><script>const params=new URLSearchParams(${JSON.stringify(String(params))});const incoming=new URLSearchParams(location.search);for(const key of ["term","section"]){if(incoming.has(key))params.set(key,incoming.get(key));}location.replace("/browse/?"+params);</script><a href="/browse/?${String(params).replaceAll("&", "&amp;")}">Open course</a></html>\n`);
}
await writeFile(path.join(output, ".nojekyll"), "");

console.log(`Built ${appRoutes.length + 5} routes in ${output}`);
