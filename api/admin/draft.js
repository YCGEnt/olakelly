"use strict";

const { readJsonBody, requireSession, saveDraftToBlob, sendJson } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  if (!requireSession(req, res)) return;

  try {
    const body = await readJsonBody(req);
    const draft = await saveDraftToBlob(body);
    return sendJson(res, 200, {
      ok: true,
      mode: "draft",
      id: draft.id,
      draft_id: draft.draft_id,
      slug: draft.slug,
      published_slug: draft.published_slug,
      updated_at: draft.updated_at,
      message: "Draft saved securely."
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 400, { error: error.message || "Draft save failed." });
  }
};
