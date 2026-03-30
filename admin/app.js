const state = {
  user: null,
  content: null,
  applications: [],
  appointments: []
};

const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const contentForm = document.getElementById("contentForm");
const saveContentBtn = document.getElementById("saveContentBtn");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const uploadForm = document.getElementById("uploadForm");
const copyUploadUrlBtn = document.getElementById("copyUploadUrlBtn");
const uploadResult = document.getElementById("uploadResult");
const applicationsList = document.getElementById("applicationsList");
const appointmentsList = document.getElementById("appointmentsList");

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await checkSession();
});

function bindEvents() {
  loginForm.addEventListener("submit", handleLogin);
  saveContentBtn.addEventListener("click", handleSaveContent);
  refreshBtn.addEventListener("click", loadDashboardData);
  logoutBtn.addEventListener("click", handleLogout);
  uploadForm.addEventListener("submit", handleUpload);

  copyUploadUrlBtn.addEventListener("click", async () => {
    if (!uploadResult.value.trim()) {
      showMessage("uploadMessage", "Avval rasm yuklang.");
      return;
    }

    await navigator.clipboard.writeText(uploadResult.value.trim());
    showMessage("uploadMessage", "URL nusxa olindi.");
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

async function handleUpload(event) {
  event.preventDefault();
  showMessage("uploadMessage", "Yuklanmoqda...");

  const fileInput = document.getElementById("uploadFileInput");

  if (!fileInput.files.length) {
    showMessage("uploadMessage", "Rasm faylini tanlang.");
    return;
  }

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);

  try {
    const result = await fetchJson("/api/admin/upload", {
      method: "POST",
      body: formData
    });

    uploadResult.value = result.data.url;
    fileInput.value = "";
    showMessage("uploadMessage", result.message);
  } catch (error) {
    showMessage("uploadMessage", error.message);
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
  setField("hero.primaryActionLabel", content.hero.primaryActionLabel);
  setField("hero.primaryActionLink", content.hero.primaryActionLink);
  setField("hero.secondaryActionLabel", content.hero.secondaryActionLabel);
  setField("hero.secondaryActionLink", content.hero.secondaryActionLink);
  setField("hero.cardTitle", content.hero.cardTitle);
  setField("hero.cardDescription", content.hero.cardDescription);
  setField("heroSpotlights", stringifyJson(content.heroSpotlights));
  setField("trustItems", stringifyJson(content.trustItems));

  setField("about.tag", content.about.tag);
  setField("about.title", content.about.title);
  setField("about.description", content.about.description);
  setField("about.imageA", content.about.imageA);
  setField("about.imageB", content.about.imageB);
  setField("about.badgeTitle", content.about.badgeTitle);
  setField("about.badgeText", content.about.badgeText);
  setField("about.features", stringifyJson(content.about.features));

  setField("directions.tag", content.directions.tag);
  setField("directions.title", content.directions.title);
  setField("directions.description", content.directions.description);
  setField("directions.items", stringifyJson(content.directions.items));

  setField("projects.tag", content.projects.tag);
  setField("projects.title", content.projects.title);
  setField("projects.description", content.projects.description);
  setField("projects.items", stringifyJson(content.projects.items));
  setField("metrics", stringifyJson(content.metrics));

  setField("news.tag", content.news.tag);
  setField("news.title", content.news.title);
  setField("news.description", content.news.description);
  setField("news.items", stringifyJson(content.news.items));

  setField("appointmentSection.tag", content.appointmentSection.tag);
  setField("appointmentSection.title", content.appointmentSection.title);
  setField("appointmentSection.description", content.appointmentSection.description);
  setField("appointmentSection.note", content.appointmentSection.note);
  setField("appointmentSection.meetingTypes", stringifyJson(content.appointmentSection.meetingTypes));

  setField("applicationSection.tag", content.applicationSection.tag);
  setField("applicationSection.title", content.applicationSection.title);
  setField("applicationSection.description", content.applicationSection.description);
  setField("applicationSection.helperText", content.applicationSection.helperText);
  setField(
    "applicationSection.applicationOptions",
    stringifyJson(content.applicationSection.applicationOptions)
  );

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
      primaryActionLabel: getField("hero.primaryActionLabel"),
      primaryActionLink: getField("hero.primaryActionLink"),
      secondaryActionLabel: getField("hero.secondaryActionLabel"),
      secondaryActionLink: getField("hero.secondaryActionLink"),
      cardTitle: getField("hero.cardTitle"),
      cardDescription: getField("hero.cardDescription")
    },
    heroSpotlights: parseJsonField("heroSpotlights", "Hero spotlights JSON"),
    trustItems: parseJsonField("trustItems", "Trust items JSON"),
    about: {
      tag: getField("about.tag"),
      title: getField("about.title"),
      description: getField("about.description"),
      imageA: getField("about.imageA"),
      imageB: getField("about.imageB"),
      badgeTitle: getField("about.badgeTitle"),
      badgeText: getField("about.badgeText"),
      features: parseJsonField("about.features", "About features JSON")
    },
    directions: {
      tag: getField("directions.tag"),
      title: getField("directions.title"),
      description: getField("directions.description"),
      items: parseJsonField("directions.items", "Directions items JSON")
    },
    projects: {
      tag: getField("projects.tag"),
      title: getField("projects.title"),
      description: getField("projects.description"),
      items: parseJsonField("projects.items", "Projects items JSON")
    },
    metrics: parseJsonField("metrics", "Metrics JSON"),
    news: {
      tag: getField("news.tag"),
      title: getField("news.title"),
      description: getField("news.description"),
      items: parseJsonField("news.items", "News items JSON")
    },
    appointmentSection: {
      tag: getField("appointmentSection.tag"),
      title: getField("appointmentSection.title"),
      description: getField("appointmentSection.description"),
      note: getField("appointmentSection.note"),
      meetingTypes: parseJsonField("appointmentSection.meetingTypes", "Meeting types JSON")
    },
    applicationSection: {
      tag: getField("applicationSection.tag"),
      title: getField("applicationSection.title"),
      description: getField("applicationSection.description"),
      helperText: getField("applicationSection.helperText"),
      applicationOptions: parseJsonField(
        "applicationSection.applicationOptions",
        "Application options JSON"
      )
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
  const field = contentForm.elements.namedItem(name);

  if (field) {
    field.value = value ?? "";
  }
}

function getField(name) {
  const field = contentForm.elements.namedItem(name);
  return String(field ? field.value : "").trim();
}

function parseJsonField(name, label) {
  const raw = getField(name);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} noto'g'ri JSON formatda.`);
  }
}

function stringifyJson(value) {
  return JSON.stringify(value || [], null, 2);
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
