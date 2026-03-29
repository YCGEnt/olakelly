"use strict";

const crypto = require("crypto");
const { COOKIE_NAME, SESSION_TTL_SECONDS, createSessionToken, readJsonBody, sendJson } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const body = await readJsonBody(req);
  const providedPassword = String(body.password || "");
  const expectedPassword = String(process.env.IDEAS_ADMIN_PASSWORD || "");
  const sessionSecret = process.env.IDEAS_ADMIN_SESSION_SECRET;

  if (!expectedPassword || !sessionSecret) {
    return sendJson(res, 500, { error: "Admin environment variables are not configured." });
  }

  const providedBuffer = Buffer.from(providedPassword);
  const expectedBuffer = Buffer.from(expectedPassword);
  const passwordsMatch =
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer);

  if (!passwordsMatch) {
    return sendJson(res, 401, { error: "Invalid password." });
  }

  const token = createSessionToken(sessionSecret);
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Max-Age=${SESSION_TTL_SECONDS}; Path=/; SameSite=Strict; Secure`;
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": cookie });
};
