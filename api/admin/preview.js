"use strict";

const { readJsonBody, renderPreviewHtml, requireSession, sendJson } = require("./_lib");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  if (!requireSession(req, res)) return;

  try {
    const body = await readJsonBody(req);
    const preview = renderPreviewHtml(body);
    return sendJson(res, 200, {
      html: preview.html,
      slug: preview.post.slug,
      reading_time: preview.post.reading_time,
      word_count: preview.post.word_count
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Preview failed." });
  }
};
