"use strict";

const crypto = require("crypto");
const path = require("path");
const matter = require("gray-matter");
const { computePost, renderPostPage, serializeFrontMatter } = require("../../lib/blog");

const COOKIE_NAME = "ideas_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 4;

function sendJson(res, statusCode, payload, headers = {}) {
  Object.entries({
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  }).forEach(([key, value]) => res.setHeader(key, value));
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function createSessionToken(secret) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || !secret) return false;
  const [expiresAt, signature] = String(token).split(".");
  if (!expiresAt || !signature) return false;
  if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac("sha256", secret).update(expiresAt).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (_error) {
    return false;
  }
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) return accumulator;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function requireSession(req, res) {
  const secret = process.env.IDEAS_ADMIN_SESSION_SECRET;
  const cookies = parseCookies(req.headers.cookie);
  if (!verifySessionToken(cookies[COOKIE_NAME], secret)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return false;
  }
  return true;
}

function buildPreviewPost(body) {
  return computePost(
    {
      id: body.id || `preview-${Date.now()}`,
      title: body.title,
      subtitle: body.subtitle,
      slug: body.slug || body.title,
      status: body.status || "draft",
      featured: Boolean(body.featured),
      homepage_featured: Boolean(body.homepage_featured),
      homepage_order: body.homepage_order,
      date: body.date || new Date().toISOString(),
      updated: new Date().toISOString(),
      category: body.category || "STEWARD Framework",
      category_slug: body.category_slug || "steward-framework",
      tags: body.tags || [],
      excerpt: body.excerpt,
      intent: body.intent || "",
      seo_title: body.seo_title || body.title,
      seo_description: body.seo_description || body.excerpt,
      canonical_url: body.canonical_url || "",
      show_date: body.show_date !== false,
      show_updated_date: Boolean(body.show_updated_date),
      cover_image: body.cover_image || "",
      cover_image_alt: body.cover_image_alt || "",
      related_posts: body.related_posts || []
    },
    body.content || ""
  );
}

function renderPreviewHtml(body) {
  const previewPost = buildPreviewPost(body);
  return {
    post: previewPost,
    html: renderPostPage(previewPost, [])
  };
}

function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_REPO_BRANCH || "staging";

  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub repository environment variables.");
  }

  return { token, owner, repo, branch };
}

function createGitHubUrl(filePath) {
  const { owner, repo } = getGitHubConfig();
  return `https://api.github.com/repos/${owner}/${repo}/contents/${filePath.replace(/\\/g, "/")}`;
}

async function githubRequest(filePath, method = "GET", body) {
  const { token, branch } = getGitHubConfig();
  const response = await fetch(createGitHubUrl(filePath), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "olakelly-ideas-admin"
    },
    body: body ? JSON.stringify({ branch, ...body }) : undefined
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub request failed: ${response.status} ${errorText}`);
  }
  return response.json();
}

async function getGitHubFile(filePath) {
  const response = await githubRequest(filePath);
  if (!response) return null;
  const content = Buffer.from(response.content, "base64").toString("utf8");
  return {
    sha: response.sha,
    content
  };
}

async function putGitHubFile(filePath, content, message) {
  const existing = await getGitHubFile(filePath);
  return githubRequest(filePath, "PUT", {
    message,
    content: Buffer.from(content).toString("base64"),
    sha: existing ? existing.sha : undefined
  });
}

async function deleteGitHubFile(filePath, message) {
  const existing = await getGitHubFile(filePath);
  if (!existing) return null;
  return githubRequest(filePath, "DELETE", {
    message,
    sha: existing.sha
  });
}

function parseExistingSource(source) {
  const separator = "\n---\n";
  const secondIndex = source.indexOf(separator, 4);
  if (secondIndex === -1) return {};
  return matter(source).data;
}

function parsePostSource(source) {
  const parsed = matter(String(source || ""));
  const frontMatter = parsed.data || {};

  return {
    id: String(frontMatter.id || "").trim(),
    title: String(frontMatter.title || "").trim(),
    subtitle: String(frontMatter.subtitle || "").trim(),
    slug: String(frontMatter.slug || "").trim(),
    status: String(frontMatter.status || "draft").trim(),
    featured: Boolean(frontMatter.featured),
    homepage_featured: Boolean(frontMatter.homepage_featured),
    homepage_order: Number.isFinite(Number(frontMatter.homepage_order)) ? Number(frontMatter.homepage_order) : null,
    date: String(frontMatter.date || "").slice(0, 10),
    updated: String(frontMatter.updated || "").trim(),
    category: String(frontMatter.category || "").trim(),
    category_slug: String(frontMatter.category_slug || "").trim(),
    tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
    excerpt: String(frontMatter.excerpt || "").trim(),
    intent: String(frontMatter.intent || "").trim(),
    seo_title: String(frontMatter.seo_title || "").trim(),
    seo_description: String(frontMatter.seo_description || "").trim(),
    canonical_url: String(frontMatter.canonical_url || "").trim(),
    show_date: frontMatter.show_date !== false,
    show_updated_date: Boolean(frontMatter.show_updated_date),
    cover_image: String(frontMatter.cover_image || "").trim(),
    cover_image_alt: String(frontMatter.cover_image_alt || "").trim(),
    related_posts: Array.isArray(frontMatter.related_posts) ? frontMatter.related_posts : [],
    content: String(parsed.content || "").trim()
  };
}

async function listGitHubPostFiles() {
  const response = await githubRequest("content/posts");
  if (!Array.isArray(response)) return [];
  return response
    .filter((entry) => entry && entry.type === "file" && /\.md$/i.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      path: entry.path || `content/posts/${entry.name}`
    }));
}

async function getPostSourceBySlug(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) return null;
  const sourceFile = await getGitHubFile(`content/posts/${normalizedSlug}.md`);
  if (!sourceFile) return null;
  return parsePostSource(sourceFile.content);
}

async function getRecentPosts(limit = 5) {
  const files = await listGitHubPostFiles();
  const sources = await Promise.all(
    files.map(async (file) => {
      const sourceFile = await getGitHubFile(file.path);
      if (!sourceFile) return null;
      const post = parsePostSource(sourceFile.content);
      return {
        title: post.title,
        slug: post.slug,
        status: post.status,
        date: post.date
      };
    })
  );

  return sources
    .filter((post) => post && post.slug && post.title && post.date)
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, limit);
}

async function updateRedirectsIfNeeded(originalSlug, nextSlug) {
  if (!originalSlug || !nextSlug || originalSlug === nextSlug) return;
  const redirectsPath = "content/redirects.json";
  const existingRedirects = await getGitHubFile(redirectsPath);
  const payload = existingRedirects ? JSON.parse(existingRedirects.content) : { redirects: [] };
  const filtered = Array.isArray(payload.redirects) ? payload.redirects.filter((entry) => entry.from !== originalSlug) : [];
  filtered.push({ from: originalSlug, to: nextSlug });
  await putGitHubFile(redirectsPath, JSON.stringify({ redirects: filtered }, null, 2), `Add redirect from ${originalSlug} to ${nextSlug}`);
}

function decodeDataUrl(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(String(dataUrl || ""));
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function extensionFromMimeType(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "bin";
}

async function savePostToGitHub(body) {
  const now = new Date().toISOString();
  const requestedSlug = body.slug || body.title;
  const originalSlug = body.original_slug || requestedSlug;
  const nextPost = computePost(
    {
      id: body.id,
      title: body.title,
      subtitle: body.subtitle,
      slug: requestedSlug,
      status: body.status,
      featured: Boolean(body.featured),
      homepage_featured: Boolean(body.homepage_featured),
      homepage_order: body.homepage_order,
      date: body.date || now,
      updated: now,
      category: body.category || "STEWARD Framework",
      category_slug: body.category_slug || "steward-framework",
      tags: body.tags || [],
      excerpt: body.excerpt,
      intent: body.intent || "",
      seo_title: body.seo_title || `${body.title} | Ola Kelly`,
      seo_description: body.seo_description || body.excerpt,
      canonical_url: body.canonical_url || "",
      show_date: body.show_date !== false,
      show_updated_date: Boolean(body.show_updated_date),
      cover_image: body.cover_image || "",
      cover_image_alt: body.cover_image_alt || "",
      related_posts: body.related_posts || []
    },
    body.content || ""
  );

  const originalPath = `content/posts/${originalSlug}.md`;
  const existingSource = await getGitHubFile(originalPath);
  const existingData = existingSource ? parseExistingSource(existingSource.content) : null;
  const existingWasPublished = existingData && existingData.status === "published";

  if (existingWasPublished && originalSlug !== nextPost.slug && !body.confirm_slug_change) {
    const error = new Error("Published slug changes require explicit confirmation.");
    error.statusCode = 409;
    throw error;
  }

  let coverImagePath = nextPost.cover_image;
  if (body.cover_image_data) {
    const decoded = decodeDataUrl(body.cover_image_data);
    if (!decoded) {
      throw new Error("Invalid cover image format.");
    }
    const extension = extensionFromMimeType(decoded.mimeType);
    coverImagePath = `/assets/posts/${nextPost.slug}/cover.${extension}`;
    await putGitHubFile(
      path.posix.join("assets", "posts", nextPost.slug, `cover.${extension}`),
      decoded.buffer,
      `Upload cover image for ${nextPost.slug}`
    );
  }

  const source = serializeFrontMatter({
    ...nextPost,
    cover_image: coverImagePath
  });

  await putGitHubFile(`content/posts/${nextPost.slug}.md`, source, `Save idea: ${nextPost.title}`);
  if (existingSource && originalSlug !== nextPost.slug) {
    await deleteGitHubFile(`content/posts/${originalSlug}.md`, `Remove old slug source for ${originalSlug}`);
    await updateRedirectsIfNeeded(originalSlug, nextPost.slug);
  }

  return {
    slug: nextPost.slug,
    url: nextPost.url,
    reading_time: nextPost.reading_time,
    word_count: nextPost.word_count
  };
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getPostSourceBySlug,
  getRecentPosts,
  readJsonBody,
  renderPreviewHtml,
  requireSession,
  savePostToGitHub,
  sendJson
};
