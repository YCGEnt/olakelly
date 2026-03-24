"use strict";

const { readJsonBody, requireSession, savePostToGitHub, sendJson } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  if (!requireSession(req, res)) return;

  try {
    const body = await readJsonBody(req);
    const result = await savePostToGitHub(body);
    return sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message || "Save failed." });
  }
};
