"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const sanitizeHtml = require("sanitize-html");

const projectRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

async function testAtomicMemoryStore() {
  process.env.ALLOW_IN_MEMORY_SECURITY_STORE = "true";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  const store = require("../lib/security-store");
  await store.set("security-test:single-use", { ok: true }, 60);
  assert.deepStrictEqual(await store.getdel("security-test:single-use"), { ok: true });
  assert.strictEqual(await store.getdel("security-test:single-use"), null);
}

function testRedisConfigValidation() {
  const store = require("../lib/security-store");
  process.env.KV_REST_API_URL = "redis://not-a-rest-url";
  process.env.KV_REST_API_TOKEN = "test-token";
  assert.throws(
    () => store.validateRedisConfig(),
    /Upstash Redis REST URL is invalid/
  );
  process.env.KV_REST_API_URL = "redis://default:token@example.upstash.io:6379";
  assert.throws(
    () => store.validateRedisConfig(),
    /Upstash Redis REST URL is invalid/
  );
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
}

async function run() {
  const sanitized = sanitizeHtml("<xmp><script>alert(1)</script></xmp>");
  assert(!sanitized.includes("<script>"), "sanitize-html must reject the xmp script bypass");

  const adminHtml = read("admin/ideas/index.html");
  assert(adminHtml.includes('id="previewFrame" class="admin-preview-frame is-hidden" title="Live site preview" sandbox="allow-scripts"'));
  assert(adminHtml.includes('id="publishPreviewFrame" class="admin-preview-frame is-hidden" title="Vercel publish preview" sandbox="allow-scripts"'));
  assert(!adminHtml.includes('sandbox="allow-scripts allow-same-origin"'));
  assert(!adminHtml.includes("cdn.tailwindcss.com"));
  assert(!adminHtml.includes("cdn.jsdelivr.net"));
  assert(!adminHtml.includes("unpkg.com"));
  assert(adminHtml.includes("Admin build 20260531f"));
  assert(adminHtml.includes("admin-ideas.js?v=20260531f"));

  const homepageScript = read("scripts/main.js");
  assert(homepageScript.includes("latestIdeasGrid.replaceChildren()"));
  assert(homepageScript.includes("title.textContent = post.title"));
  assert(homepageScript.includes('url.startsWith("/ideas/")'));

  const githubApp = read("lib/github-app.js");
  const publishingLib = read("api/admin/_lib.js");
  assert(githubApp.includes("findOpenContentPr,"));
  assert(githubApp.includes("isControlledContentBranch"));
  assert(githubApp.includes("existing.head.ref !== branch"));
  assert(publishingLib.includes("reusablePrBranch"));

  const webhook = read("api/admin/github-webhook.js");
  assert(webhook.includes("MAX_WEBHOOK_BODY_BYTES"));
  assert(webhook.includes("Webhook body is too large."));

  const auth = read("lib/admin-auth.js");
  assert(auth.includes('store.getdel(`webauthn:${challengeId}`)'));
  assert(auth.includes("challengeRecord.sessionId !== session.id"));
  assert(auth.includes("hashPayload(storedContext) !== hashPayload(context || {})"));

  const security = read("lib/security.js");
  assert(security.includes("const record = await store.getdel(key);"));
  assert(security.includes("const grant = await store.getdel(key);"));

  await testAtomicMemoryStore();
  testRedisConfigValidation();
  console.log("Security regression checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
