"use strict";

const fs = require("fs");
const path = require("path");
const { SITE_CSS_VERSION, SITE_JS_VERSION } = require("../lib/asset-versions");
const {
  createFeedJson,
  createFeedXml,
  createLatestPostsJson,
  createPostsIndexJson,
  filterPublished,
  getRelatedPosts,
  loadPosts,
  renderCategoryPage,
  renderIdeasIndexPage,
  renderPostPage,
  renderRedirectPage
} = require("../lib/blog");

const projectRoot = path.resolve(__dirname, "..");
const postsDirectory = path.join(projectRoot, "content", "posts");
const redirectsPath = path.join(projectRoot, "content", "redirects.json");
const staticPages = [
  path.join(projectRoot, "index.html"),
  path.join(projectRoot, "about.html"),
  path.join(projectRoot, "disclaimer.html"),
  path.join(projectRoot, "privacy-policy.html"),
  path.join(projectRoot, "terms.html"),
  path.join(projectRoot, "steward-framework.html")
];

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function writeFile(filePath, contents) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, contents, "utf8");
}

function syncStaticPageAssetVersions() {
  staticPages.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;
    const source = fs.readFileSync(filePath, "utf8");
    const updated = source
      .replace(/styles\/main\.css\?v=[^"]+/g, `styles/main.css?v=${SITE_CSS_VERSION}`)
      .replace(/scripts\/main\.js\?v=[^"]+/g, `scripts/main.js?v=${SITE_JS_VERSION}`);
    if (updated !== source) {
      fs.writeFileSync(filePath, updated, "utf8");
    }
  });
}

function loadRedirects() {
  if (!fs.existsSync(redirectsPath)) return [];
  const redirectsData = JSON.parse(fs.readFileSync(redirectsPath, "utf8"));
  return Array.isArray(redirectsData.redirects) ? redirectsData.redirects : [];
}

function buildIdeas() {
  syncStaticPageAssetVersions();
  const posts = loadPosts(postsDirectory);
  const publishedPosts = filterPublished(posts);

  writeFile(path.join(projectRoot, "ideas", "index.html"), renderIdeasIndexPage(publishedPosts));

  publishedPosts.forEach((post) => {
    const relatedPosts = getRelatedPosts(post, publishedPosts);
    writeFile(path.join(projectRoot, "ideas", post.slug, "index.html"), renderPostPage(post, relatedPosts));
  });

  const categories = new Map();
  publishedPosts.forEach((post) => {
    if (!categories.has(post.category_slug)) {
      categories.set(post.category_slug, {
        category: post.category,
        category_slug: post.category_slug,
        posts: []
      });
    }
    categories.get(post.category_slug).posts.push(post);
  });

  categories.forEach((entry) => {
    writeFile(
      path.join(projectRoot, "ideas", "category", entry.category_slug, "index.html"),
      renderCategoryPage(entry, entry.posts)
    );
  });

  loadRedirects().forEach((redirect) => {
    if (!redirect || !redirect.from || !redirect.to) return;
    writeFile(
      path.join(projectRoot, "ideas", redirect.from, "index.html"),
      renderRedirectPage(redirect.to, 2)
    );
  });

  writeFile(path.join(projectRoot, "data", "posts-index.json"), JSON.stringify(createPostsIndexJson(publishedPosts), null, 2));
  writeFile(path.join(projectRoot, "data", "latest-posts.json"), JSON.stringify(createLatestPostsJson(publishedPosts), null, 2));
  writeFile(path.join(projectRoot, "feed.json"), JSON.stringify(createFeedJson(publishedPosts), null, 2));
  writeFile(path.join(projectRoot, "feed.xml"), createFeedXml(publishedPosts));

  console.log(`Built ${publishedPosts.length} published posts.`);
}

buildIdeas();
