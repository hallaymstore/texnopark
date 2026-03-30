const state = {
  content: null,
  deviceId: getOrCreateDeviceId()
};

const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const meetingForm = document.getElementById("meetingForm");
const applicationForm = document.getElementById("applicationForm");
const statusForm = document.getElementById("statusForm");
const statusInput = document.getElementById("statusDeviceIdInput");
const deviceIdLabel = document.getElementById("deviceIdLabel");
const copyDeviceIdBtn = document.getElementById("copyDeviceIdBtn");
const meetingDateInput = document.getElementById("meetingDateInput");

document.addEventListener("DOMContentLoaded", async () => {
  deviceIdLabel.textContent = state.deviceId;
  statusInput.value = state.deviceId;
  meetingDateInput.min = new Date().toISOString().slice(0, 10);

  bindUi();
  await loadSiteContent();
  await lookupApplicationStatus(state.deviceId, false);
  initializeRevealObserver();
});

function bindUi() {
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });
  }

  document.querySelectorAll(".mobile-menu a").forEach((link) => {
    link.addEventListener("click", () => mobileMenu.classList.remove("open"));
  });

  copyDeviceIdBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(state.deviceId);
    showMessage("applicationMessage", "Device ID nusxa olindi.");
  });

  meetingForm.addEventListener("submit", handleMeetingSubmit);
  applicationForm.addEventListener("submit", handleApplicationSubmit);
  statusForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await lookupApplicationStatus(statusInput.value, true);
  });
}

async function loadSiteContent() {
  try {
    const response = await fetch("/api/site-content");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Sayt ma'lumotlari yuklanmadi.");
    }

    state.content = payload.data;
    renderContent(payload.data);
  } catch (error) {
    showMessage("meetingMessage", "Kontent yuklanmadi, serverni tekshiring.");
    showMessage("applicationMessage", "Kontent yuklanmadi, serverni tekshiring.");
  }
}

function renderContent(content) {
  document.title = content.general.organizationName;
  const metaDescription = document.querySelector('meta[name="description"]');

  if (metaDescription) {
    metaDescription.setAttribute("content", content.general.metaDescription);
  }

  setText("brandName", content.general.organizationName);
  setText("brandTagline", content.general.tagline);
  setText("footerName", content.general.organizationName);
  setText("footerText", content.general.tagline);

  setText("heroEyebrow", content.hero.eyebrow);
  setText("heroTitle", `${content.hero.title} ${content.hero.highlight}`);
  setText("heroDescription", content.hero.description);
  setText("heroCardTitle", content.hero.cardTitle);
  setText("heroCardDescription", content.hero.cardDescription);
  renderMedia("heroMedia", content.hero.image, content.general.organizationName, content.hero.mediaType);
  setLink("heroPrimaryAction", content.hero.primaryActionLink, content.hero.primaryActionLabel);
  setLink("heroSecondaryAction", content.hero.secondaryActionLink, content.hero.secondaryActionLabel);

  renderHeroSpotlights(content.heroSpotlights || []);
  renderSimpleList("trustGrid", content.trustItems || []);

  setText("aboutTag", content.about.tag);
  setText("aboutTitle", content.about.title);
  setText("aboutDescription", content.about.description);
  setText("aboutBadgeTitle", content.about.badgeTitle);
  setText("aboutBadgeText", content.about.badgeText);
  renderMedia("aboutMediaA", content.about.imageA, `${content.general.organizationName} foto 1`, content.about.imageAType);
  renderMedia("aboutMediaB", content.about.imageB, `${content.general.organizationName} foto 2`, content.about.imageBType);
  renderFeatureList(content.about.features || []);

  setText("directionsTag", content.directions.tag);
  setText("directionsTitle", content.directions.title);
  setText("directionsDescription", content.directions.description);
  renderDirections(content.directions.items || []);

  setText("projectsTag", content.projects.tag);
  setText("projectsTitle", content.projects.title);
  setText("projectsDescription", content.projects.description);
  renderProjects(content.projects.items || []);

  renderMetrics(content.metrics || []);

  setText("newsTag", content.news.tag);
  setText("newsTitle", content.news.title);
  setText("newsDescription", content.news.description);
  renderNews(content.news.items || []);

  setText("meetingTag", content.appointmentSection.tag);
  setText("meetingTitle", content.appointmentSection.title);
  setText("meetingDescription", content.appointmentSection.description);
  setText("meetingNote", content.appointmentSection.note);
  renderSelectOptions("meetingTypeSelect", content.appointmentSection.meetingTypes || []);

  setText("applicationTag", content.applicationSection.tag);
  setText("applicationTitle", content.applicationSection.title);
  setText("applicationDescription", content.applicationSection.description);
  setText("applicationHelper", content.applicationSection.helperText);
  renderSelectOptions("applicationProgramSelect", content.applicationSection.applicationOptions || []);

  setText("statusTag", content.statusSection.tag);
  setText("statusTitle", content.statusSection.title);
  setText("statusDescription", content.statusSection.description);
  setText("statusHelper", content.statusSection.helperText);

  setText("contactTitle", content.contact.title);
  setText("contactDescription", content.contact.description);
  setText("contactAddress", content.contact.address);
  setText("contactPhone", content.contact.phone);
  setText("contactEmail", content.contact.email);
  setText("contactWorkingHours", content.contact.workingHours);
  setLink("contactAddressLink", content.contact.mapLink);
  setLink("contactPhoneLink", `tel:${content.contact.phone}`);
  setLink("contactEmailLink", `mailto:${content.contact.email}`);
}

function renderHeroSpotlights(items) {
  const target = document.getElementById("heroSpotlights");
  target.innerHTML = items
    .map((item) => {
      const parsed = splitValue(item.value);
      return `
        <article class="spotlight-card reveal">
          <strong data-counter="${parsed.number}" data-suffix="${parsed.suffix}">0</strong>
          <span>${item.label}</span>
        </article>
      `;
    })
    .join("");

  initializeCounterObserver();
}

function renderSimpleList(targetId, items) {
  const target = document.getElementById(targetId);
  target.innerHTML = items.map((item) => `<div class="reveal">${item}</div>`).join("");
}

function renderFeatureList(items) {
  const target = document.getElementById("aboutFeatures");
  target.innerHTML = items
    .map((item) => `<div class="feature-item reveal">${item}</div>`)
    .join("");
}

function renderDirections(items) {
  const target = document.getElementById("directionsGrid");
  target.innerHTML = items
    .map(
      (item) => `
        <article class="info-card reveal">
          <div class="card-icon">${item.icon}</div>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

function renderProjects(items) {
  const target = document.getElementById("projectsGrid");
  target.innerHTML = items
    .map(
      (item) => `
        <article class="project-card reveal ${item.featured ? "featured" : ""}">
          ${renderProjectMedia(item)}
          <div class="project-card-body">
            <span class="project-category">${item.category}</span>
            <h3>${item.title}</h3>
            <p>${item.summary}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderMetrics(items) {
  const target = document.getElementById("metricsGrid");
  target.innerHTML = items
    .map((item) => {
      const parsed = splitValue(item.value);
      return `
        <article class="metric-card reveal">
          <strong data-counter="${parsed.number}" data-suffix="${parsed.suffix}">0</strong>
          <span>${item.label}</span>
        </article>
      `;
    })
    .join("");

  initializeCounterObserver();
}

function renderNews(items) {
  const target = document.getElementById("newsGrid");
  target.innerHTML = items
    .map(
      (item) => `
        <article class="news-card reveal">
          <span class="news-meta">${item.date}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <a href="${item.link || "#"}">Batafsil</a>
        </article>
      `
    )
    .join("");
}

function renderSelectOptions(targetId, options) {
  const target = document.getElementById(targetId);
  target.innerHTML = `
    <option value="">Tanlang</option>
    ${options.map((item) => `<option value="${item}">${item}</option>`).join("")}
  `;
}

async function handleMeetingSubmit(event) {
  event.preventDefault();
  showMessage("meetingMessage", "Yuborilmoqda...");

  const formData = new FormData(meetingForm);
  const payload = Object.fromEntries(formData.entries());
  payload.deviceId = state.deviceId;

  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Uchrashuv yuborilmadi.");
    }

    meetingForm.reset();
    meetingDateInput.min = new Date().toISOString().slice(0, 10);
    showMessage(
      "meetingMessage",
      `${result.message} Tracking code: ${result.data.trackingCode}`
    );
  } catch (error) {
    showMessage("meetingMessage", error.message);
  }
}

async function handleApplicationSubmit(event) {
  event.preventDefault();
  showMessage("applicationMessage", "Ariza yuborilmoqda...");

  const formData = new FormData(applicationForm);
  const payload = Object.fromEntries(formData.entries());
  payload.deviceId = state.deviceId;

  try {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Ariza yuborilmadi.");
    }

    applicationForm.reset();
    showMessage(
      "applicationMessage",
      `${result.message} Tracking code: ${result.data.trackingCode}`
    );
    await lookupApplicationStatus(state.deviceId, false);
  } catch (error) {
    showMessage("applicationMessage", error.message);
  }
}

async function lookupApplicationStatus(deviceId, fromManualSubmit) {
  const normalized = String(deviceId || "").trim();
  const target = document.getElementById("statusList");

  if (!normalized) {
    target.innerHTML = `<div class="status-empty"><p>Device ID kiriting.</p></div>`;
    return;
  }

  target.innerHTML = `<div class="status-empty"><p>Statuslar yuklanmoqda...</p></div>`;

  try {
    const response = await fetch(`/api/applications/status?deviceId=${encodeURIComponent(normalized)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Statuslar olinmadi.");
    }

    if (!result.data.length) {
      target.innerHTML = `
        <div class="status-empty">
          <p>${fromManualSubmit ? "Bu device ID bo'yicha ariza topilmadi." : "Bu qurilmadan hali ariza yuborilmagan."}</p>
        </div>
      `;
      return;
    }

    target.innerHTML = result.data
      .map(
        (item) => `
          <article class="status-item">
            <div class="status-item-top">
              <div>
                <strong>${item.trackingCode}</strong>
                <span>${item.selectedProgram}</span>
              </div>
              <span class="status-badge ${item.status}">${translateStatus(item.status)}</span>
            </div>
            <p>Yuborilgan sana: ${formatDate(item.createdAt)}</p>
            <p>${item.adminNote ? `Admin izohi: ${item.adminNote}` : "Admin izohi hozircha kiritilmagan."}</p>
          </article>
        `
      )
      .join("");
  } catch (error) {
    target.innerHTML = `<div class="status-empty"><p>${error.message}</p></div>`;
  }
}

function initializeRevealObserver() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  items.forEach((item) => observer.observe(item));
}

function initializeCounterObserver() {
  const counters = document.querySelectorAll("[data-counter]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.35
    }
  );

  counters.forEach((counter) => observer.observe(counter));
}

function animateCounter(element) {
  const targetValue = Number(element.dataset.counter || 0);
  const suffix = element.dataset.suffix || "";
  const duration = 1400;
  const start = performance.now();

  const step = (timestamp) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    const current = Math.floor(targetValue * progress);
    element.textContent = `${current.toLocaleString("en-US")}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

function splitValue(value) {
  const input = String(value || "").trim();
  const match = input.match(/\d+/);
  const numberPart = match ? Number(match[0]) : 0;
  const suffix = match ? input.slice(match[0].length) : "";
  return {
    number: numberPart,
    suffix
  };
}

function translateStatus(status) {
  const labels = {
    submitted: "Qabul qilindi",
    reviewing: "Ko'rib chiqilmoqda",
    approved: "Tasdiqlandi",
    rejected: "Rad etildi",
    waiting_list: "Kutish ro'yxati",
    new: "Yangi",
    contacted: "Aloqa qilindi",
    confirmed: "Tasdiqlandi",
    completed: "Yakunlandi",
    cancelled: "Bekor qilindi"
  };

  return labels[status] || status;
}

function formatDate(value) {
  if (!value) {
    return "Noma'lum";
  }

  return new Date(value).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value || "";
  }
}

function setImage(id, src, alt) {
  renderMedia(id, src, alt, "image");
}

function setLink(id, href, text) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  if (href) {
    element.href = href;
  }

  if (text) {
    element.textContent = text;
  }
}

function showMessage(targetId, message) {
  const element = document.getElementById(targetId);

  if (element) {
    element.textContent = message;
  }
}

function getOrCreateDeviceId() {
  const storageKey = "qyt_device_id";
  const existing = localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const nextId =
    window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `qyt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(storageKey, nextId);
  return nextId;
}

function renderMedia(targetId, src, alt, mediaType = "image") {
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  if (!src) {
    target.innerHTML = "";
    return;
  }

  const resolvedType = mediaType || inferMediaType(src);

  target.innerHTML =
    resolvedType === "video"
      ? `<video src="${src}" autoplay muted loop playsinline controls></video>`
      : `<img src="${src}" alt="${alt || ""}" />`;
}

function renderProjectMedia(item) {
  const mediaType = item.mediaType || inferMediaType(item.image);

  if (mediaType === "video") {
    return `<video class="project-card-video" src="${item.image}" controls muted playsinline preload="metadata"></video>`;
  }

  return `<img class="project-card-image" src="${item.image}" alt="${item.title}" />`;
}

function inferMediaType(url) {
  return /\.(mp4|webm|ogg|mov)$/i.test(String(url || "")) ? "video" : "image";
}
