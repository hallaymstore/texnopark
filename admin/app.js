const state = {
  user: null,
  content: null,
  applications: [],
  appointments: [],
  editorData: {},
  pendingUploads: 0
};

const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const contentForm = document.getElementById("contentForm");
const saveContentBtn = document.getElementById("saveContentBtn");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const applicationsList = document.getElementById("applicationsList");
const appointmentsList = document.getElementById("appointmentsList");

const editorConfigs = [
  {
    name: "heroSpotlights",
    title: "Hero statistikalar",
    description: "Asosiy ko'rsatkichlarni alohida bloklar sifatida kiriting.",
    addLabel: "Statistika qo'shish",
    createItem: () => ({ value: "", label: "" }),
    fields: [
      { key: "value", label: "Qiymat", placeholder: "12+" },
      { key: "label", label: "Izoh", placeholder: "yo'nalish va dasturlar" }
    ]
  },
  {
    name: "trustItems",
    title: "Afzalliklar",
    description: "Header ostida chiqadigan qisqa ustunlarni kiriting.",
    addLabel: "Afzallik qo'shish",
    createItem: () => "",
    fields: [{ key: "__self", label: "Afzallik matni", placeholder: "Rasmiy va premium taqdimot" }]
  },
  {
    name: "about.features",
    title: "About afzalliklari",
    description: "Markaz haqida bo'limida ko'rinadigan qisqa punktlar.",
    addLabel: "Afzallik qo'shish",
    createItem: () => "",
    fields: [{ key: "__self", label: "Matn", placeholder: "Premium light UI va mobilga mos layout" }]
  },
  {
    name: "directions.items",
    title: "Yo'nalishlar",
    description: "Har bir yo'nalishni oddiy kartalar ko'rinishida to'ldiring.",
    addLabel: "Yo'nalish qo'shish",
    createItem: () => ({ icon: "", title: "", description: "" }),
    fields: [
      { key: "icon", label: "Qisqa belgi", placeholder: "AI" },
      { key: "title", label: "Sarlavha", placeholder: "Sun'iy intellekt va dasturlash" },
      { key: "description", label: "Tavsif", type: "textarea", placeholder: "Qisqa tavsif" }
    ]
  },
  {
    name: "projects.items",
    title: "Loyihalar",
    description: "Har bir loyiha uchun matn va media faylni kiriting.",
    addLabel: "Loyiha qo'shish",
    createItem: () => ({ category: "", title: "", summary: "", image: "", mediaType: "image", featured: false }),
    fields: [
      { key: "category", label: "Kategoriya", placeholder: "Flagship" },
      { key: "title", label: "Sarlavha", placeholder: "Kelajak kasblari rezidentura dasturi" },
      { key: "summary", label: "Tavsif", type: "textarea", placeholder: "Qisqa loyiha tavsifi" },
      { key: "featured", label: "Katta karta sifatida ko'rsatish", type: "checkbox" }
    ],
    media: {
      urlKey: "image",
      typeKey: "mediaType",
      accept: "image/*,video/*",
      label: "Loyiha media"
    }
  },
  {
    name: "metrics",
    title: "Metrikalar",
    description: "Raqam va uning izohini oddiy ko'rinishda kiriting.",
    addLabel: "Metrika qo'shish",
    createItem: () => ({ value: "", label: "" }),
    fields: [
      { key: "value", label: "Qiymat", placeholder: "95%" },
      { key: "label", label: "Izoh", placeholder: "foydalanuvchi tajribasi" }
    ]
  },
  {
    name: "news.items",
    title: "Yangiliklar",
    description: "Yangilik kartalarini shu yerdan boshqaring.",
    addLabel: "Yangilik qo'shish",
    createItem: () => ({ date: "", title: "", description: "", link: "" }),
    fields: [
      { key: "date", label: "Sana", placeholder: "30 Mart 2026" },
      { key: "title", label: "Sarlavha", placeholder: "Yangi dastur ochildi" },
      { key: "description", label: "Tavsif", type: "textarea", placeholder: "Qisqa tavsif" },
      { key: "link", label: "Tugma linki", placeholder: "#application" }
    ]
  },
  {
    name: "appointmentSection.meetingTypes",
    title: "Uchrashuv turlari",
    description: "Foydalanuvchi tanlaydigan uchrashuv turlarini kiriting.",
    addLabel: "Tur qo'shish",
    createItem: () => "",
    fields: [{ key: "__self", label: "Uchrashuv turi", placeholder: "Hamkorlik" }]
  },
  {
    name: "applicationSection.applicationOptions",
    title: "Ariza yo'nalishlari",
    description: "Ariza formasidagi yo'nalish variantlari.",
    addLabel: "Yo'nalish qo'shish",
    createItem: () => "",
    fields: [{ key: "__self", label: "Yo'nalish", placeholder: "Sun'iy intellekt va dasturlash" }]
  }
];

const staticMediaConfigs = [
  {
    fieldName: "hero.image",
    typeField: "hero.mediaType",
    title: "Hero media",
    description: "Hero bo'limi uchun rasm yoki video tanlang.",
    accept: "image/*,video/*"
  },
  {
    fieldName: "about.imageA",
    typeField: "about.imageAType",
    title: "About media 1",
    description: "About bo'limidagi birinchi media.",
    accept: "image/*,video/*"
  },
  {
    fieldName: "about.imageB",
    typeField: "about.imageBType",
    title: "About media 2",
    description: "About bo'limidagi ikkinchi media.",
    accept: "image/*,video/*"
  }
];

const editorConfigMap = Object.fromEntries(editorConfigs.map((config) => [config.name, config]));
const staticMediaMap = Object.fromEntries(staticMediaConfigs.map((config) => [config.fieldName, config]));

document.addEventListener("DOMContentLoaded", async () => {
  setupFriendlyEditors();
  setupStaticMediaEditors();
  bindEvents();
  await checkSession();
});

function bindEvents() {
  loginForm.addEventListener("submit", handleLogin);
  saveContentBtn.addEventListener("click", handleSaveContent);
  refreshBtn.addEventListener("click", loadDashboardData);
  logoutBtn.addEventListener("click", handleLogout);

  contentForm.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-editor]");
    const removeButton = event.target.closest("[data-remove-editor]");

    if (addButton) {
      addEditorItem(editorConfigMap[addButton.dataset.addEditor]);
      return;
    }

    if (removeButton) {
      removeEditorItem(
        editorConfigMap[removeButton.dataset.removeEditor],
        Number(removeButton.dataset.index)
      );
    }
  });

  contentForm.addEventListener("input", (event) => {
    const field = event.target.closest("[data-editor-field]");

    if (field) {
      updateEditorItem(field);
    }
  });

  contentForm.addEventListener("change", async (event) => {
    const checkboxField = event.target.closest('[data-editor-field][type="checkbox"]');

    if (checkboxField) {
      updateEditorItem(checkboxField);
      return;
    }

    const staticMediaInput = event.target.closest("[data-static-media-input]");

    if (staticMediaInput) {
      await uploadStaticMedia(staticMediaInput);
      return;
    }

    const editorMediaInput = event.target.closest("[data-editor-media-input]");

    if (editorMediaInput) {
      await uploadEditorMedia(editorMediaInput);
    }
  });

  applicationsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-application]");

    if (!button) {
      return;
    }

    const id = button.dataset.saveApplication;
    const status = document.querySelector(`[data-application-status="${id}"]`).value;
    const adminNote = document.querySelector(`[data-application-note="${id}"]`).value;

    await updateRecord(`/api/admin/applications/${id}`, { status, adminNote }, "Ariza yangilandi.");
  });

  appointmentsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-appointment]");

    if (!button) {
      return;
    }

    const id = button.dataset.saveAppointment;
    const status = document.querySelector(`[data-appointment-status="${id}"]`).value;
    const adminNote = document.querySelector(`[data-appointment-note="${id}"]`).value;

    await updateRecord(`/api/admin/appointments/${id}`, { status, adminNote }, "Uchrashuv yangilandi.");
  });
}

async function checkSession() {
  try {
    const payload = await fetchJson("/api/admin/session");

    if (!payload.authenticated) {
      showAuth();
      return;
    }

    state.user = payload.user;
    showDashboard();
    await loadDashboardData();
  } catch (error) {
    showAuth();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  showMessage("loginMessage", "Kirilmoqda...");

  const payload = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const result = await fetchJson("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    state.user = result.user;
    loginForm.reset();
    showDashboard();
    await loadDashboardData();
    showMessage("loginMessage", "");
  } catch (error) {
    showMessage("loginMessage", error.message);
  }
}

async function handleLogout() {
  await fetchJson("/api/admin/logout", {
    method: "POST"
  });

  state.user = null;
  showAuth();
}

async function loadDashboardData() {
  try {
    const [sitePayload, applicationsPayload, appointmentsPayload] = await Promise.all([
      fetchJson("/api/site-content"),
      fetchJson("/api/admin/applications"),
      fetchJson("/api/admin/appointments")
    ]);

    state.content = sitePayload.data;
    state.applications = applicationsPayload.data;
    state.appointments = appointmentsPayload.data;

    fillContentForm(state.content);
    renderSummary();
    renderApplications();
    renderAppointments();
    document.getElementById("dashboardWelcome").textContent = `${state.user.username} uchun boshqaruv paneli`;
  } catch (error) {
    if (error.status === 401) {
      showAuth();
      return;
    }

    showMessage("contentMessage", error.message);
  }
}

async function handleSaveContent() {
  if (state.pendingUploads > 0) {
    showMessage("contentMessage", "Media yuklanishi tugashini kuting, keyin saqlang.");
    return;
  }

  showMessage("contentMessage", "Saqlanmoqda...");

  try {
    const payload = collectContentForm();
    const result = await fetchJson("/api/admin/site-content", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    state.content = result.data;
    fillContentForm(state.content);
    showMessage("contentMessage", "Sayt ma'lumotlari saqlandi.");
  } catch (error) {
    showMessage("contentMessage", error.message);
  }
}

async function updateRecord(url, payload, successMessage) {
  try {
    await fetchJson(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    await loadDashboardData();
    showMessage("contentMessage", successMessage);
  } catch (error) {
    showMessage("contentMessage", error.message);
  }
}

function showAuth() {
  authView.classList.remove("hidden");
  dashboardView.classList.add("hidden");
}

function showDashboard() {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
}

function setupFriendlyEditors() {
  editorConfigs.forEach((config) => {
    const legacyField = contentForm.elements.namedItem(config.name);

    if (!legacyField) {
      return;
    }

    const legacyLabel = legacyField.closest("label");

    if (legacyLabel) {
      legacyLabel.classList.add("hidden-helper-field");
      const mount = document.createElement("div");
      mount.className = "friendly-editor full";
      mount.id = editorMountId(config.name);
      legacyLabel.insertAdjacentElement("afterend", mount);
    }

    state.editorData[config.name] = [];
  });
}

function setupStaticMediaEditors() {
  staticMediaConfigs.forEach((config) => {
    ensureHiddenField(config.typeField);

    const field = contentForm.elements.namedItem(config.fieldName);

    if (!field) {
      return;
    }

    const legacyLabel = field.closest("label");

    if (legacyLabel) {
      legacyLabel.classList.add("hidden-helper-field");
      const mount = document.createElement("div");
      mount.className = "media-editor full";
      mount.dataset.staticMediaMount = config.fieldName;
      legacyLabel.insertAdjacentElement("afterend", mount);
    }
  });
}

function fillContentForm(content) {
  setField("general.organizationName", content.general.organizationName);
  setField("general.organizationShortName", content.general.organizationShortName);
  setField("general.tagline", content.general.tagline);
  setField("general.metaDescription", content.general.metaDescription);

  setField("hero.eyebrow", content.hero.eyebrow);
  setField("hero.title", content.hero.title);
  setField("hero.highlight", content.hero.highlight);
  setField("hero.description", content.hero.description);
  setField("hero.image", content.hero.image);
  setField("hero.mediaType", content.hero.mediaType || inferMediaType(content.hero.image));
  setField("hero.primaryActionLabel", content.hero.primaryActionLabel);
  setField("hero.primaryActionLink", content.hero.primaryActionLink);
  setField("hero.secondaryActionLabel", content.hero.secondaryActionLabel);
  setField("hero.secondaryActionLink", content.hero.secondaryActionLink);
  setField("hero.cardTitle", content.hero.cardTitle);
  setField("hero.cardDescription", content.hero.cardDescription);

  setField("about.tag", content.about.tag);
  setField("about.title", content.about.title);
  setField("about.description", content.about.description);
  setField("about.imageA", content.about.imageA);
  setField("about.imageAType", content.about.imageAType || inferMediaType(content.about.imageA));
  setField("about.imageB", content.about.imageB);
  setField("about.imageBType", content.about.imageBType || inferMediaType(content.about.imageB));
  setField("about.badgeTitle", content.about.badgeTitle);
  setField("about.badgeText", content.about.badgeText);

  setField("directions.tag", content.directions.tag);
  setField("directions.title", content.directions.title);
  setField("directions.description", content.directions.description);

  setField("projects.tag", content.projects.tag);
  setField("projects.title", content.projects.title);
  setField("projects.description", content.projects.description);

  setField("news.tag", content.news.tag);
  setField("news.title", content.news.title);
  setField("news.description", content.news.description);

  setField("appointmentSection.tag", content.appointmentSection.tag);
  setField("appointmentSection.title", content.appointmentSection.title);
  setField("appointmentSection.description", content.appointmentSection.description);
  setField("appointmentSection.note", content.appointmentSection.note);

  setField("applicationSection.tag", content.applicationSection.tag);
  setField("applicationSection.title", content.applicationSection.title);
  setField("applicationSection.description", content.applicationSection.description);
  setField("applicationSection.helperText", content.applicationSection.helperText);

  setField("statusSection.tag", content.statusSection.tag);
  setField("statusSection.title", content.statusSection.title);
  setField("statusSection.description", content.statusSection.description);
  setField("statusSection.helperText", content.statusSection.helperText);

  setField("contact.title", content.contact.title);
  setField("contact.description", content.contact.description);
  setField("contact.address", content.contact.address);
  setField("contact.phone", content.contact.phone);
  setField("contact.email", content.contact.email);
  setField("contact.workingHours", content.contact.workingHours);
  setField("contact.mapLink", content.contact.mapLink);
  setField("contact.telegram", content.contact.telegram);
  setField("contact.instagram", content.contact.instagram);

  state.editorData.heroSpotlights = deepCopy(content.heroSpotlights || []);
  state.editorData.trustItems = deepCopy(content.trustItems || []);
  state.editorData["about.features"] = deepCopy(content.about.features || []);
  state.editorData["directions.items"] = deepCopy(content.directions.items || []);
  state.editorData["projects.items"] = deepCopy((content.projects.items || []).map((item) => ({
    ...item,
    mediaType: item.mediaType || inferMediaType(item.image)
  })));
  state.editorData.metrics = deepCopy(content.metrics || []);
  state.editorData["news.items"] = deepCopy(content.news.items || []);
  state.editorData["appointmentSection.meetingTypes"] = deepCopy(content.appointmentSection.meetingTypes || []);
  state.editorData["applicationSection.applicationOptions"] = deepCopy(
    content.applicationSection.applicationOptions || []
  );

  syncAllEditorFields();
  renderAllFriendlyEditors();
  renderStaticMediaEditors();
}

function collectContentForm() {
  return {
    general: {
      organizationName: getField("general.organizationName"),
      organizationShortName: getField("general.organizationShortName"),
      tagline: getField("general.tagline"),
      metaDescription: getField("general.metaDescription")
    },
    hero: {
      eyebrow: getField("hero.eyebrow"),
      title: getField("hero.title"),
      highlight: getField("hero.highlight"),
      description: getField("hero.description"),
      image: getField("hero.image"),
      mediaType: getField("hero.mediaType") || inferMediaType(getField("hero.image")),
      primaryActionLabel: getField("hero.primaryActionLabel"),
      primaryActionLink: getField("hero.primaryActionLink"),
      secondaryActionLabel: getField("hero.secondaryActionLabel"),
      secondaryActionLink: getField("hero.secondaryActionLink"),
      cardTitle: getField("hero.cardTitle"),
      cardDescription: getField("hero.cardDescription")
    },
    heroSpotlights: state.editorData.heroSpotlights || [],
    trustItems: state.editorData.trustItems || [],
    about: {
      tag: getField("about.tag"),
      title: getField("about.title"),
      description: getField("about.description"),
      imageA: getField("about.imageA"),
      imageAType: getField("about.imageAType") || inferMediaType(getField("about.imageA")),
      imageB: getField("about.imageB"),
      imageBType: getField("about.imageBType") || inferMediaType(getField("about.imageB")),
      badgeTitle: getField("about.badgeTitle"),
      badgeText: getField("about.badgeText"),
      features: state.editorData["about.features"] || []
    },
    directions: {
      tag: getField("directions.tag"),
      title: getField("directions.title"),
      description: getField("directions.description"),
      items: state.editorData["directions.items"] || []
    },
    projects: {
      tag: getField("projects.tag"),
      title: getField("projects.title"),
      description: getField("projects.description"),
      items: state.editorData["projects.items"] || []
    },
    metrics: state.editorData.metrics || [],
    news: {
      tag: getField("news.tag"),
      title: getField("news.title"),
      description: getField("news.description"),
      items: state.editorData["news.items"] || []
    },
    appointmentSection: {
      tag: getField("appointmentSection.tag"),
      title: getField("appointmentSection.title"),
      description: getField("appointmentSection.description"),
      note: getField("appointmentSection.note"),
      meetingTypes: state.editorData["appointmentSection.meetingTypes"] || []
    },
    applicationSection: {
      tag: getField("applicationSection.tag"),
      title: getField("applicationSection.title"),
      description: getField("applicationSection.description"),
      helperText: getField("applicationSection.helperText"),
      applicationOptions: state.editorData["applicationSection.applicationOptions"] || []
    },
    statusSection: {
      tag: getField("statusSection.tag"),
      title: getField("statusSection.title"),
      description: getField("statusSection.description"),
      helperText: getField("statusSection.helperText")
    },
    contact: {
      title: getField("contact.title"),
      description: getField("contact.description"),
      address: getField("contact.address"),
      phone: getField("contact.phone"),
      email: getField("contact.email"),
      workingHours: getField("contact.workingHours"),
      mapLink: getField("contact.mapLink"),
      telegram: getField("contact.telegram"),
      instagram: getField("contact.instagram")
    }
  };
}

function renderAllFriendlyEditors() {
  editorConfigs.forEach(renderFriendlyEditor);
}

function renderFriendlyEditor(config) {
  const mount = document.getElementById(editorMountId(config.name));

  if (!mount) {
    return;
  }

  const items = state.editorData[config.name] || [];

  mount.innerHTML = `
    <div class="editor-head">
      <div>
        <h5>${config.title}</h5>
        <p>${config.description}</p>
      </div>
      <button class="ghost-btn" type="button" data-add-editor="${config.name}">${config.addLabel}</button>
    </div>
    <div class="editor-list">
      ${
        items.length
          ? items.map((item, index) => renderEditorCard(config, item, index)).join("")
          : `<div class="empty-editor">Bu bo'limda hozircha element yo'q. Yangi element qo'shing.</div>`
      }
    </div>
  `;
}

function renderEditorCard(config, item, index) {
  const fieldsHtml = config.fields
    .map((field) => renderEditorField(config, field, item, index))
    .join("");

  const mediaHtml = config.media ? renderEditorMedia(config, item, index) : "";

  return `
    <article class="editor-card">
      <div class="editor-card-head">
        <strong>${config.title} #${index + 1}</strong>
        <button class="remove-btn" type="button" data-remove-editor="${config.name}" data-index="${index}">O'chirish</button>
      </div>
      <div class="editor-card-grid">
        ${fieldsHtml}
      </div>
      ${mediaHtml}
    </article>
  `;
}

function renderEditorField(config, field, item, index) {
  const value = field.key === "__self" ? item : item[field.key];
  const shared = `data-editor-field data-editor-name="${config.name}" data-editor-index="${index}" data-editor-key="${field.key}"`;

  if (field.type === "textarea") {
    return `
      <label class="editor-field full">
        <span>${field.label}</span>
        <textarea rows="4" ${shared} placeholder="${field.placeholder || ""}">${escapeHtml(value || "")}</textarea>
      </label>
    `;
  }

  if (field.type === "checkbox") {
    return `
      <label class="editor-field checkbox-field full">
        <input type="checkbox" ${shared} ${value ? "checked" : ""} />
        <span>${field.label}</span>
      </label>
    `;
  }

  return `
    <label class="editor-field">
      <span>${field.label}</span>
      <input type="text" ${shared} value="${escapeHtml(value || "")}" placeholder="${field.placeholder || ""}" />
    </label>
  `;
}

function renderEditorMedia(config, item, index) {
  const mediaUrl = item[config.media.urlKey];
  const mediaType = item[config.media.typeKey] || inferMediaType(mediaUrl);

  return `
    <div class="editor-media">
      <div class="editor-media-preview">
        ${renderMediaPreview(mediaUrl, mediaType, config.media.label)}
      </div>
      <div class="editor-media-actions">
        <span>${config.media.label}</span>
        <small>${mediaType === "video" ? "Video tanlangan" : "Rasm tanlangan"}</small>
        <label class="upload-chip">
          <input
            type="file"
            accept="${config.media.accept}"
            data-editor-media-input
            data-editor-name="${config.name}"
            data-editor-index="${index}"
          />
          <span>Qurilmadan tanlash</span>
        </label>
        <p class="upload-message" id="${mediaMessageId(config.name, index)}"></p>
      </div>
    </div>
  `;
}

function renderStaticMediaEditors() {
  staticMediaConfigs.forEach((config) => {
    const mount = document.querySelector(`[data-static-media-mount="${config.fieldName}"]`);

    if (!mount) {
      return;
    }

    const mediaUrl = getField(config.fieldName);
    const mediaType = getField(config.typeField) || inferMediaType(mediaUrl);

    mount.innerHTML = `
      <div class="editor-head">
        <div>
          <h5>${config.title}</h5>
          <p>${config.description}</p>
        </div>
      </div>
      <div class="static-media-card">
        <div class="static-media-preview">
          ${renderMediaPreview(mediaUrl, mediaType, config.title)}
        </div>
        <div class="editor-media-actions">
          <span>${config.title}</span>
          <small>${mediaType === "video" ? "Video tanlangan" : "Rasm tanlangan"}</small>
          <label class="upload-chip">
            <input type="file" accept="${config.accept}" data-static-media-input="${config.fieldName}" />
            <span>Qurilmadan tanlash</span>
          </label>
          <p class="upload-message" id="${staticMessageId(config.fieldName)}"></p>
        </div>
      </div>
    `;
  });
}

function renderMediaPreview(url, mediaType, label) {
  if (!url) {
    return `<div class="media-placeholder">${label} hali yuklanmagan</div>`;
  }

  return mediaType === "video"
    ? `<video src="${url}" controls muted playsinline preload="metadata"></video>`
    : `<img src="${url}" alt="${label}" />`;
}

function addEditorItem(config) {
  const items = ensureEditorArray(config.name);
  items.push(config.createItem());
  syncEditorField(config.name);
  renderFriendlyEditor(config);
}

function removeEditorItem(config, index) {
  const items = ensureEditorArray(config.name);
  items.splice(index, 1);
  syncEditorField(config.name);
  renderFriendlyEditor(config);
}

function updateEditorItem(field) {
  const configName = field.dataset.editorName;
  const index = Number(field.dataset.editorIndex);
  const key = field.dataset.editorKey;
  const config = editorConfigMap[configName];
  const items = ensureEditorArray(configName);
  const currentItem = items[index];

  if (field.type === "checkbox") {
    currentItem[key] = field.checked;
  } else if (key === "__self") {
    items[index] = field.value;
  } else {
    currentItem[key] = field.value;
  }

  syncEditorField(config.name);
}

async function uploadStaticMedia(input) {
  const config = staticMediaMap[input.dataset.staticMediaInput];
  const file = input.files[0];

  if (!config || !file) {
    return;
  }

  const messageTarget = staticMessageId(config.fieldName);
  showMessage(messageTarget, "Media yuklanmoqda...");
  changeUploadState(1);

  try {
    const result = await uploadMedia(file);
    setField(config.fieldName, result.url);
    setField(config.typeField, normalizeResourceType(result.resourceType));
    renderStaticMediaEditors();
    showMessage(messageTarget, "Media yuklandi.");
  } catch (error) {
    showMessage(messageTarget, error.message);
  } finally {
    input.value = "";
    changeUploadState(-1);
  }
}

async function uploadEditorMedia(input) {
  const configName = input.dataset.editorName;
  const index = Number(input.dataset.editorIndex);
  const config = editorConfigMap[configName];
  const file = input.files[0];

  if (!config || !config.media || !file) {
    return;
  }

  const messageTarget = mediaMessageId(configName, index);
  showMessage(messageTarget, "Media yuklanmoqda...");
  changeUploadState(1);

  try {
    const result = await uploadMedia(file);
    const items = ensureEditorArray(configName);
    items[index][config.media.urlKey] = result.url;
    items[index][config.media.typeKey] = normalizeResourceType(result.resourceType);
    syncEditorField(configName);
    renderFriendlyEditor(config);
    showMessage(messageTarget, "Media yuklandi.");
  } catch (error) {
    showMessage(messageTarget, error.message);
  } finally {
    input.value = "";
    changeUploadState(-1);
  }
}

async function uploadMedia(file) {
  const formData = new FormData();
  formData.append("media", file);

  const result = await fetchJson("/api/admin/upload", {
    method: "POST",
    body: formData
  });

  return result.data;
}

function changeUploadState(delta) {
  state.pendingUploads = Math.max(0, state.pendingUploads + delta);
}

function syncAllEditorFields() {
  editorConfigs.forEach((config) => syncEditorField(config.name));
}

function syncEditorField(name) {
  setField(name, JSON.stringify(state.editorData[name] || [], null, 2));
}

function ensureEditorArray(name) {
  if (!Array.isArray(state.editorData[name])) {
    state.editorData[name] = [];
  }

  return state.editorData[name];
}

function renderSummary() {
  document.getElementById("summaryApplications").textContent = state.applications.length;
  document.getElementById("summaryAppointments").textContent = state.appointments.filter(
    (item) => item.status === "new"
  ).length;
  document.getElementById("summaryApproved").textContent = state.applications.filter(
    (item) => item.status === "approved"
  ).length;
}

function renderApplications() {
  if (!state.applications.length) {
    applicationsList.innerHTML = `<div class="record-card"><p>Hozircha arizalar yo'q.</p></div>`;
    return;
  }

  applicationsList.innerHTML = state.applications
    .map(
      (item) => `
        <article class="record-card">
          <div class="record-top">
            <div>
              <strong>${escapeHtml(item.trackingCode)} | ${escapeHtml(item.fullName)}</strong>
              <p>Device ID: ${escapeHtml(item.deviceId)}</p>
              <p>Yo'nalish: ${escapeHtml(item.selectedProgram)}</p>
              <p>Telefon: ${escapeHtml(item.phone)} ${item.email ? `| ${escapeHtml(item.email)}` : ""}</p>
              <p>Portfolio: ${item.portfolioLink ? escapeHtml(item.portfolioLink) : "Ko'rsatilmagan"}</p>
              <p>Yuborilgan: ${formatDate(item.createdAt)}</p>
              <p>Matn: ${escapeHtml(item.message)}</p>
            </div>
            <span class="badge ${item.status}">${translateStatus(item.status)}</span>
          </div>
          <div class="record-grid">
            <label>
              <span>Status</span>
              <select data-application-status="${item.id}">
                ${statusOptions(item.status, ["submitted", "reviewing", "approved", "rejected", "waiting_list"])}
              </select>
            </label>
            <label>
              <span>Admin izohi</span>
              <textarea rows="4" data-application-note="${item.id}">${escapeHtml(item.adminNote || "")}</textarea>
            </label>
          </div>
          <div class="record-actions">
            <button class="primary-btn" type="button" data-save-application="${item.id}">Saqlash</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderAppointments() {
  if (!state.appointments.length) {
    appointmentsList.innerHTML = `<div class="record-card"><p>Hozircha uchrashuvlar yo'q.</p></div>`;
    return;
  }

  appointmentsList.innerHTML = state.appointments
    .map(
      (item) => `
        <article class="record-card">
          <div class="record-top">
            <div>
              <strong>${escapeHtml(item.trackingCode)} | ${escapeHtml(item.fullName)}</strong>
              <p>Telefon: ${escapeHtml(item.phone)} ${item.email ? `| ${escapeHtml(item.email)}` : ""}</p>
              <p>Tashkilot: ${escapeHtml(item.organization || "Ko'rsatilmagan")}</p>
              <p>Uchrashuv turi: ${escapeHtml(item.meetingType)}</p>
              <p>Sana: ${escapeHtml(item.preferredDate)}</p>
              <p>Qayd: ${escapeHtml(item.note || "Ko'rsatilmagan")}</p>
              <p>Yuborilgan: ${formatDate(item.createdAt)}</p>
            </div>
            <span class="badge ${item.status}">${translateStatus(item.status)}</span>
          </div>
          <div class="record-grid">
            <label>
              <span>Status</span>
              <select data-appointment-status="${item.id}">
                ${statusOptions(item.status, ["new", "contacted", "confirmed", "completed", "cancelled"])}
              </select>
            </label>
            <label>
              <span>Admin izohi</span>
              <textarea rows="4" data-appointment-note="${item.id}">${escapeHtml(item.adminNote || "")}</textarea>
            </label>
          </div>
          <div class="record-actions">
            <button class="primary-btn" type="button" data-save-appointment="${item.id}">Saqlash</button>
          </div>
        </article>
      `
    )
    .join("");
}

function statusOptions(selected, options) {
  return options
    .map(
      (option) =>
        `<option value="${option}" ${option === selected ? "selected" : ""}>${translateStatus(option)}</option>`
    )
    .join("");
}

function setField(name, value) {
  const field = ensureHiddenField(name);
  field.value = value ?? "";
}

function getField(name) {
  const field = contentForm.elements.namedItem(name);
  return String(field ? field.value : "").trim();
}

function ensureHiddenField(name) {
  let field = contentForm.elements.namedItem(name);

  if (field) {
    return field;
  }

  field = document.createElement("input");
  field.type = "hidden";
  field.name = name;
  contentForm.appendChild(field);
  return field;
}

function editorMountId(name) {
  return `editor-${name.replaceAll(".", "-")}`;
}

function mediaMessageId(name, index) {
  return `media-message-${name.replaceAll(".", "-")}-${index}`;
}

function staticMessageId(name) {
  return `static-media-message-${name.replaceAll(".", "-")}`;
}

function normalizeResourceType(type) {
  return type === "video" ? "video" : "image";
}

function inferMediaType(url) {
  return /\.(mp4|webm|ogg|mov)$/i.test(String(url || "")) ? "video" : "image";
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
  return new Date(value).toLocaleString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showMessage(targetId, message) {
  const target = document.getElementById(targetId);

  if (target) {
    target.textContent = message;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.message || "So'rov bajarilmadi.");
    error.status = response.status;
    throw error;
  }

  return payload;
}
