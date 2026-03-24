(function () {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }

  const loginForm = document.getElementById("adminLoginForm");
  const loginPanel = document.getElementById("adminLoginPanel");
  const loginMessage = document.getElementById("adminLoginMessage");
  const editorShell = document.getElementById("adminEditorShell");
  const editorForm = document.getElementById("ideasAdminForm");
  const editorMessage = document.getElementById("adminEditorMessage");
  const previewButton = document.getElementById("previewPostBtn");
  const logoutButton = document.getElementById("adminLogoutBtn");
  const previewFrame = document.getElementById("previewFrame");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  const previewSlug = document.getElementById("previewSlug");
  const previewReadTime = document.getElementById("previewReadTime");
  const previewWordCount = document.getElementById("previewWordCount");
  const editorHeading = document.getElementById("editorHeading");
  const titleInput = document.getElementById("postTitle");
  const slugInput = document.getElementById("postSlug");
  const originalSlugInput = document.getElementById("originalSlug");
  const statusInput = document.getElementById("postStatus");
  const savePostBtn = document.getElementById("savePostBtn");
  const homepageFeaturedInput = document.querySelector('input[name="homepage_featured"]');
  const homepageOrderInput = document.getElementById("homepageOrderInput");
  const saveStatus = document.getElementById("saveStatus");
  const adminThemeToggle = document.getElementById("adminThemeToggle");
  const htmlElement = document.documentElement;
  const bodyElement = document.body;

  let slugManuallyEdited = false;
  let previewDebounceTimer = null;
  let lastSavedAt = null;
  let saveStatusTimer = null;
  let latestPreviewRequest = 0;

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function setMessage(target, message, isError) {
    target.textContent = message || "";
    target.classList.toggle("is-error", Boolean(isError));
  }

  function syncThemeToggle() {
    if (!adminThemeToggle) return;
    const isDarkMode = htmlElement.classList.contains("dark-mode");
    adminThemeToggle.classList.toggle("dark", isDarkMode);
    adminThemeToggle.setAttribute("aria-label", isDarkMode ? "Switch to light mode" : "Switch to dark mode");
  }

  function setTheme(isDarkMode) {
    htmlElement.classList.toggle("dark-mode", isDarkMode);
    bodyElement.classList.toggle("dark-mode", isDarkMode);
    localStorage.setItem("darkMode", isDarkMode ? "true" : "false");
    syncThemeToggle();
  }

  function toggleTheme() {
    setTheme(!htmlElement.classList.contains("dark-mode"));
  }

  function loadThemePreference() {
    const storedPreference = localStorage.getItem("darkMode");
    setTheme(storedPreference !== "false");
  }

  function syncSaveButtonLabel() {
    if (!savePostBtn || !statusInput) return;
    savePostBtn.textContent = statusInput.value === "published" ? "Publish" : "Save Draft";
  }

  function syncEditorHeading() {
    if (!editorHeading || !titleInput) return;
    editorHeading.textContent = titleInput.value.trim() || "New Idea";
  }

  function setPreviewVisibility(hasPreview) {
    previewPlaceholder?.classList.toggle("is-hidden", hasPreview);
    previewFrame?.classList.toggle("is-hidden", !hasPreview);
  }

  function clearPreview() {
    if (previewFrame) {
      previewFrame.srcdoc = "";
    }
    setPreviewVisibility(false);
  }

  function updateSaveStatus() {
    if (!saveStatus) return;
    if (!lastSavedAt) {
      saveStatus.textContent = "";
      return;
    }

    const elapsedMinutes = Math.floor((Date.now() - lastSavedAt.getTime()) / 60000);
    saveStatus.textContent = elapsedMinutes <= 0 ? "Saved just now" : `Saved ${elapsedMinutes} min ago`;
  }

  function markSavedNow() {
    lastSavedAt = new Date();
    updateSaveStatus();
    if (saveStatusTimer) {
      window.clearInterval(saveStatusTimer);
    }
    saveStatusTimer = window.setInterval(updateSaveStatus, 60000);
  }

  function syncHomepageOrderState() {
    if (!homepageFeaturedInput || !homepageOrderInput) return;
    const isEnabled = homepageFeaturedInput.checked;
    homepageOrderInput.disabled = !isEnabled;
    if (!isEnabled) {
      homepageOrderInput.value = "";
    }
  }

  function setEditorAuthenticated(isAuthenticated) {
    logoutButton?.classList.toggle("is-hidden", !isAuthenticated);
    loginPanel?.classList.toggle("is-hidden", isAuthenticated);
    editorShell?.classList.toggle("is-hidden", !isAuthenticated);
  }

  async function runPreview() {
    if (!editorShell || editorShell.classList.contains("is-hidden")) return;

    const payload = await getFormPayload();
    if (!payload.title || !payload.excerpt || !payload.content) {
      clearPreview();
      return;
    }

    const requestId = Date.now();
    latestPreviewRequest = requestId;
    const data = await requestJson("/api/admin/preview", payload);
    if (latestPreviewRequest !== requestId) return;

    previewFrame.srcdoc = data.html || "";
    previewSlug.textContent = data.slug || "-";
    previewReadTime.textContent = data.reading_time ? `${data.reading_time} min` : "-";
    previewWordCount.textContent = data.word_count || "-";
    setPreviewVisibility(Boolean(data.html));
    if (!originalSlugInput.value && data.slug) {
      originalSlugInput.value = data.slug;
    }
  }

  function schedulePreview() {
    if (previewDebounceTimer) {
      window.clearTimeout(previewDebounceTimer);
    }

    previewDebounceTimer = window.setTimeout(async () => {
      try {
        await runPreview();
      } catch (_error) {
        clearPreview();
      }
    }, 450);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function getFormPayload() {
    const formData = new FormData(editorForm);
    const tags = String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const file = formData.get("cover_image_file");

    return {
      title: String(formData.get("title") || "").trim(),
      subtitle: String(formData.get("subtitle") || "").trim(),
      slug: String(formData.get("slug") || "").trim(),
      original_slug: String(formData.get("original_slug") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      tags,
      excerpt: String(formData.get("excerpt") || "").trim(),
      intent: String(formData.get("intent") || "").trim(),
      featured: formData.get("featured") === "on",
      homepage_featured: formData.get("homepage_featured") === "on",
      homepage_order: String(formData.get("homepage_order") || "").trim(),
      status: String(formData.get("status") || "draft"),
      date: String(formData.get("date") || "").trim(),
      show_date: formData.get("show_date") === "on",
      show_updated_date: formData.get("show_updated_date") === "on",
      seo_title: String(formData.get("seo_title") || "").trim(),
      seo_description: String(formData.get("seo_description") || "").trim(),
      canonical_url: String(formData.get("canonical_url") || "").trim(),
      content: String(formData.get("content") || "").trim(),
      cover_image_alt: String(formData.get("cover_image_alt") || "").trim(),
      cover_image_data: file instanceof File && file.size > 0 ? await readFileAsDataUrl(file) : ""
    };
  }

  async function requestJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }
    return data;
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.getElementById("adminPassword").value;
    try {
      await requestJson("/api/admin/login", { password });
      setMessage(loginMessage, "");
      setEditorAuthenticated(true);
    } catch (error) {
      setMessage(loginMessage, error.message, true);
    }
  });

  titleInput?.addEventListener("input", () => {
    if (!slugManuallyEdited) {
      slugInput.value = slugify(titleInput.value);
    }
    syncEditorHeading();
    schedulePreview();
  });

  slugInput?.addEventListener("input", () => {
    slugManuallyEdited = true;
    schedulePreview();
  });

  adminThemeToggle?.addEventListener("click", toggleTheme);
  statusInput?.addEventListener("change", syncSaveButtonLabel);
  statusInput?.addEventListener("change", schedulePreview);
  homepageFeaturedInput?.addEventListener("change", syncHomepageOrderState);
  homepageFeaturedInput?.addEventListener("change", schedulePreview);
  logoutButton?.addEventListener("click", async () => {
    try {
      await requestJson("/api/admin/logout", {});
    } catch (_error) {
      // Redirect regardless so the user lands back on the login screen.
    }
    window.location.href = "/admin/ideas/";
  });

  previewButton?.addEventListener("click", async () => {
    setMessage(editorMessage, "");
    try {
      await runPreview();
    } catch (error) {
      setMessage(editorMessage, error.message, true);
    }
  });

  editorForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(editorMessage, "");

    try {
      const payload = await getFormPayload();
      if (payload.original_slug && payload.original_slug !== payload.slug && payload.status === "published") {
        payload.confirm_slug_change = window.confirm(
          "This post looks like a published slug change. Continue and create a redirect from the old slug?"
        );
      }

      const data = await requestJson("/api/admin/save", payload);
      previewSlug.textContent = data.slug || "-";
      previewReadTime.textContent = data.reading_time ? `${data.reading_time} min` : "-";
      previewWordCount.textContent = data.word_count || "-";
      originalSlugInput.value = data.slug || payload.slug;
      setPreviewVisibility(true);
      markSavedNow();
      setMessage(editorMessage, "Post saved to the Git-backed content system.");
    } catch (error) {
      setMessage(editorMessage, error.message, true);
    }
  });

  editorForm?.addEventListener("input", (event) => {
    if (event.target === titleInput || event.target === slugInput) return;
    schedulePreview();
  });

  editorForm?.addEventListener("change", (event) => {
    if (event.target === homepageFeaturedInput) return;
    schedulePreview();
  });

  loadThemePreference();
  syncSaveButtonLabel();
  syncEditorHeading();
  syncHomepageOrderState();
  setEditorAuthenticated(false);
  clearPreview();
})();
