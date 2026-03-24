(function () {
  const loginForm = document.getElementById("adminLoginForm");
  const loginPanel = document.getElementById("adminLoginPanel");
  const loginMessage = document.getElementById("adminLoginMessage");
  const editorShell = document.getElementById("adminEditorShell");
  const editorForm = document.getElementById("ideasAdminForm");
  const editorMessage = document.getElementById("adminEditorMessage");
  const previewButton = document.getElementById("previewPostBtn");
  const previewFrame = document.getElementById("previewFrame");
  const previewSlug = document.getElementById("previewSlug");
  const previewReadTime = document.getElementById("previewReadTime");
  const previewWordCount = document.getElementById("previewWordCount");
  const titleInput = document.getElementById("postTitle");
  const slugInput = document.getElementById("postSlug");
  const originalSlugInput = document.getElementById("originalSlug");

  let slugManuallyEdited = false;

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
      loginPanel.classList.add("is-hidden");
      editorShell.classList.remove("is-hidden");
    } catch (error) {
      setMessage(loginMessage, error.message, true);
    }
  });

  titleInput?.addEventListener("input", () => {
    if (!slugManuallyEdited) {
      slugInput.value = slugify(titleInput.value);
    }
  });

  slugInput?.addEventListener("input", () => {
    slugManuallyEdited = true;
  });

  previewButton?.addEventListener("click", async () => {
    setMessage(editorMessage, "");
    try {
      const payload = await getFormPayload();
      const data = await requestJson("/api/admin/preview", payload);
      previewFrame.srcdoc = data.html || "";
      previewSlug.textContent = data.slug || "-";
      previewReadTime.textContent = data.reading_time ? `${data.reading_time} min` : "-";
      previewWordCount.textContent = data.word_count || "-";
      if (!originalSlugInput.value && data.slug) {
        originalSlugInput.value = data.slug;
      }
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
      setMessage(editorMessage, "Post saved to the Git-backed content system.");
    } catch (error) {
      setMessage(editorMessage, error.message, true);
    }
  });
})();
