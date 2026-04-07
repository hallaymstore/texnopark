const state = {
  content: null,
  deviceId: getOrCreateDeviceId(),
  theme: document.documentElement.dataset.theme || "light",
  directionFilter: "all",
  faqQuery: "",
  previewMode: false,
  chatMessages: [],
  chatOpen: false,
  chatPending: false
};

const pageLoader = document.getElementById("pageLoader");
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");
const menuBackdrop = document.getElementById("menuBackdrop");
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
const faqSearchInput = document.getElementById("faqSearchInput");
const insightTicker = document.getElementById("insightTicker");
const programCloud = document.getElementById("programCloud");
const heroFloatStack = document.getElementById("heroFloatStack");
const programFilters = document.getElementById("programFilters");
const chatLauncher = document.getElementById("chatLauncher");
const chatWidget = document.getElementById("chatWidget");
const chatBackdrop = document.getElementById("chatBackdrop");
const chatCloseBtn = document.getElementById("chatCloseBtn");
const chatSuggestions = document.getElementById("chatSuggestions");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
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
const CHAT_STORAGE_KEY = "qyt_chat_messages";
const SECTION_ROUTE_MAP = Object.freeze({
  home: "/#home",
  about: "/about.html#about",
  timeline: "/about.html#timeline",
  directions: "/programs.html#directions",
  projects: "/programs.html#projects",
  news: "/faq.html#news",
  testimonials: "/about.html#testimonials",
  meeting: "/contact.html#meeting",
  application: "/contact.html#application",
  status: "/contact.html#status",
  partners: "/programs.html#partners",
  contact: "/contact.html#contact",
  faq: "/faq.html#faq"
});

window.addEventListener("message", handlePreviewMessage);

document.addEventListener("DOMContentLoaded", async () => {
  initializeTheme();
  initializeActiveRouteLinks();
  initializeChatWidget();

  if (deviceIdLabel) {
    deviceIdLabel.textContent = state.deviceId;
  }

  if (statusInput) {
    statusInput.value = state.deviceId;
  }

  if (meetingDateInput) {
    meetingDateInput.min = new Date().toISOString().slice(0, 10);
  }

  bindUi();
  bindWindowEffects();
  await loadSiteContent();
  await lookupApplicationStatus(state.deviceId, false);
  initializeRevealObserver();
  window.addEventListener("load", hidePageLoader, { once: true });
});

function bindUi() {
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  if (quickSearchForm) {
    quickSearchForm.addEventListener("submit", handleQuickSearch);
  }

  if (faqSearchInput) {
    faqSearchInput.addEventListener("input", () => {
      state.faqQuery = faqSearchInput.value.trim().toLowerCase();

      if (state.content) {
        renderFaq(state.content);
      }
    });
  }

  if (programFilters) {
    programFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-program-filter]");

      if (!button) {
        return;
      }

      state.directionFilter = button.dataset.programFilter || "all";

      if (state.content) {
        renderProgramFilters(state.content.directions.items || []);
        renderDirections(state.content.directions.items || []);
      }
    });
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mobileMenu?.classList.toggle("open");
      document.body.classList.toggle("menu-open", Boolean(isOpen));
      if (menuBackdrop) menuBackdrop.classList.toggle("active", Boolean(isOpen));
      // Lock scroll while menu is open for a cleaner mobile experience
      document.documentElement.style.overflow = isOpen ? "hidden" : "";
    });

    if (menuBackdrop) {
      menuBackdrop.addEventListener("click", () => {
        mobileMenu?.classList.remove("open");
        document.body.classList.remove("menu-open");
        menuBackdrop.classList.remove("active");
        document.documentElement.style.overflow = "";
      });
    }
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
      mobileOrganizations?.classList.toggle("open");
    });
  }

  if (chatLauncher) {
    chatLauncher.addEventListener("click", () => {
      setChatOpen(!state.chatOpen);
    });
  }

  if (chatCloseBtn) {
    chatCloseBtn.addEventListener("click", () => {
      setChatOpen(false);
    });
  }

  if (chatBackdrop) {
    chatBackdrop.addEventListener("click", () => {
      setChatOpen(false);
    });
  }

  if (chatSuggestions) {
    chatSuggestions.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-chat-prompt]");

      if (!trigger || state.chatPending) {
        return;
      }

      sendChatMessage(trigger.dataset.chatPrompt || "");
    });
  }

  if (chatForm) {
    chatForm.addEventListener("submit", handleChatSubmit);
  }

  if (chatInput) {
    resizeChatInput();

    chatInput.addEventListener("input", () => {
      resizeChatInput();
    });

    chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm?.requestSubmit();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.chatOpen) {
      setChatOpen(false);
    }
  });

  if (mobileMenu) {
    mobileMenu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        mobileMenu.classList.remove("open");
        mobileOrganizations?.classList.remove("open");
      }
    });
  }

  if (copyDeviceIdBtn) {
    copyDeviceIdBtn.addEventListener("click", async () => {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(state.deviceId);
        showMessage("applicationMessage", "Device ID nusxa olindi.");
        return;
      }

      showMessage("applicationMessage", "Brauzer nusxa olishni qo'llamadi.");
    });
  }

  if (meetingForm) {
    meetingForm.addEventListener("submit", handleMeetingSubmit);
  }

  if (applicationForm) {
    applicationForm.addEventListener("submit", handleApplicationSubmit);
  }

  if (statusForm) {
    statusForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await lookupApplicationStatus(statusInput ? statusInput.value : "", true);
    });
  }
}

function initializeImageMotion() {
  // Apply gentle floating animation to media elements
  document
    .querySelectorAll('.hero-card-media img, .project-card-image, .testimonial-avatar img, .partner-logo img')
    .forEach((el, i) => {
      try {
        if (el.dataset.motionBound === 'true') return;
        el.dataset.motionBound = 'true';
        const delay = Math.floor(Math.random() * 8000);
        el.style.animation = `floatRotate 10s ease-in-out ${delay}ms infinite both`;
        el.style.willChange = 'transform';
      } catch (e) {
        // ignore
      }
    });

  // Small parallax on the hero image
  const hero = document.querySelector('.hero-card');
  const heroImg = hero ? hero.querySelector('img') : null;

  if (hero && heroImg && !hero.dataset.parallaxBound) {
    hero.dataset.parallaxBound = 'true';
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroImg.style.transform = `translate3d(${x * 18}px, ${y * 18}px, 0) rotate(${x * 2}deg) scale(1.02)`;
    });

    hero.addEventListener('mouseleave', () => {
      heroImg.style.transform = '';
    });
  }
}

function bindWindowEffects() {
  updateScrollProgress();
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  bindInteractiveGlow();
  bindMagneticButtons();
  initializeSectionObserver();
  // initialize visual motion on media elements
  initializeImageMotion();
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
    hidePageLoader();
  }
}

function renderContent(content) {
  const pageTitle = String(document.body?.dataset?.pageTitle || "").trim();
  document.title = pageTitle
    ? `${pageTitle} | ${content.general.organizationName}`
    : content.general.seoTitle || content.general.organizationName;
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
  renderInsightTicker(content);
  renderProgramCloud(content);
  renderHeroFloatStack(content);

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

  setText("timelineTag", content.timelineSection?.tag || "Qabul bosqichlari");
  setText("timelineTitle", content.timelineSection?.title || "");
  setText("timelineDescription", content.timelineSection?.description || "");
  renderTimeline(content.timelineSection || {});

  setText("directionsTag", content.directions.tag);
  setText("directionsTitle", content.directions.title);
  setText("directionsDescription", content.directions.description);
  renderProgramFilters(content.directions.items || []);
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

  setText("testimonialsTag", content.testimonialsSection?.tag || "Muvaffaqiyat hikoyalari");
  setText("testimonialsTitle", content.testimonialsSection?.title || "");
  setText("testimonialsDescription", content.testimonialsSection?.description || "");
  renderTestimonials(content.testimonialsSection || {});

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
  setText("liveStatusTitle", content.liveStatus?.title || "Platforma holati");
  renderLiveStatus(content.liveStatus || {});

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
  setText("partnersTag", content.partnersSection?.tag || "Rasmiy hamkorlar");
  setText("partnersTitle", content.partnersSection?.title || "");
  setText("partnersDescription", content.partnersSection?.description || "");
  renderPartners(content.partnersSection || {});

  renderGovernmentOrganizations(content.governmentOrganizations || []);
  hydrateChatContext(content);

  if (faqSearchInput && document.activeElement !== faqSearchInput) {
    faqSearchInput.value = state.faqQuery;
  }

  bindInteractiveGlow();
  initializeRevealObserver();
  // ensure media motion is set up after DOM updates
  initializeImageMotion();
  hidePageLoader();
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

  const fallbackItems = [
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
  const sourceItems = content.faqSection?.items?.length ? content.faqSection.items : fallbackItems;
  const normalizedQuery = state.faqQuery;
  const filteredItems = normalizedQuery
    ? sourceItems.filter((item) =>
        [item.question, item.answer].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(normalizedQuery)
        )
      )
    : sourceItems;

  if (faqSearchInput) {
    faqSearchInput.setAttribute("aria-label", content.faqSection?.title || "FAQ qidiruvi");
  }

  if (!filteredItems.length) {
    target.innerHTML = `
      <div class="faq-empty">
        <strong>Natija topilmadi</strong>
        <p>Boshqa kalit so'z bilan qayta qidirib ko'ring.</p>
      </div>
    `;
    return;
  }

  target.innerHTML = filteredItems
    .map(
      (item, index) => `
        <article class="faq-item ${index === 0 || Boolean(normalizedQuery) ? "open" : ""}">
          <button class="faq-question" type="button" aria-expanded="${index === 0 || Boolean(normalizedQuery) ? "true" : "false"}">
            <span>${escapeHtml(item.question)}</span>
            <span>${index === 0 || Boolean(normalizedQuery) ? "-" : "+"}</span>
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
        const toggle = item.querySelector(".faq-question");
        const isCurrent = item === current;
        item.classList.toggle("open", isCurrent ? !item.classList.contains("open") : false);

        if (icon) {
          icon.textContent = item.classList.contains("open") ? "-" : "+";
        }

        if (toggle) {
          toggle.setAttribute("aria-expanded", item.classList.contains("open") ? "true" : "false");
        }
      });
    });
  });
}

function renderInsightTicker(content) {
  if (!insightTicker) {
    return;
  }

  const items = [
    {
      label: "Rasmiy platforma",
      value: "Device ID va ariza tracking"
    },
    {
      label: "Yo'nalishlar",
      value: `${(content.directions.items || []).length} ta faol dastur`
    },
    {
      label: "Uchrashuv",
      value: `${(content.appointmentSection.meetingTypes || []).length} ta format`
    },
    {
      label: "Media tizimi",
      value: "Cloudinary bilan ishlaydi"
    },
    {
      label: "Aloqa liniyasi",
      value: content.contact.phone || "Doim ochiq"
    }
  ];
  const liveItems = (content.liveStatus?.items || []).map((item) => ({
    label: item.label,
    value: item.value
  }));

  const repeated = [...items, ...liveItems, ...items, ...liveItems];

  insightTicker.innerHTML = `
    <div class="insight-marquee">
      ${repeated
        .map(
          (item) => `
            <div class="insight-item">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(item.value)}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProgramCloud(content) {
  if (!programCloud) {
    return;
  }

  const items = (content.directions.items || []).slice(0, 6);

  programCloud.innerHTML = items
    .map((item) => `<span class="program-chip">${escapeHtml(item.title)}</span>`)
    .join("");
}

function renderHeroFloatStack(content) {
  if (!heroFloatStack) {
    return;
  }

  const primaryMetric = content.metrics && content.metrics[0] ? content.metrics[0] : null;
  const secondaryMetric = content.metrics && content.metrics[1] ? content.metrics[1] : null;
  const cards = [
    {
      label: "Main metric",
      value: primaryMetric ? `${primaryMetric.value} ${primaryMetric.label}` : "24/7 raqamli oqim"
    },
    {
      label: "Momentum",
      value: secondaryMetric ? `${secondaryMetric.value} ${secondaryMetric.label}` : "Yoshlar va dasturlar"
    },
    {
      label: "Mode",
      value: state.theme === "dark" ? "Tungi premium UI" : "Kunduzgi premium UI"
    }
  ];

  heroFloatStack.innerHTML = cards
    .map(
      (item) => `
        <div class="float-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");
}

function hydrateSearch(content) {
  const targets = [
    {
      label: "Asosiy",
      id: "home",
      href: resolveSectionHref("home"),
      text: [content.hero.title, content.hero.highlight, content.hero.description].join(" ")
    },
    {
      label: "Markaz haqida",
      id: "about",
      href: resolveSectionHref("about"),
      text: [content.about.title, content.about.description, ...(content.about.features || [])].join(" ")
    },
    {
      label: "Qabul bosqichlari",
      id: "timeline",
      href: resolveSectionHref("timeline"),
      text: [
        content.timelineSection?.title,
        content.timelineSection?.description,
        ...(content.timelineSection?.items || []).flatMap((item) => [item.step, item.title, item.description])
      ].join(" ")
    },
    {
      label: "Yo'nalishlar",
      id: "directions",
      href: resolveSectionHref("directions"),
      text: [
        content.directions.title,
        content.directions.description,
        ...(content.directions.items || []).flatMap((item) => [item.title, item.description])
      ].join(" ")
    },
    {
      label: "Loyihalar",
      id: "projects",
      href: resolveSectionHref("projects"),
      text: [
        content.projects.title,
        content.projects.description,
        ...(content.projects.items || []).flatMap((item) => [item.title, item.summary, item.category])
      ].join(" ")
    },
    {
      label: "Yangiliklar",
      id: "news",
      href: resolveSectionHref("news"),
      text: [
        content.news.title,
        content.news.description,
        ...(content.news.items || []).flatMap((item) => [item.title, item.description, item.date])
      ].join(" ")
    },
    {
      label: "Muvaffaqiyat hikoyalari",
      id: "testimonials",
      href: resolveSectionHref("testimonials"),
      text: [
        content.testimonialsSection?.title,
        content.testimonialsSection?.description,
        ...(content.testimonialsSection?.items || []).flatMap((item) => [item.name, item.role, item.quote, item.result])
      ].join(" ")
    },
    {
      label: "Uchrashuv",
      id: "meeting",
      href: resolveSectionHref("meeting"),
      text: [content.appointmentSection.title, content.appointmentSection.description, content.appointmentSection.note].join(" ")
    },
    {
      label: "Ariza",
      id: "application",
      href: resolveSectionHref("application"),
      text: [content.applicationSection.title, content.applicationSection.description, content.applicationSection.helperText].join(" ")
    },
    {
      label: "Natijalar",
      id: "status",
      href: resolveSectionHref("status"),
      text: [content.statusSection.title, content.statusSection.description, content.statusSection.helperText].join(" ")
    },
    {
      label: "Hamkorlar",
      id: "partners",
      href: resolveSectionHref("partners"),
      text: [
        content.partnersSection?.title,
        content.partnersSection?.description,
        ...(content.partnersSection?.items || []).flatMap((item) => [item.name, item.description])
      ].join(" ")
    },
    {
      label: "Bog'lanish",
      id: "contact",
      href: resolveSectionHref("contact"),
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

  if (!target) {
    return;
  }

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

  if (!target) {
    return;
  }

  target.innerHTML = items.map((item) => `<div class="reveal">${escapeHtml(item)}</div>`).join("");
}

function renderFeatureList(items) {
  const target = document.getElementById("aboutFeatures");

  if (!target) {
    return;
  }

  target.innerHTML = items
    .map((item) => `<div class="feature-item reveal">${escapeHtml(item)}</div>`)
    .join("");
}

function renderProgramFilters(items) {
  if (!programFilters) {
    return;
  }

  const categories = Array.from(
    new Set(
      items
        .map((item) => String(item.category || "").trim())
        .filter(Boolean)
    )
  );

  if (!categories.length) {
    state.directionFilter = "all";
    programFilters.hidden = true;
    programFilters.innerHTML = "";
    return;
  }

  if (state.directionFilter !== "all" && !categories.includes(state.directionFilter)) {
    state.directionFilter = "all";
  }

  const filters = ["all", ...categories];
  programFilters.hidden = filters.length <= 1;
  programFilters.innerHTML = filters
    .map((category) => {
      const isAll = category === "all";
      const label = isAll ? "Barchasi" : category;
      return `
        <button
          class="filter-chip ${state.directionFilter === category ? "is-active" : ""}"
          type="button"
          data-program-filter="${escapeHtml(category)}"
          aria-pressed="${state.directionFilter === category ? "true" : "false"}"
        >
          ${escapeHtml(label)}
        </button>
      `;
    })
    .join("");
}

function renderDirections(items) {
  const target = document.getElementById("directionsGrid");

  if (!target) {
    return;
  }

  const filteredItems =
    state.directionFilter === "all"
      ? items
      : items.filter((item) => String(item.category || "").trim() === state.directionFilter);

  if (!filteredItems.length) {
    target.innerHTML = `
      <article class="empty-state-card reveal visible">
        <strong>Bu kategoriya uchun blok topilmadi</strong>
        <p>Boshqa yo'nalishni tanlang yoki admin paneldan yangi dastur qo'shing.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = filteredItems
    .map(
      (item) => `
        <article class="info-card reveal">
          <span class="card-kicker">${escapeHtml(item.category || "Yo'nalish")}</span>
          <div class="card-icon">${escapeHtml(item.icon)}</div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");
}

function renderTimeline(section) {
  const target = document.getElementById("timelineGrid");

  if (!target) {
    return;
  }

  const items = section.items || [];

  if (!items.length) {
    target.innerHTML = `
      <article class="empty-state-card reveal visible">
        <strong>Timeline bo'sh</strong>
        <p>Qabul bosqichlari admin paneldan bir necha soniyada to'ldiriladi.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = items
    .map((item, index) => {
      const normalizedState = normalizeTimelineState(item.state);

      return `
        <article class="timeline-card timeline-${normalizedState} reveal">
          <div class="timeline-step-row">
            <span class="timeline-step">${escapeHtml(item.step || String(index + 1).padStart(2, "0"))}</span>
            <span class="timeline-state">${timelineStateLabel(normalizedState)}</span>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `;
    })
    .join("");
}

function renderTestimonials(section) {
  const target = document.getElementById("testimonialsGrid");

  if (!target) {
    return;
  }

  const items = section.items || [];

  if (!items.length) {
    target.innerHTML = `
      <article class="empty-state-card reveal visible">
        <strong>Sharhlar hali kiritilmagan</strong>
        <p>Admin paneldan rezidentlar yoki hamkorlar fikrlarini qo'shish mumkin.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = items
    .map((item) => {
      const imageUrl = sanitizeMediaUrl(item.image);
      const initials = buildInitials(item.name);

      return `
        <article class="testimonial-card reveal interactive-surface">
          <div class="testimonial-top">
            <div class="testimonial-avatar">
              ${
                imageUrl
                  ? `<img src="${imageUrl}" alt="${escapeHtml(item.name)}" />`
                  : `<span>${escapeHtml(initials)}</span>`
              }
            </div>
            <div class="testimonial-meta">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.role)}</span>
            </div>
          </div>
          <p class="testimonial-quote">"${escapeHtml(item.quote)}"</p>
          <div class="testimonial-result">
            <span>Natija</span>
            <strong>${escapeHtml(item.result)}</strong>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPartners(section) {
  const target = document.getElementById("partnersGrid");

  if (!target) {
    return;
  }

  const items = section.items || [];

  if (!items.length) {
    target.innerHTML = `
      <article class="empty-state-card reveal visible">
        <strong>Hamkorlar devori hozircha bo'sh</strong>
        <p>Rasmiy tashkilotlar va ekotizim logotiplarini admin paneldan yuklash mumkin.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = items
    .map((item) => {
      const logoUrl = sanitizeMediaUrl(item.logo);

      return `
        <a class="partner-card reveal interactive-surface" href="${sanitizeHref(item.url)}" target="_blank" rel="noreferrer">
          <div class="partner-logo">
            ${
              logoUrl
                ? `<img src="${logoUrl}" alt="${escapeHtml(item.name)} logotipi" />`
                : `<span>${escapeHtml(buildInitials(item.name))}</span>`
            }
          </div>
          <div class="partner-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.description)}</p>
          </div>
          <span class="partner-arrow">/</span>
        </a>
      `;
    })
    .join("");
}

function renderLiveStatus(section) {
  const target = document.getElementById("liveStatusList");

  if (!target) {
    return;
  }

  const items = section.items || [];

  target.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="live-status-item is-${normalizeTone(item.tone)}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </article>
          `
        )
        .join("")
    : `
        <article class="live-status-item is-primary">
          <span>Platforma</span>
          <strong>Faol</strong>
        </article>
      `;
}

function initializeChatWidget() {
  state.chatMessages = readStoredChatMessages();

  if (!state.chatMessages.length) {
    state.chatMessages = [buildChatSeedMessage()];
  }

  renderChatMessages();
  setChatOpen(false);
}

function hydrateChatContext(content) {
  if (!content) {
    return;
  }

  const firstMessage = state.chatMessages[0];

  if (!firstMessage || !firstMessage.seed) {
    return;
  }

  state.chatMessages[0] = buildChatSeedMessage(content);
  persistChatMessages();
  renderChatMessages();
}

function buildChatSeedMessage(content = state.content) {
  const name = content?.general?.organizationName || "Qarshi Yoshlar Texnoparki";

  return {
    role: "assistant",
    seed: true,
    content: `Assalomu alaykum. Men Aziz online, ${name} uchun HALLAYM AI yordamchisiman. Ariza, uchrashuv, yo'nalishlar va Device ID statusi bo'yicha tezkor yordam beraman.`
  };
}

function setChatOpen(nextState) {
  state.chatOpen = Boolean(nextState);

  if (chatWidget) {
    chatWidget.classList.toggle("is-open", state.chatOpen);
    chatWidget.setAttribute("aria-hidden", state.chatOpen ? "false" : "true");
  }

  if (chatLauncher) {
    chatLauncher.setAttribute("aria-expanded", state.chatOpen ? "true" : "false");
  }

  if (state.chatOpen) {
    window.setTimeout(() => {
      chatInput?.focus();
      scrollChatToBottom();
    }, 80);
  }
}

function renderChatMessages() {
  if (!chatMessages) {
    return;
  }

  const transcript = state.chatMessages
    .map(
      (message) => `
        <article class="chat-message ${message.role === "user" ? "is-user" : "is-bot"}">
          <span class="chat-message-role">${message.role === "user" ? "Siz" : "Aziz online"}</span>
          <div class="chat-bubble">${formatChatMessage(message.content)}</div>
        </article>
      `
    )
    .join("");

  const typingHtml = state.chatPending
    ? `
      <article class="chat-message is-bot">
        <span class="chat-message-role">Aziz online</span>
        <div class="chat-bubble">
          <span class="chat-typing" aria-label="Yozmoqda">
            <span class="chat-typing-dot"></span>
            <span class="chat-typing-dot"></span>
            <span class="chat-typing-dot"></span>
          </span>
        </div>
      </article>
    `
    : "";

  chatMessages.innerHTML = transcript + typingHtml;

  if (chatSendBtn) {
    chatSendBtn.disabled = state.chatPending;
    chatSendBtn.textContent = state.chatPending ? "Kutilyapti..." : "Yuborish";
  }

  if (chatInput) {
    chatInput.disabled = state.chatPending;
  }

  if (chatSuggestions) {
    chatSuggestions.hidden = state.chatMessages.length > 2;
  }

  scrollChatToBottom();
}

function formatChatMessage(value) {
  return escapeHtml(value || "").replaceAll("\n", "<br />");
}

function scrollChatToBottom() {
  if (!chatMessages) {
    return;
  }

  window.requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function resizeChatInput() {
  if (!chatInput) {
    return;
  }

  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 148)}px`;
}

function readStoredChatMessages() {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && (item.role === "user" || item.role === "assistant"))
      .slice(-14)
      .map((item) => ({
        role: item.role,
        content: String(item.content || "").slice(0, 1800),
        ...(item.seed ? { seed: true } : {})
      }))
      .filter((item) => item.content);
  } catch (error) {
    return [];
  }
}

function persistChatMessages() {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state.chatMessages.slice(-14)));
  } catch (error) {
    // Ignore storage issues for chat history.
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  await sendChatMessage(chatInput ? chatInput.value : "");
}

async function sendChatMessage(rawMessage) {
  const message = String(rawMessage || "").trim();

  if (!message || state.chatPending) {
    return;
  }

  setChatOpen(true);
  state.chatPending = true;
  state.chatMessages.push({
    role: "user",
    content: message
  });
  state.chatMessages = state.chatMessages.slice(-14);
  persistChatMessages();
  renderChatMessages();

  if (chatInput) {
    chatInput.value = "";
    resizeChatInput();
  }

  try {
    const response = await fetch("/api/assistant/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: state.chatMessages.slice(-10)
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Aziz online hozir javob bera olmadi.");
    }

    state.chatMessages.push({
      role: "assistant",
      content: payload.data?.reply || "Hozircha javob shakllanmadi."
    });
  } catch (error) {
    state.chatMessages.push({
      role: "assistant",
      content: error.message || "Hozircha ulanishda muammo bor. Keyinroq qayta urinib ko'ring."
    });
  } finally {
    state.chatPending = false;
    state.chatMessages = state.chatMessages.slice(-14);
    persistChatMessages();
    renderChatMessages();
  }
}

function renderProjects(items) {
  const target = document.getElementById("projectsGrid");

  if (!target) {
    return;
  }

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

  if (!target) {
    return;
  }

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

  if (!target) {
    return;
  }

  target.innerHTML = items
    .map(
      (item) => `
        <article class="news-card reveal">
          <span class="news-meta">${escapeHtml(item.date)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <a href="${sanitizeHref(resolveSiteHref(item.link), { allowHash: true, allowRelative: true })}">Batafsil</a>
        </article>
      `
    )
    .join("");
}

function renderSelectOptions(targetId, options) {
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  target.innerHTML = `
    <option value="">Tanlang</option>
    ${options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
  `;
}

async function handleMeetingSubmit(event) {
  event.preventDefault();
  showMessage("meetingMessage", "Yuborilmoqda...");

  if (!meetingForm) {
    return;
  }

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
    if (meetingDateInput) {
      meetingDateInput.min = new Date().toISOString().slice(0, 10);
    }
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

  if (!applicationForm) {
    return;
  }

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

  if (!target) {
    return;
  }

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
  const items = document.querySelectorAll(".reveal:not(.visible)");
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

function bindInteractiveGlow() {
  document.querySelectorAll(".interactive-surface").forEach((surface) => {
    if (surface.dataset.glowBound === "true") {
      return;
    }

    surface.dataset.glowBound = "true";
    surface.addEventListener("mousemove", (event) => {
      const rect = surface.getBoundingClientRect();
      const x = `${event.clientX - rect.left}px`;
      const y = `${event.clientY - rect.top}px`;
      surface.style.setProperty("--pointer-x", x);
      surface.style.setProperty("--pointer-y", y);
    });
  });
}

function bindMagneticButtons() {
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  document
    .querySelectorAll(".btn, .nav-cta, .sidebar-cta, .ribbon-link, .quick-dock-link")
    .forEach((element) => {
      if (element.dataset.magneticBound === "true") {
        return;
      }

      element.dataset.magneticBound = "true";
      element.classList.add("magnetic-ready");

      element.addEventListener("mousemove", (event) => {
        const rect = element.getBoundingClientRect();
        const offsetX = (event.clientX - rect.left - rect.width / 2) * 0.14;
        const offsetY = (event.clientY - rect.top - rect.height / 2) * 0.16;
        element.style.setProperty("--mx", `${offsetX}px`);
        element.style.setProperty("--my", `${offsetY}px`);
      });

      element.addEventListener("mouseleave", () => {
        element.style.setProperty("--mx", "0px");
        element.style.setProperty("--my", "0px");
      });
    });
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
  const normalizedTarget = normalizeInternalHref(hash || window.location.href);
  const targetPath = normalizedTarget.split("#")[0];

  sidebarLinks.forEach((link) => {
    const normalizedLink = normalizeInternalHref(link.getAttribute("href") || "");
    link.classList.toggle(
      "is-active",
      normalizedLink === normalizedTarget || normalizedLink.split("#")[0] === targetPath
    );
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
    element.href = sanitizeHref(resolveSiteHref(href), { allowHash: true, allowRelative: true });
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
  const canonicalHref = window.location.href.split("#")[0];
  updateMetaBySelector('meta[property="og:title"]', content.general.seoTitle || content.general.organizationName);
  updateMetaBySelector('meta[property="og:site_name"]', content.general.organizationName);
  updateMetaBySelector('meta[property="og:description"]', content.general.metaDescription);
  updateMetaBySelector('meta[property="og:url"]', canonicalHref);
  updateMetaBySelector('meta[property="og:image"]', image);
  updateMetaBySelector('meta[name="twitter:title"]', content.general.seoTitle || content.general.organizationName);
  updateMetaBySelector('meta[name="twitter:description"]', content.general.metaDescription);
  updateMetaBySelector('meta[name="twitter:image"]', image);
  const canonicalUrl = document.getElementById("canonicalUrl");

  if (canonicalUrl) {
    canonicalUrl.href = canonicalHref;
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

  if (state.content) {
    renderHeroFloatStack(state.content);
  }

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

  const destination = resolveSiteHref(match.href || `#${match.id}`);
  const targetHash = extractHash(destination);
  const samePage = isSamePageHref(destination);
  const target = samePage && targetHash ? document.querySelector(targetHash) : null;

  if (!samePage || !target) {
    window.location.href = destination;
    return;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  setActiveNav(destination);
  showMessage("searchFeedback", `${match.label} bo'limiga o'tildi.`);
}

function hidePageLoader() {
  if (!pageLoader || pageLoader.classList.contains("is-hidden")) {
    return;
  }

  pageLoader.classList.add("is-hidden");
  pageLoader.setAttribute("aria-hidden", "true");
}

function handlePreviewMessage(event) {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (event.data?.type !== "admin-preview-sync" || !event.data.payload) {
    return;
  }

  state.previewMode = true;
  state.content = event.data.payload;
  renderContent(event.data.payload);
}

function readStoredTheme() {
  try {
    return localStorage.getItem("qyt_theme");
  } catch (error) {
    return null;
  }
}

function initializeActiveRouteLinks() {
  const currentHash = window.location.hash;

  if (currentHash) {
    setActiveNav(currentHash);
    return;
  }

  const currentPath = normalizePathname(window.location.pathname);
  const routeLink =
    sidebarLinks.find((link) => normalizePathname(new URL(link.href, window.location.origin).pathname) === currentPath) ||
    sidebarLinks.find((link) => normalizePathname(new URL(link.href, window.location.origin).pathname) === "/");

  if (routeLink) {
    setActiveNav(routeLink.getAttribute("href") || window.location.href);
  }
}

function resolveSectionHref(sectionId) {
  const mapped = SECTION_ROUTE_MAP[sectionId];

  if (!mapped) {
    return `#${sectionId}`;
  }

  const resolved = new URL(mapped, window.location.origin);
  const targetPath = normalizePathname(resolved.pathname);
  const currentPath = normalizePathname(window.location.pathname);

  return currentPath === targetPath ? resolved.hash || targetPath : `${targetPath}${resolved.hash}`;
}

function resolveSiteHref(value) {
  const input = String(value || "").trim();

  if (!input) {
    return "#";
  }

  if (!input.startsWith("#")) {
    return input;
  }

  return resolveSectionHref(input.slice(1));
}

function normalizePathname(pathname) {
  const normalized = String(pathname || "/").trim();

  if (!normalized || normalized === "index.html" || normalized === "/index.html") {
    return "/";
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeInternalHref(value) {
  try {
    const resolved = new URL(resolveSiteHref(value), window.location.origin);
    return `${normalizePathname(resolved.pathname)}${resolved.hash}`;
  } catch (error) {
    return `${normalizePathname(window.location.pathname)}${String(value || "")}`;
  }
}

function isSamePageHref(value) {
  try {
    const resolved = new URL(resolveSiteHref(value), window.location.origin);
    return normalizePathname(resolved.pathname) === normalizePathname(window.location.pathname);
  } catch (error) {
    return false;
  }
}

function extractHash(value) {
  try {
    const resolved = new URL(resolveSiteHref(value), window.location.origin);
    return resolved.hash;
  } catch (error) {
    return "";
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

function normalizeTimelineState(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["active", "current", "in_progress"].includes(normalized)) {
    return "active";
  }

  if (["complete", "completed", "done"].includes(normalized)) {
    return "complete";
  }

  return "upcoming";
}

function timelineStateLabel(value) {
  const labels = {
    active: "Faol bosqich",
    complete: "Yakunlangan",
    upcoming: "Keyingi bosqich"
  };

  return labels[value] || labels.upcoming;
}

function normalizeTone(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["success", "green"].includes(normalized)) {
    return "success";
  }

  if (["info", "accent", "cyan"].includes(normalized)) {
    return "info";
  }

  return "primary";
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
