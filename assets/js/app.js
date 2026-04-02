/**
 * College Memories — gallery app (GitHub Pages–friendly static site)
 */

/** Resolve against the page URL so `data/metadata.json` works on project pages (e.g. /repo/). */
const DATA_URL = new URL("data/metadata.json", document.baseURI).href;

const SELECTORS = {
  gallery: "#gallery",
  status: "#gallery-status",
  lightbox: "#lightbox",
  lightboxImg: "#lightbox-img",
  lightboxVideo: "#lightbox-video",
  lightboxClose: "#lightbox-close",
  pageContent: "#page-content",
};

let galleryEl = null;
let statusEl = null;
let lightboxEl = null;
let lightboxImg = null;
let lightboxVideo = null;
let lightboxCloseBtn = null;
let pageContentEl = null;

let allItems = [];
let activeFilter = "all";

/** @type {HTMLElement | null} */
let focusBeforeLightbox = null;

function $(sel) {
  return document.querySelector(sel);
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") return null;
  const id = String(item.id ?? "");
  const title = String(item.title ?? "Untitled");
  const category = String(item.category ?? "");
  const type = item.type === "video" ? "video" : "image";
  const src = String(item.src ?? "");
  const thumb = String(item.thumb ?? item.src ?? "");
  const date = String(item.date ?? "");
  if (!id || !src) return null;
  return { id, title, category, type, src, thumb, date };
}

function formatDate(isoOrText) {
  if (!isoOrText) return "";
  const d = new Date(isoOrText);
  if (Number.isNaN(d.getTime())) return isoOrText;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function playIconSvg() {
  return `<svg class="gallery-card__play-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="rgba(0,0,0,0.45)"/>
    <path d="M19 16L34 24L19 32V16Z" fill="white"/>
  </svg>`;
}

function createCard(item) {
  const article = document.createElement("article");
  article.className =
    "gallery-card" + (item.type === "video" ? " gallery-card--video" : "");
  article.tabIndex = 0;
  article.dataset.id = item.id;
  article.dataset.type = item.type;

  const media = document.createElement("div");
  media.className = "gallery-card__media";

  const img = document.createElement("img");
  img.src = item.thumb;
  img.alt = item.title;
  img.loading = "lazy";
  img.decoding = "async";
  media.appendChild(img);

  if (item.type === "video") {
    const play = document.createElement("div");
    play.className = "gallery-card__play";
    play.innerHTML = playIconSvg();
    media.appendChild(play);
  }

  const overlay = document.createElement("div");
  overlay.className = "gallery-card__overlay";

  const h3 = document.createElement("h3");
  h3.className = "gallery-card__title";
  h3.textContent = item.title;

  const time = document.createElement("time");
  time.className = "gallery-card__date";
  time.dateTime = item.date;
  time.textContent = formatDate(item.date);

  overlay.appendChild(h3);
  overlay.appendChild(time);
  media.appendChild(overlay);
  article.appendChild(media);

  return article;
}

function renderGallery(items) {
  if (!galleryEl) return;
  galleryEl.replaceChildren();
  for (const raw of items) {
    const item = normalizeItem(raw);
    if (!item) continue;
    galleryEl.appendChild(createCard(item));
  }
}

function getFilteredItems() {
  if (activeFilter === "all") return allItems;
  return allItems.filter((i) => i.category === activeFilter);
}

function updateFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    const f = btn.getAttribute("data-filter");
    btn.classList.toggle("is-active", f === activeFilter);
  });
}

function applyFilter(category) {
  activeFilter = category;
  updateFilterButtons();
  renderGallery(getFilteredItems());
}

function setStatus(message, isError) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("gallery-status--error", Boolean(isError));
}

function setLightboxOpen(open) {
  document.documentElement.classList.toggle("lightbox-open", open);
  if (pageContentEl && "inert" in pageContentEl) {
    pageContentEl.inert = open;
  }
  if (lightboxEl) {
    lightboxEl.setAttribute("aria-hidden", open ? "false" : "true");
  }
}

function openLightbox(item) {
  if (!lightboxEl || !lightboxImg || !lightboxVideo) return;

  focusBeforeLightbox = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  lightboxImg.hidden = true;
  lightboxVideo.hidden = true;
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.load();

  if (item.type === "video") {
    lightboxImg.removeAttribute("src");
    lightboxImg.alt = "";
    lightboxVideo.src = item.src;
    lightboxVideo.hidden = false;
  } else {
    lightboxImg.src = item.src;
    lightboxImg.alt = item.title;
    lightboxImg.hidden = false;
  }

  lightboxEl.hidden = false;
  setLightboxOpen(true);

  requestAnimationFrame(() => {
    lightboxCloseBtn?.focus({ preventScroll: true });
  });
}

function closeLightbox() {
  if (!lightboxEl || !lightboxImg || !lightboxVideo) return;
  lightboxEl.hidden = true;
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.load();
  lightboxImg.removeAttribute("src");
  lightboxImg.alt = "";
  setLightboxOpen(false);

  if (focusBeforeLightbox && document.body.contains(focusBeforeLightbox)) {
    focusBeforeLightbox.focus();
  }
  focusBeforeLightbox = null;
}

function findItemById(id) {
  return allItems.find((i) => i.id === id);
}

function onGalleryClick(e) {
  const card = e.target.closest(".gallery-card");
  if (!card || !galleryEl?.contains(card)) return;
  const id = card.dataset.id;
  if (!id) return;
  const item = findItemById(id);
  if (item) openLightbox(item);
}

function onGalleryKeydown(e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".gallery-card");
  if (!card || e.target !== card) return;
  e.preventDefault();
  const id = card.dataset.id;
  if (!id) return;
  const item = findItemById(id);
  if (item) openLightbox(item);
}

function onFilterClick(e) {
  const btn = e.target.closest(".filter-btn");
  if (!btn || !btn.getAttribute("data-filter")) return;
  const filter = btn.getAttribute("data-filter");
  if (filter) applyFilter(filter);
}

function onLightboxCloseClick(e) {
  if (e.target.closest("[data-lightbox-close]")) closeLightbox();
}

function onKeydown(e) {
  if (e.key === "Escape" && lightboxEl && !lightboxEl.hidden) {
    e.preventDefault();
    closeLightbox();
  }
}

async function loadMetadata() {
  setStatus("Loading…", false);
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid data shape");

    allItems = [];
    for (const row of data) {
      const n = normalizeItem(row);
      if (n) allItems.push(n);
    }

    if (allItems.length === 0) {
      setStatus("No memories to show.", false);
      renderGallery([]);
      return;
    }

    setStatus("", false);
    renderGallery(getFilteredItems());
  } catch (err) {
    console.error(err);
    setStatus("Could not load memories. Serve the site over HTTP and ensure data/metadata.json exists.", true);
    renderGallery([]);
  }
}

function init() {
  galleryEl = $(SELECTORS.gallery);
  statusEl = $(SELECTORS.status);
  lightboxEl = $(SELECTORS.lightbox);
  lightboxImg = $(SELECTORS.lightboxImg);
  lightboxVideo = $(SELECTORS.lightboxVideo);
  lightboxCloseBtn = $(SELECTORS.lightboxClose);
  pageContentEl = $(SELECTORS.pageContent);

  if (lightboxEl) {
    lightboxEl.setAttribute("aria-hidden", "true");
  }

  document.querySelector(".filters")?.addEventListener("click", onFilterClick);
  galleryEl?.addEventListener("click", onGalleryClick);
  galleryEl?.addEventListener("keydown", onGalleryKeydown);
  lightboxEl?.addEventListener("click", onLightboxCloseClick);
  document.addEventListener("keydown", onKeydown);

  loadMetadata();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
