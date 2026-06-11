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

function testTotpVerifier() {
  const { generateSync } = require("otplib");
  const { verifyTotpToken } = require("../lib/admin-auth");
  const secret = "JMJSCZB5HL5MBMRSLKMNVX52XIJTBWUH";
  const epoch = Math.floor(Date.now() / 1000);
  const token = generateSync({ secret, epoch });
  const originalDateNow = Date.now;
  Date.now = () => epoch * 1000;
  try {
    assert.strictEqual(verifyTotpToken(token, secret), true);
    assert.strictEqual(verifyTotpToken("000000", secret), false);
  } finally {
    Date.now = originalDateNow;
  }
}

async function run() {
  const sanitized = sanitizeHtml("<xmp><script>alert(1)</script></xmp>");
  assert(!sanitized.includes("<script>"), "sanitize-html must reject the xmp script bypass");

  const adminHtml = read("admin/ideas/index.html");
  assert(adminHtml.includes('id="previewFrame" class="admin-preview-frame is-hidden" title="Live site preview" sandbox="allow-same-origin"'));
  assert(adminHtml.includes('id="publishPreviewFrame" class="admin-preview-frame is-hidden" title="Vercel publish preview" sandbox="allow-scripts"'));
  assert(!adminHtml.includes('sandbox="allow-scripts allow-same-origin"'));
  assert(!adminHtml.includes("cdn.tailwindcss.com"));
  assert(!adminHtml.includes("cdn.jsdelivr.net"));
  assert(!adminHtml.includes("unpkg.com"));
  assert(adminHtml.includes("Admin build 20260611c"));
  assert(adminHtml.includes("admin-ideas.js?v=20260611c"));

  const { renderPreviewHtml } = require("../api/admin/_lib");
  const preview = renderPreviewHtml({
    title: "Preview Test",
    slug: "preview-test",
    category: "Sustainable Leadership",
    tags: ["Scope", "leadership"],
    excerpt: "A test preview.",
    content: "This is a preview test.",
    preview_theme: "dark"
  });
  assert(preview.html.includes("preview-shell"));
  assert(preview.html.includes('body class="preview-dark"'));
  assert(preview.html.includes("body.preview-dark"));
  assert(!/<script\b/i.test(preview.html));
  assert(preview.html.includes("Preview Test"));
  assert(preview.html.includes("This is a preview test."));

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
  assert(auth.includes('return require("@simplewebauthn/server");'));
  assert(auth.includes("function verifyTotpToken"));
  assert(auth.includes('crypto.createHmac("sha1"'));
  assert(auth.includes('store.getdel(`webauthn:${challengeId}`)'));
  assert(auth.includes("challengeRecord.sessionId !== session.id"));
  assert(auth.includes("hashPayload(storedContext) !== hashPayload(context || {})"));

  const adminScript = read("scripts/admin-ideas.js");
  assert(adminScript.includes("stateChangingRequestQueue"));
  assert(adminScript.includes("sendApiRequest(url, options, method)"));
  assert(adminScript.includes("...payload,"));
  assert(adminScript.includes('preview_theme: htmlElement.classList.contains("dark-mode") ? "dark" : "light"'));
  const sharedPayloadStart = adminScript.indexOf("async function getFormPayload()");
  const sharedPayloadEnd = adminScript.indexOf("async function sendApiRequest", sharedPayloadStart);
  assert(!adminScript.slice(sharedPayloadStart, sharedPayloadEnd).includes("preview_theme"));

  const security = read("lib/security.js");
  assert(security.includes("const record = await store.getdel(key);"));
  assert(security.includes("const grant = await store.getdel(key);"));
  assert(security.includes("olakelly-[a-z0-9-]+-ycgents-projects"));

  await testAtomicMemoryStore();
  testRedisConfigValidation();
  testTotpVerifier();
  console.log("Security regression checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
