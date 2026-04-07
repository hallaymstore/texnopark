import defaultSiteContent from "./default-site-content.mjs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ADMIN_COOKIE_NAME = "qyt_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const MAX_LOGIN_ATTEMPTS = 6;
const encoder = new TextEncoder();
const loginAttempts = new Map();

const memoryStore = {
  siteContent: deepClone(defaultSiteContent),
  applications: [],
  appointments: []
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const adminSlug = cleanText(env.ADMIN_SLUG || "ef3190c0fee63c12", 120) || "ef3190c0fee63c12";
    const adminRoute = `/${adminSlug}`;

    try {
      if (url.pathname === adminRoute || url.pathname === `${adminRoute}/`) {
        return await serveAdminIndex(request, env, adminRoute);
      }

      if (url.pathname.startsWith(`${adminRoute}/`)) {
        return await serveAdminAsset(request, env, url, adminRoute);
      }

      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch (error) {
      console.error(error);
      return json({ message: "Serverda kutilmagan xatolik yuz berdi." }, 500);
    }
  }
};

async function serveAdminIndex(request, env, adminRoute) {
  const assetUrl = new URL("/admin/index.html", request.url);
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl, request));
  const template = await assetResponse.text();
  const html = template.replaceAll("__ADMIN_ROUTE__", adminRoute);

  return withSecurityHeaders(
    new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    }),
    {
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  );
}

async function serveAdminAsset(request, env, url, adminRoute) {
  const relativePath = url.pathname.slice(adminRoute.length);
  const assetUrl = new URL(`/admin${relativePath}`, url.origin);

  return withSecurityHeaders(
    await env.ASSETS.fetch(new Request(assetUrl, request)),
    {
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  );
}

async function handleApi(request, env, url) {
  const method = request.method.toUpperCase();
  const session = await readSignedSession(getCookie(request, ADMIN_COOKIE_NAME), env);

  if (method === "GET" && url.pathname === "/api/site-content") {
    const content = await getSiteContent(env);
    return json({ data: content });
  }

  if (method === "POST" && url.pathname === "/api/assistant/chat") {
    const body = await readJson(request);
    const messages = normalizeChatMessages(body.messages);

    if (!messages.length) {
      return json({ message: "Kamida bitta xabar yuborilishi kerak." }, 400);
    }

    const content = await getSiteContent(env);
    const result = await generateAssistantReply(messages, content, env);

    return json({ data: result });
  }

  if (method === "POST" && url.pathname === "/api/appointments") {
    const body = await readJson(request);
    const payload = {
      deviceId: cleanText(body.deviceId, 120),
      fullName: cleanText(body.fullName, 120),
      phone: cleanText(body.phone, 40),
      email: cleanText(body.email, 120),
      organization: cleanText(body.organization, 120),
      meetingType: cleanText(body.meetingType, 80),
      preferredDate: cleanText(body.preferredDate, 40),
      note: cleanText(body.note, 1200)
    };

    if (!payload.fullName || !payload.phone || !payload.meetingType || !payload.preferredDate) {
      return json({ message: "Ism, telefon, uchrashuv turi va sana majburiy." }, 400);
    }

    const created = await createAppointment(env, payload);
    return json(
      {
        message: "Uchrashuv so'rovi qabul qilindi.",
        data: created
      },
      201
    );
  }

  if (method === "POST" && url.pathname === "/api/applications") {
    const body = await readJson(request);
    const payload = {
      deviceId: cleanText(body.deviceId, 120),
      fullName: cleanText(body.fullName, 120),
      phone: cleanText(body.phone, 40),
      email: cleanText(body.email, 120),
      selectedProgram: cleanText(body.selectedProgram, 140),
      portfolioLink: cleanText(body.portfolioLink, 240),
      message: cleanText(body.message, 2000)
    };

    if (!payload.deviceId || !payload.fullName || !payload.phone || !payload.selectedProgram || !payload.message) {
      return json({ message: "Device ID, ism, telefon, yo'nalish va loyiha matni majburiy." }, 400);
    }

    const created = await createApplication(env, payload);
    return json(
      {
        message: "Ariza muvaffaqiyatli yuborildi.",
        data: created
      },
      201
    );
  }

  if (method === "GET" && url.pathname === "/api/applications/status") {
    const deviceId = cleanText(url.searchParams.get("deviceId"), 120);

    if (!deviceId) {
      return json({ message: "Device ID kiritilishi kerak." }, 400);
    }

    const applications = await getApplicationsByDeviceId(env, deviceId);
    return json({
      data: applications.map(toPublicApplication)
    });
  }

  if (method === "POST" && url.pathname === "/api/admin/login") {
    const ip = getClientIp(request);
    const state = getLoginAttemptState(ip);

    if (state.lockedUntil && state.lockedUntil > Date.now()) {
      return json({ message: "Juda ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring." }, 429);
    }

    const body = await readJson(request);
    const username = cleanText(body.username, 80);
    const password = cleanText(body.password, 120);
    const expectedUsername = cleanText(env.ADMIN_USERNAME || "superadmin", 80);
    const expectedPassword = cleanText(env.ADMIN_PASSWORD || "ChangeMe_2026!", 120);

    if (username !== expectedUsername || password !== expectedPassword) {
      recordFailedLogin(ip);
      return json({ message: "Kirish ma'lumotlari noto'g'ri." }, 401);
    }

    clearLoginAttempts(ip);
    const token = await createSignedSession(username, env);

    return json(
      {
        message: "Admin panelga kirildi.",
        user: { username }
      },
      200,
      {
        "Set-Cookie": serializeCookie(ADMIN_COOKIE_NAME, token, {
          maxAge: SESSION_DURATION_MS,
          secure: url.protocol === "https:"
        })
      }
    );
  }

  if (method === "POST" && url.pathname === "/api/admin/logout") {
    return json(
      {
        message: "Sessiya yopildi."
      },
      200,
      {
        "Set-Cookie": `${serializeCookie(ADMIN_COOKIE_NAME, "", {
          maxAge: 0,
          secure: url.protocol === "https:"
        })}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
      }
    );
  }

  if (method === "GET" && url.pathname === "/api/admin/session") {
    return json({
      authenticated: Boolean(session),
      user: session ? { username: session.username } : null
    });
  }

  if (!session && url.pathname.startsWith("/api/admin/")) {
    return json({ message: "Admin sessiyasi kerak." }, 401);
  }

  if (method === "GET" && url.pathname === "/api/admin/applications") {
    return json({
      data: await getAllApplications(env)
    });
  }

  const applicationMatch = url.pathname.match(/^\/api\/admin\/applications\/([^/]+)$/);

  if (method === "PATCH" && applicationMatch) {
    const body = await readJson(request);
    const updated = await updateApplication(env, applicationMatch[1], {
      status: cleanText(body.status, 40),
      adminNote: cleanText(body.adminNote, 2000)
    });

    if (!updated) {
      return json({ message: "Ariza topilmadi." }, 404);
    }

    return json({
      message: "Ariza yangilandi.",
      data: updated
    });
  }

  if (method === "GET" && url.pathname === "/api/admin/appointments") {
    return json({
      data: await getAllAppointments(env)
    });
  }

  const appointmentMatch = url.pathname.match(/^\/api\/admin\/appointments\/([^/]+)$/);

  if (method === "PATCH" && appointmentMatch) {
    const body = await readJson(request);
    const updated = await updateAppointment(env, appointmentMatch[1], {
      status: cleanText(body.status, 40),
      adminNote: cleanText(body.adminNote, 2000)
    });

    if (!updated) {
      return json({ message: "Uchrashuv topilmadi." }, 404);
    }

    return json({
      message: "Uchrashuv yangilandi.",
      data: updated
    });
  }

  if (method === "PUT" && url.pathname === "/api/admin/site-content") {
    const body = await readJson(request);
    const nextContent = normalizeSiteContent(body);
    const saved = await saveSiteContent(env, nextContent);
    return json({
      message: "Sayt ma'lumotlari saqlandi.",
      data: saved
    });
  }

  if (method === "POST" && url.pathname === "/api/admin/upload") {
    const hasCloudinary = Boolean(
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
    );

    if (!hasCloudinary) {
      return json({ message: "Cloudinary sozlamalari Cloudflare secretlarida to'ldirilmagan." }, 400);
    }

    const formData = await request.formData();
    const file = formData.get("media");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ message: "Media fayli tanlanmagan." }, 400);
    }

    if (!(String(file.type || "").startsWith("image/") || String(file.type || "").startsWith("video/"))) {
      return json({ message: "Faqat rasm va video fayllari qabul qilinadi." }, 400);
    }

    if (Number(file.size || 0) > 50 * 1024 * 1024) {
      return json({ message: "Fayl hajmi 50MB dan oshmasligi kerak." }, 400);
    }

    const result = await uploadToCloudinary(file, env);

    return json({
      message: "Media Cloudinary ga yuklandi.",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type
      }
    });
  }

  return json({ message: "API endpoint topilmadi." }, 404);
}

function withSecurityHeaders(response, extraHeaders = {}) {
  const next = new Response(response.body, response);

  next.headers.set("X-Content-Type-Options", "nosniff");
  next.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  for (const [key, value] of Object.entries(extraHeaders)) {
    next.headers.set(key, value);
  }

  return next;
}

function json(payload, status = 200, extraHeaders = {}) {
  return withSecurityHeaders(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...extraHeaders
      }
    })
  );
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

function getCookie(request, name) {
  const source = request.headers.get("Cookie") || "";
  const parts = source.split(/;\s*/);

  for (const part of parts) {
    const [key, ...rest] = part.split("=");

    if (key === name) {
      return rest.join("=");
    }
  }

  return "";
}

function serializeCookie(name, value, options = {}) {
  const maxAgeMs = Number(options.maxAge || 0);
  const maxAgeSeconds = Math.max(0, Math.floor(maxAgeMs / 1000));

  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    options.secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ");
}

async function createSignedSession(username, env) {
  const payload = {
    username,
    expiresAt: Date.now() + SESSION_DURATION_MS
  };

  const encoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacBase64Url(encoded, env.SESSION_SECRET || "local-dev-session-secret");
  return `${encoded}.${signature}`;
}

async function readSignedSession(token, env) {
  const [encoded, signature] = String(token || "").split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = await hmacBase64Url(encoded, env.SESSION_SECRET || "local-dev-session-secret");

  if (signature !== expected) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded));

    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  );
}

function getLoginAttemptState(ip) {
  const current = loginAttempts.get(ip);

  if (!current) {
    return {
      count: 0,
      firstAttemptAt: 0,
      lockedUntil: 0
    };
  }

  if (Date.now() - current.firstAttemptAt > LOGIN_WINDOW_MS && current.lockedUntil < Date.now()) {
    loginAttempts.delete(ip);
    return {
      count: 0,
      firstAttemptAt: 0,
      lockedUntil: 0
    };
  }

  return current;
}

function recordFailedLogin(ip) {
  const state = getLoginAttemptState(ip);
  const nextCount = state.count + 1;

  loginAttempts.set(ip, {
    count: nextCount,
    firstAttemptAt: state.firstAttemptAt || Date.now(),
    lockedUntil: nextCount >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOGIN_WINDOW_MS : 0
  });
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: cleanText(item.content, 1800)
    }))
    .filter((item) => item.content);
}

function buildSiteAssistantPrompt(content) {
  const directions = (content.directions?.items || [])
    .map((item) => `${item.title}${item.category ? ` (${item.category})` : ""}: ${item.description}`)
    .join("; ");
  const applicationOptions = (content.applicationSection?.applicationOptions || []).join(", ");
  const meetingTypes = (content.appointmentSection?.meetingTypes || []).join(", ");
  const timeline = (content.timelineSection?.items || [])
    .map((item) => `${item.step}. ${item.title} - ${item.description}`)
    .join("; ");
  const faq = (content.faqSection?.items || [])
    .slice(0, 6)
    .map((item) => `Savol: ${item.question} Javob: ${item.answer}`)
    .join("; ");

  return [
    `You are Aziz online, the public-facing HALLAYM AI assistant for ${content.general.organizationName}.`,
    "Always reply in Uzbek Latin unless the user clearly uses another language.",
    "Be warm, concise, practical and speak like a real helpful human assistant.",
    "Only use the public website information provided below. Do not invent admissions rules, fees or guarantees.",
    "If the user wants to submit something, guide them to the relevant website section instead of claiming you submitted it.",
    "Mention Device ID when users ask about application results or tracking.",
    `Organization tagline: ${content.general.tagline}.`,
    `Hero summary: ${content.hero.description}.`,
    `Directions: ${directions || "Yo'nalishlar tez orada yangilanadi."}`,
    `Application options: ${applicationOptions || "Admin panel orqali boshqariladi."}`,
    `Meeting types: ${meetingTypes || "Admin panel orqali boshqariladi."}`,
    `Timeline: ${timeline || "Bosqichlar admin panel orqali yangilanadi."}`,
    `FAQ: ${faq || "FAQ ma'lumotlari admin panel orqali yangilanadi."}`,
    `Contact: address ${content.contact.address}; phone ${content.contact.phone}; email ${content.contact.email}; working hours ${content.contact.workingHours}.`,
    "Keep answers compact, typically 2-5 sentences, and end with a concrete next step when useful."
  ].join("\n");
}

function buildFallbackAssistantReply(userMessage, content) {
  const query = String(userMessage || "").toLowerCase();
  const directionList = (content.directions?.items || []).map((item) => item.title).filter(Boolean);

  if (query.includes("status") || query.includes("natija") || query.includes("device")) {
    return `${content.statusSection.title}. ${content.statusSection.description} ${content.statusSection.helperText}`;
  }

  if (query.includes("uchrashuv") || query.includes("meeting") || query.includes("suhbat")) {
    return `${content.appointmentSection.title}. ${content.appointmentSection.description} Mavjud formatlar: ${(content.appointmentSection.meetingTypes || []).join(", ")}.`;
  }

  if (query.includes("ariza") || query.includes("topshir")) {
    return `${content.applicationSection.title}. ${content.applicationSection.description} Mavjud yo'nalishlar: ${(content.applicationSection.applicationOptions || []).join(", ")}.`;
  }

  if (query.includes("yo'nalish") || query.includes("dastur") || query.includes("kurs")) {
    return directionList.length
      ? `Asosiy yo'nalishlar: ${directionList.join(", ")}. Batafsil tavsiflar "Yo'nalishlar" bo'limida berilgan.`
      : "Yo'nalishlar bo'limi admin panel orqali boshqariladi va public sahifada ko'rsatiladi.";
  }

  if (query.includes("aloqa") || query.includes("telefon") || query.includes("manzil") || query.includes("email")) {
    return `Aloqa uchun telefon: ${content.contact.phone}, email: ${content.contact.email}, manzil: ${content.contact.address}. Ish vaqti: ${content.contact.workingHours}.`;
  }

  return `Assalomu alaykum. Men Aziz online. Sizga ariza, uchrashuv, yo'nalishlar va Device ID bo'yicha yordam bera olaman. Zarur bo'lsa aloqa ma'lumotlari: ${content.contact.phone}, ${content.contact.email}.`;
}

async function generateAssistantReply(messages, content, env) {
  const lastUserMessage = [...messages].reverse().find((item) => item.role === "user")?.content || "";
  const fallbackReply = buildFallbackAssistantReply(lastUserMessage, content);
  const apiKey = cleanText(env.GROQ_API_KEY, 240);

  if (!apiKey) {
    return {
      reply: fallbackReply,
      mode: "fallback"
    };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 420,
        messages: [
          {
            role: "system",
            content: buildSiteAssistantPrompt(content)
          },
          ...messages
        ]
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error?.message || "Groq javobi olinmadi.");
    }

    const reply = cleanText(payload?.choices?.[0]?.message?.content, 5000);

    if (!reply) {
      throw new Error("Bo'sh javob qaytdi.");
    }

    return {
      reply,
      mode: "groq"
    };
  } catch (error) {
    return {
      reply: fallbackReply,
      mode: "fallback"
    };
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, patch) {
  if (Array.isArray(base)) {
    return Array.isArray(patch) ? patch : base;
  }

  if (!isPlainObject(base)) {
    return patch === undefined ? base : patch;
  }

  const result = { ...base };

  for (const key of Object.keys(base)) {
    const baseValue = base[key];
    const patchValue = patch ? patch[key] : undefined;

    if (Array.isArray(baseValue)) {
      result[key] = Array.isArray(patchValue) ? patchValue : baseValue;
      continue;
    }

    if (isPlainObject(baseValue)) {
      result[key] = deepMerge(baseValue, patchValue || {});
      continue;
    }

    result[key] = patchValue === undefined ? baseValue : patchValue;
  }

  if (patch && isPlainObject(patch)) {
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in result)) {
        result[key] = value;
      }
    }
  }

  return result;
}

function normalizeSiteContent(nextPayload) {
  return deepMerge(deepClone(defaultSiteContent), nextPayload || {});
}

async function withDatabase(env, action, fallback) {
  if (!env.DB) {
    return await fallback();
  }

  try {
    return await action(env.DB);
  } catch (error) {
    console.error("D1 operation failed, memory mode ishlayapti.", error);
    return await fallback();
  }
}

async function ensureSiteContentExists(env) {
  return withDatabase(
    env,
    async (db) => {
      const existing = await db.prepare("SELECT key FROM site_content WHERE key = ?").bind("main").first();

      if (!existing) {
        await db
          .prepare("INSERT INTO site_content (key, payload, updated_at) VALUES (?, ?, ?)")
          .bind("main", JSON.stringify(defaultSiteContent), new Date().toISOString())
          .run();
      }
    },
    async () => {
      memoryStore.siteContent = normalizeSiteContent(memoryStore.siteContent);
    }
  );
}

async function getSiteContent(env) {
  await ensureSiteContentExists(env);

  return withDatabase(
    env,
    async (db) => {
      const row = await db.prepare("SELECT payload FROM site_content WHERE key = ?").bind("main").first();
      return normalizeSiteContent(row ? JSON.parse(row.payload) : defaultSiteContent);
    },
    async () => normalizeSiteContent(memoryStore.siteContent)
  );
}

async function saveSiteContent(env, payload) {
  const normalized = normalizeSiteContent(payload);

  return withDatabase(
    env,
    async (db) => {
      await db
        .prepare(
          "INSERT INTO site_content (key, payload, updated_at) VALUES (?, ?, ?) " +
            "ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at"
        )
        .bind("main", JSON.stringify(normalized), new Date().toISOString())
        .run();

      return normalized;
    },
    async () => {
      memoryStore.siteContent = normalized;
      return normalized;
    }
  );
}

function buildTrackingCode(prefix) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomBytes = crypto.getRandomValues(new Uint8Array(2));
  const randomPart = Array.from(randomBytes, (value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

function toAdminApplication(record) {
  return {
    id: String(record.id || ""),
    trackingCode: record.trackingCode || record.tracking_code,
    deviceId: record.deviceId || record.device_id,
    fullName: record.fullName || record.full_name,
    phone: record.phone,
    email: record.email,
    selectedProgram: record.selectedProgram || record.selected_program,
    portfolioLink: record.portfolioLink || record.portfolio_link,
    message: record.message,
    status: record.status,
    adminNote: record.adminNote || record.admin_note || "",
    createdAt: record.createdAt || record.created_at,
    updatedAt: record.updatedAt || record.updated_at
  };
}

function toPublicApplication(record) {
  const normalized = toAdminApplication(record);

  return {
    id: normalized.id,
    trackingCode: normalized.trackingCode,
    selectedProgram: normalized.selectedProgram,
    status: normalized.status,
    adminNote: normalized.adminNote,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt
  };
}

function toAdminAppointment(record) {
  return {
    id: String(record.id || ""),
    trackingCode: record.trackingCode || record.tracking_code,
    deviceId: record.deviceId || record.device_id || "",
    fullName: record.fullName || record.full_name,
    phone: record.phone,
    email: record.email,
    organization: record.organization || "",
    meetingType: record.meetingType || record.meeting_type,
    preferredDate: record.preferredDate || record.preferred_date,
    note: record.note || "",
    status: record.status,
    adminNote: record.adminNote || record.admin_note || "",
    createdAt: record.createdAt || record.created_at,
    updatedAt: record.updatedAt || record.updated_at
  };
}

async function createApplication(env, payload) {
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    trackingCode: buildTrackingCode("APP"),
    deviceId: payload.deviceId,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email || "",
    selectedProgram: payload.selectedProgram,
    portfolioLink: payload.portfolioLink || "",
    message: payload.message,
    status: "submitted",
    adminNote: "",
    createdAt: now,
    updatedAt: now
  };

  return withDatabase(
    env,
    async (db) => {
      await db
        .prepare(
          "INSERT INTO applications (id, tracking_code, device_id, full_name, phone, email, selected_program, portfolio_link, message, status, admin_note, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          record.id,
          record.trackingCode,
          record.deviceId,
          record.fullName,
          record.phone,
          record.email,
          record.selectedProgram,
          record.portfolioLink,
          record.message,
          record.status,
          record.adminNote,
          record.createdAt,
          record.updatedAt
        )
        .run();

      return toAdminApplication(record);
    },
    async () => {
      memoryStore.applications.unshift(record);
      return toAdminApplication(record);
    }
  );
}

async function getApplicationsByDeviceId(env, deviceId) {
  return withDatabase(
    env,
    async (db) => {
      const result = await db
        .prepare("SELECT * FROM applications WHERE device_id = ? ORDER BY created_at DESC")
        .bind(deviceId)
        .all();

      return (result.results || []).map(toAdminApplication);
    },
    async () =>
      memoryStore.applications
        .filter((item) => item.deviceId === deviceId)
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .map(toAdminApplication)
  );
}

async function getAllApplications(env) {
  return withDatabase(
    env,
    async (db) => {
      const result = await db.prepare("SELECT * FROM applications ORDER BY created_at DESC").all();
      return (result.results || []).map(toAdminApplication);
    },
    async () =>
      memoryStore.applications
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .map(toAdminApplication)
  );
}

async function updateApplication(env, id, changes) {
  return withDatabase(
    env,
    async (db) => {
      const existing = await db.prepare("SELECT * FROM applications WHERE id = ?").bind(id).first();

      if (!existing) {
        return null;
      }

      const nextStatus = changes.status || existing.status;
      const nextAdminNote = changes.adminNote || "";
      const updatedAt = new Date().toISOString();

      await db
        .prepare("UPDATE applications SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?")
        .bind(nextStatus, nextAdminNote, updatedAt, id)
        .run();

      return toAdminApplication({
        ...existing,
        status: nextStatus,
        admin_note: nextAdminNote,
        updated_at: updatedAt
      });
    },
    async () => {
      const index = memoryStore.applications.findIndex((item) => item.id === id);

      if (index === -1) {
        return null;
      }

      const current = memoryStore.applications[index];
      const updated = {
        ...current,
        status: changes.status || current.status,
        adminNote: changes.adminNote || "",
        updatedAt: new Date().toISOString()
      };

      memoryStore.applications[index] = updated;
      return toAdminApplication(updated);
    }
  );
}

async function createAppointment(env, payload) {
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    trackingCode: buildTrackingCode("MEET"),
    deviceId: payload.deviceId || "",
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email || "",
    organization: payload.organization || "",
    meetingType: payload.meetingType,
    preferredDate: payload.preferredDate,
    note: payload.note || "",
    status: "new",
    adminNote: "",
    createdAt: now,
    updatedAt: now
  };

  return withDatabase(
    env,
    async (db) => {
      await db
        .prepare(
          "INSERT INTO appointments (id, tracking_code, device_id, full_name, phone, email, organization, meeting_type, preferred_date, note, status, admin_note, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          record.id,
          record.trackingCode,
          record.deviceId,
          record.fullName,
          record.phone,
          record.email,
          record.organization,
          record.meetingType,
          record.preferredDate,
          record.note,
          record.status,
          record.adminNote,
          record.createdAt,
          record.updatedAt
        )
        .run();

      return toAdminAppointment(record);
    },
    async () => {
      memoryStore.appointments.unshift(record);
      return toAdminAppointment(record);
    }
  );
}

async function getAllAppointments(env) {
  return withDatabase(
    env,
    async (db) => {
      const result = await db.prepare("SELECT * FROM appointments ORDER BY created_at DESC").all();
      return (result.results || []).map(toAdminAppointment);
    },
    async () =>
      memoryStore.appointments
        .slice()
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .map(toAdminAppointment)
  );
}

async function updateAppointment(env, id, changes) {
  return withDatabase(
    env,
    async (db) => {
      const existing = await db.prepare("SELECT * FROM appointments WHERE id = ?").bind(id).first();

      if (!existing) {
        return null;
      }

      const nextStatus = changes.status || existing.status;
      const nextAdminNote = changes.adminNote || "";
      const updatedAt = new Date().toISOString();

      await db
        .prepare("UPDATE appointments SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?")
        .bind(nextStatus, nextAdminNote, updatedAt, id)
        .run();

      return toAdminAppointment({
        ...existing,
        status: nextStatus,
        admin_note: nextAdminNote,
        updated_at: updatedAt
      });
    },
    async () => {
      const index = memoryStore.appointments.findIndex((item) => item.id === id);

      if (index === -1) {
        return null;
      }

      const current = memoryStore.appointments[index];
      const updated = {
        ...current,
        status: changes.status || current.status,
        adminNote: changes.adminNote || "",
        updatedAt: new Date().toISOString()
      };

      memoryStore.appointments[index] = updated;
      return toAdminAppointment(updated);
    }
  );
}

async function uploadToCloudinary(file, env) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = cleanText(env.CLOUDINARY_FOLDER || "qarshi-texnopark", 120);
  const signatureBase = [`folder=${folder}`, `timestamp=${timestamp}`].join("&");
  const signature = await sha1Hex(`${signatureBase}${env.CLOUDINARY_API_SECRET}`);
  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", env.CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Cloudinary yuklashida xatolik yuz berdi.");
  }

  return payload;
}

async function hmacBase64Url(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function sha1Hex(value) {
  const digest = await crypto.subtle.digest("SHA-1", encoder.encode(value));

  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

function base64UrlEncode(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}
