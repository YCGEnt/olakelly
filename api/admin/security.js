"use strict";

const { getSession } = require("../../lib/admin-auth");
const {
  createCsrfCookie,
  createCsrfToken,
  createNonce,
  getHighSignalEvents,
  sendJson
} = require("../../lib/security");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed." }, { Allow: "GET" });
  }

  let session;
  try {
    session = await getSession(req, res, { respond: false });
  } catch (error) {
    console.error("Unable to load admin security session.", error);
    return sendJson(res, 503, {
      error: `Security session lookup failed: ${error.message || "Unknown error."}`
    });
  }
  if (!session) {
    const csrf = createCsrfToken();
    return sendJson(res, 200, {
      ok: true,
      authenticated: false,
      csrf,
      flags: {
        admin_enabled: String(process.env.ADMIN_ENABLED || "true").toLowerCase() !== "false",
        publish_enabled: String(process.env.PUBLISH_ENABLED || "true").toLowerCase() !== "false",
        forms_enabled: String(process.env.FORMS_ENABLED || "true").toLowerCase() !== "false",
        builds_enabled: String(process.env.BUILDS_ENABLED || "true").toLowerCase() !== "false"
      },
      security_events: []
    }, { "Set-Cookie": createCsrfCookie(csrf) });
  }

  let nonce;
  let securityEvents;
  try {
    nonce = await createNonce(session.id);
    securityEvents = await getHighSignalEvents();
  } catch (error) {
    console.error("Unable to load authenticated admin security state.", error);
    return sendJson(res, 503, {
      error: `Authenticated security state failed: ${error.message || "Unknown error."}`
    });
  }
  return sendJson(res, 200, {
    ok: true,
    authenticated: true,
    csrf: session.csrf,
    nonce,
    flags: {
      admin_enabled: String(process.env.ADMIN_ENABLED || "true").toLowerCase() !== "false",
      publish_enabled: String(process.env.PUBLISH_ENABLED || "true").toLowerCase() !== "false",
      forms_enabled: String(process.env.FORMS_ENABLED || "true").toLowerCase() !== "false",
      builds_enabled: String(process.env.BUILDS_ENABLED || "true").toLowerCase() !== "false"
    },
    security_events: securityEvents
  });
};
