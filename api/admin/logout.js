"use strict";

const { COOKIE_NAME, sendJson } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const cookie = `${COOKIE_NAME}=; HttpOnly; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Strict; Secure`;
  return sendJson(res, 200, { ok: true }, { "Set-Cookie": cookie });
};
