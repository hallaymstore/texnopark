const state = {
  content: null,
  deviceId: getOrCreateDeviceId(),
  theme: document.documentElement.dataset.theme || "light"
};

const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const govMenu = document.getElementById("govMenu");
const govMenuToggle = document.getElementById("govMenuToggle");
const mobileOrgToggle = document.getElementById("mobileOrgToggle");
const mobileOrganizations = document.getElementById("mobileOrganizations");
const themeToggle = document.getElementById("themeToggle");
const themeToggleLabel = document.getElementById("themeToggleLabel");
const scrollProgress = document.getElementById("scrollProgress");
const quickSearchForm = document.getElementById("quickSearchForm");
const quickSearchInput = document.getElementById("quickSearchInput");
const quickSearchSuggestions = document.getElementById("quickSearchSuggestions");
const searchFeedback = document.getElementById("searchFeedback");
const meetingForm = document.getElementById("meetingForm");
const applicationForm = document.getElementById("applicationForm");
const statusForm = document.getElementById("statusForm");
const statusInput = document.getElementById("statusDeviceIdInput");
const deviceIdLabel = document.getElementById("deviceIdLabel");
const copyDeviceIdBtn = document.getElementById("copyDeviceIdBtn");
const meetingDateInput = document.getElementById("meetingDateInput");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const sidebarLinks = Array.from(document.querySelectorAll("[data-nav-link]"));
const systemThemeQuery =
  window.matchMedia && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
const defaultFavicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232f80ff'/%3E%3Ctext x='50%25' y='56%25' font-size='28' text-anchor='middle' fill='white' font-family='Arial'%3EQY%3C/text%3E%3C/svg%3E";

document.addEventListener("DOMContentLoaded", async () => {
  initializeTheme();
  deviceIdLabel.textContent = state.deviceId;
  statusInput.value = state.deviceId;
  meetingDateInput.min = new Date().toISOString().slice(0, 10);

  bindUi();
  bindWindowEffects();
  await loadSiteContent();
  await lookupApplicationStatus(state.deviceId, false);
  initializeRevealObserver();
});

function bindUi() {
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  if (quickSearchForm) {
    quickSearchForm.addEventListener("submit", handleQuickSearch);
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });
  }

  if (govMenuToggle) {
    govMenuToggle.addEventListener("click", () => {
      govMenu.classList.toggle("open");
    });

    document.addEventListener("click", (event) => {
      if (!govMenu.contains(event.target)) {
        govMenu.classList.remove("open");
      }
    });
  }

  if (mobileOrgToggle) {
    mobileOrgToggle.addEventListener("click", () => {
      mobileOrganizations.classList.toggle("open");
    });
  }

  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      mobileMenu.classList.remove("open");
      mobileOrganizations.classList.remove("open");
    }
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

function bindWindowEffects() {
  updateScrollProgress();
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  initializeSectionObserver();
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
  document.title = content.general.seoTitle || content.general.organizationName;
  const metaDescription = document.querySelector('meta[name="description"]');
  const metaKeywords = document.querySelector('meta[name="keywords"]');

  if (metaDescription) {
    metaDescription.setAttribute("content", content.general.metaDescription);
  }

  if (metaKeywords) {
    metaKeywords.setAttribute("content", content.general.seoKeywords || "");
  }

  updateSeoMeta(content);
  renderBrandAssets(content.general);
  renderAboutPreview(content);
  renderFaq(content);
  hydrateSearch(content);

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
  setLink("footerPhoneLink", `tel:${content.contact.phone}`, content.contact.phone);
  setLink("footerEmailLink", `mailto:${content.contact.email}`, content.contact.email);
  setLink("footerMapLink", content.contact.mapLink, "Manzilni ochish");
  setLink("footerTelegramLink", content.contact.telegram, "Telegram");
  setLink("footerInstagramLink", content.contact.instagram, "Instagram");

  setText("footerOfficialLabel", content.footer?.officialLabel || "Rasmiy axborot platformasi");
  setText("footerOfficialNote", content.footer?.officialNote || "");
  setText("footerLegalText", content.footer?.legalText || "");

  renderGovernmentOrganizations(content.governmentOrganizations || []);
}

function renderAboutPreview(content) {
  setText("aboutPreviewTitle", content.about.title);
  setText("aboutPreviewDescription", content.about.description);
  renderMedia(
    "aboutPreviewMedia",
    content.about.imageA || content.hero.image,
    `${content.general.organizationName} preview`,
    content.about.imageAType || content.hero.mediaType
  );
}

function renderFaq(content) {
  const target = document.getElementById("faqList");

  if (!target) {
    return;
  }

  const items = [
    {
      question: "Ariza topshirish qanday ishlaydi?",
      answer: content.applicationSection.helperText || content.applicationSection.description
    },
    {
      question: "Uchrashuv qanday belgilanadi?",
      answer: content.appointmentSection.note || content.appointmentSection.description
    },
    {
      question: "Natijani qanday ko'raman?",
      answer: content.statusSection.helperText || content.statusSection.description
    }
  ];

  target.innerHTML = items
    .map(
      (item, index) => `
        <article class="faq-item ${index === 0 ? "open" : ""}">
          <button class="faq-question" type="button">
            <span>${escapeHtml(item.question)}</span>
            <span>${index === 0 ? "-" : "+"}</span>
          </button>
          <div class="faq-answer">
            <p>${escapeHtml(item.answer)}</p>
          </div>
        </article>
      `
    )
    .join("");

  target.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      const current = button.closest(".faq-item");

      target.querySelectorAll(".faq-item").forEach((item) => {
        const icon = item.querySelector(".faq-question span:last-child");
        const isCurrent = item === current;
        item.classList.toggle("open", isCurrent ? !item.classList.contains("open") : false);

        if (icon) {
          icon.textContent = item.classList.contains("open") ? "-" : "+";
        }
      });
    });
  });
}

function hydrateSearch(content) {
  const targets = [
    {
      label: "Asosiy",
      id: "home",
      text: [content.hero.title, content.hero.highlight, content.hero.description].join(" ")
    },
    {
      label: "Markaz haqida",
      id: "about",
      text: [content.about.title, content.about.description, ...(content.about.features || [])].join(" ")
    },
    {
      label: "Yo'nalishlar",
      id: "directions",
      text: [
        content.directions.title,
        content.directions.description,
        ...(content.directions.items || []).flatMap((item) => [item.title, item.description])
      ].join(" ")
    },
    {
      label: "Loyihalar",
      id: "projects",
      text: [
        content.projects.title,
        content.projects.description,
        ...(content.projects.items || []).flatMap((item) => [item.title, item.summary, item.category])
      ].join(" ")
    },
    {
      label: "Yangiliklar",
      id: "news",
      text: [
        content.news.title,
        content.news.description,
        ...(content.news.items || []).flatMap((item) => [item.title, item.description, item.date])
      ].join(" ")
    },
    {
      label: "Uchrashuv",
      id: "meeting",
      text: [content.appointmentSection.title, content.appointmentSection.description, content.appointmentSection.note].join(" ")
    },
    {
      label: "Ariza",
      id: "application",
      text: [content.applicationSection.title, content.applicationSection.description, content.applicationSection.helperText].join(" ")
    },
    {
      label: "Natijalar",
      id: "status",
      text: [content.statusSection.title, content.statusSection.description, content.statusSection.helperText].join(" ")
    },
    {
      label: "Bog'lanish",
      id: "contact",
      text: [content.contact.title, content.contact.description, content.contact.address].join(" ")
    }
  ];

  state.searchTargets = targets;

  if (quickSearchSuggestions) {
    quickSearchSuggestions.innerHTML = targets
      .map((item) => `<option value="${escapeHtml(item.label)}"></option>`)
      .join("");
  }
}

function renderHeroSpotlights(items) {
  const target = document.getElementById("heroSpotlights");
  target.innerHTML = items
    .map((item) => {
      const parsed = splitValue(item.value);
      return `
        <article class="spotlight-card reveal">
          <strong data-counter="${parsed.number}" data-suffix="${parsed.suffix}">0</strong>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `;
    })
    .join("");

  initializeCounterObserver();
}

function renderSimpleList(targetId, items) {
  const target = document.getElementById(targetId);
  target.innerHTML = items.map((item) => `<div class="reveal">${escapeHtml(item)}</div>`).join("");
}

function renderFeatureList(items) {
  const target = document.getElementById("aboutFeatures");
  target.innerHTML = items
    .map((item) => `<div class="feature-item reveal">${escapeHtml(item)}</div>`)
    .join("");
}

function renderDirections(items) {
  const target = document.getElementById("directionsGrid");
  target.innerHTML = items
    .map(
      (item) => `
        <article class="info-card reveal">
          <div class="card-icon">${escapeHtml(item.icon)}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
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
            <span class="project-category">${escapeHtml(item.category)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.summary)}</p>
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
          <span>${escapeHtml(item.label)}</span>
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
          <span class="news-meta">${escapeHtml(item.date)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <a href="${sanitizeHref(item.link, { allowHash: true, allowRelative: true })}">Batafsil</a>
        </article>
      `
    )
    .join("");
}

function renderSelectOptions(targetId, options) {
  const target = document.getElementById(targetId);
  target.innerHTML = `
    <option value="">Tanlang</option>
    ${options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
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
                <strong>${escapeHtml(item.trackingCode)}</strong>
                <span>${escapeHtml(item.selectedProgram)}</span>
              </div>
              <span class="status-badge ${item.status}">${translateStatus(item.status)}</span>
            </div>
            <p>Yuborilgan sana: ${formatDate(item.createdAt)}</p>
            <p>${item.adminNote ? `Admin izohi: ${escapeHtml(item.adminNote)}` : "Admin izohi hozircha kiritilmagan."}</p>
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

function initializeSectionObserver() {
  if (!sidebarLinks.length) {
    return;
  }

  const sections = sidebarLinks
    .map((link) => {
      const href = link.getAttribute("href") || "";
      return href.startsWith("#") ? document.querySelector(href) : null;
    })
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

      if (!visible || !visible.target.id) {
        return;
      }

      setActiveNav(`#${visible.target.id}`);
    },
    {
      threshold: 0.35,
      rootMargin: "-15% 0px -45% 0px"
    }
  );

  sections.forEach((section) => observer.observe(section));
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

function setActiveNav(hash) {
  sidebarLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === hash);
  });
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
    element.href = sanitizeHref(href, { allowHash: true, allowRelative: true });
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

  const safeSrc = sanitizeMediaUrl(src);

  if (!safeSrc) {
    target.innerHTML = "";
    return;
  }

  const resolvedType = mediaType || inferMediaType(safeSrc);

  target.innerHTML =
    resolvedType === "video"
      ? `<video src="${safeSrc}" autoplay muted loop playsinline controls></video>`
      : `<img src="${safeSrc}" alt="${escapeHtml(alt || "")}" />`;
}

function renderProjectMedia(item) {
  const safeSrc = sanitizeMediaUrl(item.image);
  const mediaType = item.mediaType || inferMediaType(safeSrc);

  if (!safeSrc) {
    return `<div class="project-card-image project-placeholder">${escapeHtml(item.title || "Media")}</div>`;
  }

  if (mediaType === "video") {
    return `<video class="project-card-video" src="${safeSrc}" controls muted playsinline preload="metadata"></video>`;
  }

  return `<img class="project-card-image" src="${safeSrc}" alt="${escapeHtml(item.title)}" />`;
}

function inferMediaType(url) {
  return /\.(mp4|webm|ogg|mov)$/i.test(String(url || "")) ? "video" : "image";
}

function renderBrandAssets(general) {
  const logoUrl = sanitizeMediaUrl(general.logo);
  const initials = buildInitials(general.organizationShortName || general.organizationName);

  renderLogoBlock("brandMark", "brandLogo", "brandInitials", logoUrl, initials);
  renderLogoBlock("footerBrandMark", "footerLogo", "footerInitials", logoUrl, initials);
  updateFavicon(logoUrl);
}

function renderLogoBlock(wrapperId, imageId, initialsId, logoUrl, initials) {
  const wrapper = document.getElementById(wrapperId);
  const image = document.getElementById(imageId);
  const initialsNode = document.getElementById(initialsId);

  if (!wrapper || !image || !initialsNode) {
    return;
  }

  initialsNode.textContent = initials;

  if (logoUrl) {
    image.src = logoUrl;
    image.hidden = false;
    wrapper.classList.add("has-logo");
    return;
  }

  image.hidden = true;
  image.removeAttribute("src");
  wrapper.classList.remove("has-logo");
}

function updateFavicon(logoUrl) {
  const favicon = document.getElementById("siteFavicon");
  const shortcutIcon = document.getElementById("siteShortcutIcon");
  const appleTouch = document.getElementById("siteAppleTouch");
  const nextUrl = sanitizeMediaUrl(logoUrl, { allowData: true }) || defaultFavicon;

  if (favicon) {
    favicon.href = nextUrl;
  }

  if (shortcutIcon) {
    shortcutIcon.href = nextUrl;
  }

  if (appleTouch) {
    appleTouch.href = nextUrl;
  }
}

function updateSeoMeta(content) {
  const image = sanitizeMediaUrl(content.general.logo || content.hero.image) || "";
  updateMetaBySelector('meta[property="og:title"]', content.general.seoTitle || content.general.organizationName);
  updateMetaBySelector('meta[property="og:site_name"]', content.general.organizationName);
  updateMetaBySelector('meta[property="og:description"]', content.general.metaDescription);
  updateMetaBySelector('meta[property="og:url"]', window.location.origin);
  updateMetaBySelector('meta[property="og:image"]', image);
  updateMetaBySelector('meta[name="twitter:title"]', content.general.seoTitle || content.general.organizationName);
  updateMetaBySelector('meta[name="twitter:description"]', content.general.metaDescription);
  updateMetaBySelector('meta[name="twitter:image"]', image);
  const canonicalUrl = document.getElementById("canonicalUrl");

  if (canonicalUrl) {
    canonicalUrl.href = window.location.origin;
  }

  const schemaNode = document.getElementById("organizationSchema");

  if (schemaNode) {
    schemaNode.textContent = JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "GovernmentOrganization",
        name: content.general.organizationName,
        description: content.general.metaDescription,
        logo: content.general.logo || undefined,
        url: window.location.origin,
        sameAs: (content.governmentOrganizations || []).map((item) => item.url).filter(Boolean),
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: content.contact.phone,
            email: content.contact.email,
            contactType: "customer support"
          }
        ]
      },
      null,
      2
    );
  }
}

function initializeTheme() {
  applyTheme(resolveInitialTheme(), false);

  if (systemThemeQuery) {
    if (typeof systemThemeQuery.addEventListener === "function") {
      systemThemeQuery.addEventListener("change", handleSystemThemeChange);
    } else if (typeof systemThemeQuery.addListener === "function") {
      systemThemeQuery.addListener(handleSystemThemeChange);
    }
  }
}

function resolveInitialTheme() {
  const savedTheme = readStoredTheme();

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function handleSystemThemeChange(event) {
  const savedTheme = readStoredTheme();

  if (savedTheme === "dark" || savedTheme === "light") {
    return;
  }

  applyTheme(event.matches ? "dark" : "light", false);
}

function toggleTheme() {
  applyTheme(state.theme === "dark" ? "light" : "dark", true);
}

function applyTheme(theme, persist) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  state.theme = nextTheme;
  document.documentElement.dataset.theme = nextTheme;
  updateThemeToggle(nextTheme);
  updateThemeMeta(nextTheme);

  if (persist) {
    writeStoredTheme(nextTheme);
  }
}

function updateThemeToggle(theme) {
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  if (themeToggleLabel) {
    themeToggleLabel.textContent = theme === "dark" ? "Kunduzgi rejim" : "Tungi rejim";
  }
}

function updateThemeMeta(theme) {
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", theme === "dark" ? "#07111f" : "#f4f8ff");
  }
}

function updateScrollProgress() {
  if (!scrollProgress) {
    return;
  }

  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  scrollProgress.style.transform = `scaleX(${progress})`;
}

function handleQuickSearch(event) {
  event.preventDefault();
  const query = String(quickSearchInput ? quickSearchInput.value : "").trim().toLowerCase();

  if (!query) {
    showMessage("searchFeedback", "Qidirish uchun kalit so'z kiriting.");
    return;
  }

  const targets = Array.isArray(state.searchTargets) ? state.searchTargets : [];
  const match = targets.find((item) => {
    const label = String(item.label || "").toLowerCase();
    const text = String(item.text || "").toLowerCase();
    return label.includes(query) || text.includes(query);
  });

  if (!match) {
    showMessage("searchFeedback", "Mos bo'lim topilmadi.");
    return;
  }

  const target = document.getElementById(match.id);

  if (!target) {
    showMessage("searchFeedback", "Topilgan bo'lim ochilmadi.");
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  setActiveNav(`#${match.id}`);
  showMessage("searchFeedback", `${match.label} bo'limiga o'tildi.`);
}

function readStoredTheme() {
  try {
    return localStorage.getItem("qyt_theme");
  } catch (error) {
    return null;
  }
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem("qyt_theme", theme);
  } catch (error) {
    // Ignore storage write issues and continue with in-memory theme.
  }
}

function updateMetaBySelector(selector, value) {
  const node = document.querySelector(selector);

  if (node) {
    node.setAttribute("content", value || "");
  }
}

function renderGovernmentOrganizations(items) {
  const desktop = document.getElementById("governmentDropdown");
  const mobile = document.getElementById("mobileOrganizations");
  const footer = document.getElementById("footerOrganizations");
  const hasItems = items.length > 0;

  const html = items
    .map(
      (item) => `
        <a class="gov-link" href="${sanitizeHref(item.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.description || "")}</span>
        </a>
      `
    )
    .join("");

  const footerHtml = items
    .map(
      (item) => `
        <a class="footer-org-card" href="${sanitizeHref(item.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.description || "")}</span>
        </a>
      `
    )
    .join("");

  if (govMenu) {
    govMenu.hidden = !hasItems;
  }

  if (mobileOrgToggle) {
    mobileOrgToggle.closest(".mobile-orgs").hidden = !hasItems;
  }

  if (desktop) {
    desktop.innerHTML = html;
  }

  if (mobile) {
    mobile.innerHTML = html;
  }

  if (footer) {
    footer.innerHTML = footerHtml;
  }
}

function buildInitials(text) {
  return String(text || "QY")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHref(value, options = {}) {
  const {
    allowHash = false,
    allowRelative = false
  } = options;

  const input = String(value || "").trim();

  if (!input) {
    return "#";
  }

  if (allowHash && input.startsWith("#")) {
    return input;
  }

  if (allowRelative && input.startsWith("/")) {
    return input;
  }

  if (/^(mailto:|tel:)/i.test(input)) {
    return input;
  }

  try {
    const parsed = new URL(input, window.location.origin);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "#";
  } catch (error) {
    return "#";
  }
}

function sanitizeMediaUrl(value, options = {}) {
  const { allowData = false } = options;
  const input = String(value || "").trim();

  if (!input) {
    return "";
  }

  if (allowData && /^data:image\//i.test(input)) {
    return input;
  }

  try {
    const parsed = new URL(input, window.location.origin);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (error) {
    return "";
  }
}
