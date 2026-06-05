const CONTENT = {
  landing: "content/landing.txt",
  contact: "content/contact.txt",
  manifest: "content/products.json",
  productBase: "content/products/",
};

const FALLBACK_LANDING =
  "Muebles y objetos usados listos para una nueva casa.\nRevisa el catálogo y consulta por el artículo que te interese.";
const FALLBACK_CONTACT =
  "Para consultar por un artículo, escribinos indicando el nombre del producto.";

const state = {
  products: [],
  hideSold: false,
  contactText: "",
  lightboxImages: [],
  lightboxIndex: 0,
};

const elements = {
  landingText: document.querySelector("#landing-text"),
  landingContact: document.querySelector("#landing-contact"),
  statusMessage: document.querySelector("#status-message"),
  grid: document.querySelector("#product-grid"),
  soldToggle: document.querySelector("#sold-toggle"),
  lightbox: document.querySelector("#lightbox"),
  lightboxImage: document.querySelector("#lightbox-image"),
  lightboxCounter: document.querySelector("#lightbox-counter"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  elements.soldToggle.addEventListener("change", () => {
    state.hideSold = elements.soldToggle.checked;
    updateSoldVisibility();
  });

  document
    .querySelector(".lightbox__close")
    .addEventListener("click", closeLightbox);
  document
    .querySelector(".lightbox__nav--prev")
    .addEventListener("click", () => moveLightbox(-1));
  document
    .querySelector(".lightbox__nav--next")
    .addEventListener("click", () => moveLightbox(1));
  elements.lightbox.addEventListener("click", (event) => {
    if (event.target === elements.lightbox) closeLightbox();
  });
  document.addEventListener("keydown", handleLightboxKeys);

  const [landing, contact] = await Promise.all([
    fetchText(CONTENT.landing, FALLBACK_LANDING),
    fetchText(CONTENT.contact, FALLBACK_CONTACT),
  ]);

  elements.landingText.textContent = landing || FALLBACK_LANDING;
  renderContact(elements.landingContact, contact || FALLBACK_CONTACT);
  state.contactText = contact || FALLBACK_CONTACT;

  await loadProducts();
}

async function fetchText(path, fallback = "") {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return (await response.text()).trim();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

async function loadProducts() {
  try {
    const response = await fetch(CONTENT.manifest, { cache: "no-store" });
    if (!response.ok) throw new Error("Manifest not found");
    const manifest = await response.json();
    state.products = await Promise.all(manifest.map(loadProduct));
    renderProducts();
  } catch (error) {
    console.warn(error);
    elements.statusMessage.textContent =
      "No se pudo cargar el catálogo. Ejecuta python build_manifest.py y vuelve a intentar.";
  }
}

async function loadProduct(item) {
  const rawText = await fetchText(`${CONTENT.productBase}${item.text}`, "");
  const fields = parseProductText(rawText);

  return {
    id: item.id,
    name: fields.name || prettifyId(item.id),
    notes: fields.notes,
    price: fields.price,
    dimensions: fields.dimensions,
    status: fields.status,
    images: (item.images || []).map((image) => `${CONTENT.productBase}${image}`),
  };
}

function parseProductText(rawText) {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 1 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  if (lines.length && lines.length !== 4 && lines.length < 5) {
    console.warn(
      `Product text has ${lines.length} lines; expected 5 lines: name, note, price, size, status.`,
      lines
    );
  }

  const name = (lines[0] || "").trim();
  const notes = (lines[1] || "").trim();
  const remaining = lines.slice(2);
  const status = (remaining.pop() || "").trim();
  const dimensions = (remaining.pop() || "").trim();
  const priceLines = remaining;
  const price = priceLines.join("\n").replace(/\\n/g, "\n").trim();

  return { name, notes, price, dimensions, status };
}

function renderProducts() {
  elements.grid.innerHTML = "";

  if (!state.products.length) {
    elements.statusMessage.textContent = "Todavía no hay artículos cargados.";
    return;
  }

  elements.statusMessage.textContent = `${state.products.length} artículos cargados.`;
  const fragment = document.createDocumentFragment();
  state.products.forEach((product) => fragment.appendChild(createProductCard(product)));
  elements.grid.appendChild(fragment);
  updateSoldVisibility();
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.sold = String(isSold(product.status));
  if (isSold(product.status)) card.classList.add("is-sold");

  const title = document.createElement("h3");
  title.textContent = product.name;

  const media = document.createElement("div");
  media.className = "media";
  setupMedia(media, product);

  const body = document.createElement("div");
  body.className = "product-card__body";

  if (product.notes) {
    const note = document.createElement("p");
    note.className = "product-note";
    note.textContent = product.notes;
    body.appendChild(note);
  }
  if (product.dimensions) body.appendChild(detail("Medidas", product.dimensions));

  const contact = state.contactText;
  if (contact) {
    const reminder = document.createElement("div");
    reminder.className = "contact-reminder";
    renderContact(reminder, contact);
    body.appendChild(reminder);
  }

  card.append(title, media, body);
  return card;
}

function setupMedia(media, product) {
  if (product.status) {
    const badge = document.createElement("span");
    badge.className = isSold(product.status) ? "badge is-sold" : "badge";
    badge.textContent = product.status;
    media.appendChild(badge);
  }

  if (product.price && !isSold(product.status)) {
    const price = document.createElement("p");
    price.className = "price-tag";
    price.textContent = product.price;
    media.appendChild(price);
  }

  if (!product.images.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.textContent = "Imagen no disponible";
    media.appendChild(placeholder);
    return;
  }

  let activeIndex = 0;
  let swipeStart = null;
  let didSwipe = false;
  const image = document.createElement("img");
  image.alt = product.name;
  image.src = product.images[activeIndex];
  image.addEventListener("click", (event) => {
    if (didSwipe) {
      event.preventDefault();
      didSwipe = false;
      return;
    }
    openLightbox(product.images, activeIndex, product.name);
  });
  media.appendChild(image);

  if (product.images.length === 1) return;

  const prev = carouselButton("‹", "Imagen anterior", "carousel-button--prev");
  const next = carouselButton("›", "Imagen siguiente", "carousel-button--next");
  const counter = document.createElement("span");
  counter.className = "image-counter";

  const showImage = (nextIndex) => {
    activeIndex = (nextIndex + product.images.length) % product.images.length;
    image.src = product.images[activeIndex];
    counter.textContent = `${activeIndex + 1} / ${product.images.length}`;
  };

  media.addEventListener("pointerdown", (event) => {
    swipeStart = { x: event.clientX, y: event.clientY };
    didSwipe = false;
  });
  media.addEventListener("pointerup", (event) => {
    if (!swipeStart) return;

    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;

    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    didSwipe = true;
    showImage(deltaX > 0 ? activeIndex - 1 : activeIndex + 1);
  });
  media.addEventListener("pointercancel", () => {
    swipeStart = null;
  });

  prev.addEventListener("click", () => showImage(activeIndex - 1));
  next.addEventListener("click", () => showImage(activeIndex + 1));
  showImage(0);
  media.append(prev, next, counter);
}

function carouselButton(text, label, modifier) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `carousel-button ${modifier}`;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  return button;
}

function detail(label, value) {
  const paragraph = document.createElement("p");
  paragraph.className = "detail";
  paragraph.innerHTML = `<strong>${label}:</strong> `;
  paragraph.append(document.createTextNode(value));
  return paragraph;
}

function renderContact(container, contactText) {
  state.contactText = contactText;
  container.innerHTML = "";

  const lines = contactText.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return;

  lines.forEach((line) => {
    const row = document.createElement("p");
    row.className = "contact-line";

    if (looksLikePhone(line)) {
      row.appendChild(whatsappIcon());
    }

    row.append(document.createTextNode(line.trim()));
    container.appendChild(row);
  });
}

function looksLikePhone(line) {
  return /^[+\d][\d\s().-]{5,}/.test(line.trim());
}

function whatsappIcon() {
  const span = document.createElement("span");
  span.className = "whatsapp-icon";
  span.setAttribute("aria-label", "WhatsApp");
  span.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3.1a8.8 8.8 0 0 0-7.5 13.4l-.9 3.4 3.5-.9A8.8 8.8 0 1 0 12 3.1Zm5.2 12.6c-.2.6-1.2 1.1-1.7 1.2-.5.1-1.1.2-3.4-.7-2.9-1.1-4.8-4.1-5-4.3-.1-.2-1.2-1.6-1.2-3 0-1.4.7-2.1 1-2.4.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .6.5.2.5.8 1.9.9 2.1.1.2.1.4 0 .6-.1.2-.2.3-.4.5l-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.8 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1.2-.2.8-.9 1-1.2.2-.3.4-.3.7-.2.3.1 1.8.9 2.1 1 .3.2.5.2.6.4.1.1.1.7-.1 1.3Z" />
    </svg>
  `;
  return span;
}

function updateSoldVisibility() {
  document.querySelectorAll(".product-card").forEach((card) => {
    card.classList.toggle(
      "is-hidden",
      state.hideSold && card.dataset.sold === "true"
    );
  });
}

function isSold(status) {
  return status.trim().toUpperCase() === "SOLD" || status.trim().toUpperCase() === "VENDIDO";
}

function prettifyId(id) {
  return id.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function openLightbox(images, index, alt) {
  state.lightboxImages = images;
  state.lightboxIndex = index;
  elements.lightboxImage.alt = alt;
  renderLightbox();

  if (typeof elements.lightbox.showModal === "function") {
    elements.lightbox.showModal();
  }
}

function closeLightbox() {
  if (elements.lightbox.open) elements.lightbox.close();
}

function moveLightbox(delta) {
  if (!elements.lightbox.open || state.lightboxImages.length < 2) return;
  state.lightboxIndex =
    (state.lightboxIndex + delta + state.lightboxImages.length) %
    state.lightboxImages.length;
  renderLightbox();
}

function renderLightbox() {
  elements.lightboxImage.src = state.lightboxImages[state.lightboxIndex];
  elements.lightboxCounter.textContent =
    state.lightboxImages.length > 1
      ? `${state.lightboxIndex + 1} / ${state.lightboxImages.length}`
      : "";
}

function handleLightboxKeys(event) {
  if (!elements.lightbox.open) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
}
