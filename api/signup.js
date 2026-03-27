"use strict";

const { readJsonBody, sendJson } = require("./admin/_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." }, { Allow: "POST" });
  }

  const webhookUrl = String(process.env.PABBLY_SIGNUP_WEBHOOK_URL || "").trim();

  if (!webhookUrl) {
    return sendJson(res, 500, { error: "Signup webhook is not configured." });
  }

  try {
    const body = await readJsonBody(req);
    const email = String(body.email || "").trim();
    const source = String(body.source || "unknown").trim() || "unknown";

    if (!email) {
      return sendJson(res, 400, { error: "Email is required." });
    }

    const upstreamResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source })
    });

    if (upstreamResponse.status === 200) {
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 502, { error: "Signup request failed." });
  } catch (error) {
    return sendJson(res, 500, { error: "Signup request failed." });
  }
};
