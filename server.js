const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const cloudinary = require("cloudinary").v2;

require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const ADMIN_DIR = path.join(ROOT_DIR, "admin");
const ADMIN_COOKIE_NAME = "qyt_admin_session";
const ADMIN_SLUG = (process.env.ADMIN_SLUG || "ef3190c0fee63c12").trim();
const ADMIN_ROUTE = `/${ADMIN_SLUG}`;
const SESSION_SECRET = process.env.SESSION_SECRET || "local-dev-session-secret";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const MAX_LOGIN_ATTEMPTS = 6;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024
  }
});

const configuredMongo = Boolean(process.env.MONGODB_URI);
let mongoEnabled = configuredMongo;
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const loginAttempts = new Map();

const DEFAULT_SITE_CONTENT = {
  general: {
    organizationName: "Qarshi Yoshlar Texnoparki",
    organizationShortName: "Qarshi Texnopark",
    tagline: "Innovatsiya, ta'lim va startaplarni birlashtiruvchi zamonaviy markaz",
    metaDescription:
      "Qarshi Yoshlar Texnoparki uchun premium light dizayndagi rasmiy platforma. Uchrashuv belgilash, ariza topshirish va device ID orqali natijani ko'rish funksiyalari bilan."
  },
  hero: {
    eyebrow: "Qashqadaryo yoshlariga yangi avlod texnoparki",
    title: "Kelajak kasblari, startaplar va innovatsiyalar uchun premium raqamli makon",
    highlight: "ta'lim, mentorlik va real loyihalar",
    description:
      "Qarshi Yoshlar Texnoparki yoshlar, hamkorlar va investorlar uchun yagona raqamli kirish nuqtasi bo'lib, ariza, uchrashuv va axborot boshqaruvini birlashtiradi.",
    primaryActionLabel: "Ariza topshirish",
    primaryActionLink: "#application",
    secondaryActionLabel: "Uchrashuv belgilash",
    secondaryActionLink: "#meeting",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    cardTitle: "Texnopark boshqaruvi va imkoniyatlari bitta platformada",
    cardDescription:
      "Talabgorlar uchun qulay murojaat oqimi, admin uchun yashirin boshqaruv paneli va media kontentni Cloudinary orqali yuritish tizimi."
  },
  trustItems: [
    "Rasmiy va premium taqdimot",
    "Device ID asosida natijani ko'rish",
    "Admin uchun to'liq kontent boshqaruvi",
    "MongoDB bilan markazlashgan ma'lumotlar",
    "Cloudinary orqali media boshqaruvi"
  ],
  heroSpotlights: [
    {
      value: "12+",
      label: "yo'nalish va dasturlar"
    },
    {
      value: "1500+",
      label: "qamrab olinadigan yoshlar"
    },
    {
      value: "24/7",
      label: "raqamli murojaat va monitoring"
    }
  ],
  about: {
    tag: "Markaz haqida",
    title: "Yoshlar salohiyatini texnologiya, kreativ sanoat va amaliy mentorlik bilan birlashtiruvchi platforma",
    description:
      "Mazkur sayt rasmiy ishonchlilikni zamonaviy premium ko'rinish bilan uyg'unlashtiradi. Har bir bo'lim admin panel orqali yangilanadi, foydalanuvchilar esa ro'yxatdan o'tmasdan qurilma ID yordamida o'z ariza natijasini kuzata oladi.",
    imageA:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    imageB:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    badgeTitle: "Yagona boshqaruv nuqtasi",
    badgeText:
      "Kontent, yangiliklar, uchrashuvlar, arizalar va natijalar bitta boshqaruv panelidan tahrir qilinadi.",
    features: [
      "Node.js API va MongoDB asosidagi barqaror backend",
      "Cloudinary bilan rasm va media havolalarini boshqarish",
      "Ko'rinmaydigan admin kirishi va maxfiy slug",
      "Ariza natijasini device ID bilan tekshirish",
      "Premium light UI va mobilga mos layout"
    ]
  },
  directions: {
    tag: "Asosiy yo'nalishlar",
    title: "Qarshi Yoshlar Texnoparki uchun ustuvor dasturlar",
    description:
      "Saytning bu bo'limi admin orqali to'liq tahrirlanadi va kerak bo'lsa yangi yo'nalishlar soniyasida qo'shiladi.",
    items: [
      {
        icon: "AI",
        title: "Sun'iy intellekt va dasturlash",
        description: "Web, backend, AI, data va avtomatlashtirish bo'yicha amaliy o'quv dasturlari."
      },
      {
        icon: "STEM",
        title: "Robototexnika va muhandislik",
        description: "Prototiplash, konstruktorlik va apparat yechimlari ustida ishlash maydoni."
      },
      {
        icon: "MEDIA",
        title: "Digital media va dizayn",
        description: "Grafik dizayn, motion, SMM va kontent ishlab chiqish uchun kreativ laboratoriya."
      },
      {
        icon: "START",
        title: "Startap inkubatsiya",
        description: "G'oyalarni biznes modelga aylantirish, pitch va mentorlik jarayoni."
      }
    ]
  },
  projects: {
    tag: "Tanlangan loyihalar",
    title: "Markaz faoliyatini ko'rsatuvchi media va case study bloklari",
    description:
      "Cloudinary orqali yuklangan rasmlar va admin paneldan boshqariladigan loyiha kartalari premium ko'rinishda taqdim etiladi.",
    items: [
      {
        category: "Flagship",
        title: "Kelajak kasblari rezidentura dasturi",
        summary: "Yoshlarni dasturlash, dizayn va startap yo'nalishlariga bosqichma-bosqich olib kiruvchi asosiy dastur.",
        image:
          "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80",
        featured: true
      },
      {
        category: "STEM",
        title: "Robototexnika laboratoriyasi",
        summary: "Amaliy sensorlar, mikrokontrollerlar va real qurilmalar bilan tajriba maydoni.",
        image:
          "https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=1200&q=80",
        featured: false
      },
      {
        category: "Analytics",
        title: "Ma'lumotlar tahlili va dashboard",
        summary: "Hududiy tashabbus va o'quv jarayonini kuzatish uchun data-driven boshqaruv paneli.",
        image:
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
        featured: false
      },
      {
        category: "Startup",
        title: "Demo day va investor uchrashuvlari",
        summary: "Iqtidorli jamoalarni taqdimot, mentorlik va hamkorlik bilan bog'laydigan dastur.",
        image:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
        featured: false
      }
    ]
  },
  metrics: [
    {
      value: "18+",
      label: "zamonaviy laboratoriya va zonalar"
    },
    {
      value: "60+",
      label: "mentor va amaliy trenerlar"
    },
    {
      value: "120+",
      label: "workshop, demo va tadbirlar"
    },
    {
      value: "95%",
      label: "foydalanuvchi tajribasi uchun maqsad"
    }
  ],
  news: {
    tag: "Yangiliklar",
    title: "Texnopark e'lonlari va rasmiy yangilanishlar",
    description:
      "Yangiliklar bo'limi admin panel orqali bir zumda yangilanadi va public sahifada avtomatik chiqadi.",
    items: [
      {
        date: "30 Mart 2026",
        title: "Yoshlar uchun yangi AI va backend intensivi ochildi",
        description: "Hududdagi iqtidorli yoshlar uchun zamonaviy amaliy dastur ishga tushirildi.",
        link: "#application"
      },
      {
        date: "26 Mart 2026",
        title: "Hamkor tashkilotlar bilan uchrashuv haftaligi boshlandi",
        description: "Ta'lim va xususiy sektor vakillari uchun maxsus uchrashuvlar taqvimi shakllantirildi.",
        link: "#meeting"
      },
      {
        date: "18 Mart 2026",
        title: "Startaplar uchun saralash arizalari qabul qilinmoqda",
        description: "Talabgorlar sayt orqali ariza yuborib, qurilma ID bilan natijasini kuzatishi mumkin.",
        link: "#status"
      }
    ]
  },
  appointmentSection: {
    tag: "Uchrashuv belgilash",
    title: "Rahbariyat yoki loyiha jamoasi bilan uchrashuv so'rang",
    description:
      "Hamkorlik, taqdimot, mentorlik yoki tashrif bo'yicha uchrashuv yuboring. So'rov admin panelga tushadi va status yangilanadi.",
    note: "Ish kuni ichida javob beriladi. Zarur bo'lsa admin siz bilan aloqa qiladi.",
    meetingTypes: ["Hamkorlik", "Mentorlik", "Loyiha taqdimoti", "Tashrif rejalashtirish"]
  },
  applicationSection: {
    tag: "Ariza topshirish",
    title: "Texnopark dasturlariga ro'yxatdan o'tish uchun forma yuboring",
    description:
      "Ro'yxatdan o'tishsiz ishlaydigan qulay oqim: foydalanuvchi qurilmasi uchun noyob ID yaratiladi va shu ID orqali ariza natijasi kuzatiladi.",
    helperText:
      "Ariza yuborilgach, device ID saqlanadi va keyin status tekshirish bo'limida avtomatik foydalaniladi.",
    applicationOptions: [
      "Sun'iy intellekt va dasturlash",
      "Robototexnika va muhandislik",
      "Digital media va dizayn",
      "Startap inkubatsiya"
    ]
  },
  statusSection: {
    tag: "Ariza natijasi",
    title: "Device ID orqali arizalaringiz statusini ko'ring",
    description:
      "Tizim qurilmangiz uchun ID yaratadi. Shu ID orqali barcha yuborilgan arizalar va admin tomonidan yangilangan natijalar ko'rsatiladi.",
    helperText:
      "Agar boshqa brauzer yoki qurilmadan kirsangiz, avvalgi device ID ni shu yerga kiritib tekshirishingiz mumkin."
  },
  contact: {
    title: "Qarshi Yoshlar Texnoparki bilan bog'lanish",
    description:
      "Sayt kontenti, uchrashuvlar va ariza oqimlari markazlashtirilgan. Zarur hollarda bevosita aloqa ma'lumotlaridan ham foydalanishingiz mumkin.",
    address: "Qarshi shahri, innovatsion rivojlanish hududi",
    phone: "+998 90 000 00 00",
    email: "info@texnopark.uz",
    workingHours: "Dushanba - Shanba, 09:00 - 18:00",
    mapLink: "https://maps.google.com",
    telegram: "https://t.me/qarshiyoshlortexnopark",
    instagram: "https://instagram.com/qarshiyoshlortexnopark"
  }
};

const SiteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const ApplicationSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      unique: true,
      required: true
    },
    deviceId: {
      type: String,
      index: true,
      required: true
    },
    fullName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ""
    },
    selectedProgram: {
      type: String,
      required: true
    },
    portfolioLink: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["submitted", "reviewing", "approved", "rejected", "waiting_list"],
      default: "submitted"
    },
    adminNote: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const AppointmentSchema = new mongoose.Schema(
  {
    trackingCode: {
      type: String,
      unique: true,
      required: true
    },
    deviceId: {
      type: String,
      index: true,
      default: ""
    },
    fullName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      default: ""
    },
    organization: {
      type: String,
      default: ""
    },
    meetingType: {
      type: String,
      required: true
    },
    preferredDate: {
      type: String,
      required: true
    },
    note: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["new", "contacted", "confirmed", "completed", "cancelled"],
      default: "new"
    },
    adminNote: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

const SiteContent = mongoose.model("SiteContent", SiteContentSchema);
const Application = mongoose.model("Application", ApplicationSchema);
const Appointment = mongoose.model("Appointment", AppointmentSchema);

const memoryStore = {
  siteContent: deepClone(DEFAULT_SITE_CONTENT),
  applications: [],
  appointments: []
};

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

app.disable("x-powered-by");
app.use(express.json({ limit: "3mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use((req, res, next) => {
  const token = req.cookies[ADMIN_COOKIE_NAME];
  req.adminSession = token ? readSignedSession(token) : null;
  next();
});

app.get("/api/site-content", async (req, res, next) => {
  try {
    const content = await getSiteContent();
    res.json({
      data: content
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/appointments", async (req, res, next) => {
  try {
    const payload = {
      deviceId: cleanText(req.body.deviceId, 120),
      fullName: cleanText(req.body.fullName, 120),
      phone: cleanText(req.body.phone, 40),
      email: cleanText(req.body.email, 120),
      organization: cleanText(req.body.organization, 120),
      meetingType: cleanText(req.body.meetingType, 80),
      preferredDate: cleanText(req.body.preferredDate, 40),
      note: cleanText(req.body.note, 1200)
    };

    if (!payload.fullName || !payload.phone || !payload.meetingType || !payload.preferredDate) {
      return res.status(400).json({
        message: "Ism, telefon, uchrashuv turi va sana majburiy."
      });
    }

    const created = await createAppointment(payload);
    res.status(201).json({
      message: "Uchrashuv so'rovi qabul qilindi.",
      data: created
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/applications", async (req, res, next) => {
  try {
    const payload = {
      deviceId: cleanText(req.body.deviceId, 120),
      fullName: cleanText(req.body.fullName, 120),
      phone: cleanText(req.body.phone, 40),
      email: cleanText(req.body.email, 120),
      selectedProgram: cleanText(req.body.selectedProgram, 140),
      portfolioLink: cleanText(req.body.portfolioLink, 240),
      message: cleanText(req.body.message, 2000)
    };

    if (!payload.deviceId || !payload.fullName || !payload.phone || !payload.selectedProgram || !payload.message) {
      return res.status(400).json({
        message: "Device ID, ism, telefon, yo'nalish va loyiha matni majburiy."
      });
    }

    const created = await createApplication(payload);
    res.status(201).json({
      message: "Ariza muvaffaqiyatli yuborildi.",
      data: created
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/applications/status", async (req, res, next) => {
  try {
    const deviceId = cleanText(req.query.deviceId, 120);

    if (!deviceId) {
      return res.status(400).json({
        message: "Device ID kiritilishi kerak."
      });
    }

    const applications = await getApplicationsByDeviceId(deviceId);
    res.json({
      data: applications.map(toPublicApplication)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", async (req, res) => {
  const ip = req.ip || "unknown";
  const state = getLoginAttemptState(ip);

  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return res.status(429).json({
      message: "Juda ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring."
    });
  }

  const username = cleanText(req.body.username, 80);
  const password = cleanText(req.body.password, 120);

  if (
    username !== (process.env.ADMIN_USERNAME || "superadmin") ||
    password !== (process.env.ADMIN_PASSWORD || "ChangeMe_2026!")
  ) {
    recordFailedLogin(ip);
    return res.status(401).json({
      message: "Kirish ma'lumotlari noto'g'ri."
    });
  }

  clearLoginAttempts(ip);

  res.cookie(ADMIN_COOKIE_NAME, createSignedSession(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: SESSION_DURATION_MS
  });

  return res.json({
    message: "Admin panelga kirildi.",
    user: {
      username
    }
  });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({
    message: "Sessiya yopildi."
  });
});

app.get("/api/admin/session", (req, res) => {
  res.json({
    authenticated: Boolean(req.adminSession),
    user: req.adminSession ? { username: req.adminSession.username } : null
  });
});

app.get("/api/admin/applications", requireAdmin, async (req, res, next) => {
  try {
    const applications = await getAllApplications();
    res.json({
      data: applications
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/applications/:id", requireAdmin, async (req, res, next) => {
  try {
    const updated = await updateApplication(req.params.id, {
      status: cleanText(req.body.status, 40),
      adminNote: cleanText(req.body.adminNote, 2000)
    });

    if (!updated) {
      return res.status(404).json({
        message: "Ariza topilmadi."
      });
    }

    res.json({
      message: "Ariza yangilandi.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/appointments", requireAdmin, async (req, res, next) => {
  try {
    const appointments = await getAllAppointments();
    res.json({
      data: appointments
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/appointments/:id", requireAdmin, async (req, res, next) => {
  try {
    const updated = await updateAppointment(req.params.id, {
      status: cleanText(req.body.status, 40),
      adminNote: cleanText(req.body.adminNote, 2000)
    });

    if (!updated) {
      return res.status(404).json({
        message: "Uchrashuv topilmadi."
      });
    }

    res.json({
      message: "Uchrashuv yangilandi.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/site-content", requireAdmin, async (req, res, next) => {
  try {
    const nextContent = normalizeSiteContent(req.body);
    const saved = await saveSiteContent(nextContent);
    res.json({
      message: "Sayt ma'lumotlari saqlandi.",
      data: saved
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/upload", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    if (!hasCloudinary) {
      return res.status(400).json({
        message: "Cloudinary sozlamalari .env faylida to'ldirilmagan."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Rasm fayli tanlanmagan."
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        message: "Faqat rasm fayllari qabul qilinadi."
      });
    }

    const result = await uploadToCloudinary(req.file);

    res.json({
      message: "Rasm Cloudinary ga yuklandi.",
      data: {
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get([ADMIN_ROUTE, `${ADMIN_ROUTE}/`], async (req, res, next) => {
  try {
    const adminHtmlPath = path.join(ADMIN_DIR, "index.html");
    const template = await fs.readFile(adminHtmlPath, "utf8");
    const html = template.replaceAll("__ADMIN_ROUTE__", ADMIN_ROUTE);

    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.type("html").send(html);
  } catch (error) {
    next(error);
  }
});

app.use(
  ADMIN_ROUTE,
  (req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  },
  express.static(ADMIN_DIR, { index: false })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use(express.static(PUBLIC_DIR, { index: false }));

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint topilmadi."
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: "Serverda kutilmagan xatolik yuz berdi."
  });
});

start();

async function start() {
  try {
    if (configuredMongo) {
      try {
        await mongoose.connect(process.env.MONGODB_URI);
        mongoEnabled = true;
        console.log("MongoDB ulandi.");
      } catch (error) {
        mongoEnabled = false;
        console.log("MongoDB ulanmaganligi sabab memory mode ishga tushdi.");
      }
    } else {
      console.log("MONGODB_URI topilmadi, vaqtincha memory mode ishlayapti.");
    }

    await ensureSiteContentExists();

    app.listen(PORT, () => {
      console.log(`Server ishga tushdi: http://localhost:${PORT}`);
      console.log("Yashirin admin yo'li .env dagi ADMIN_SLUG orqali boshqariladi.");
    });
  } catch (error) {
    console.error("Serverni ishga tushirishda xatolik:", error.message);
    process.exit(1);
  }
}

function requireAdmin(req, res, next) {
  if (!req.adminSession) {
    return res.status(401).json({
      message: "Admin sessiyasi kerak."
    });
  }

  return next();
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

function createSignedSession(username) {
  const payload = {
    username,
    expiresAt: Date.now() + SESSION_DURATION_MS
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readSignedSession(token) {
  const [encoded, signature] = String(token || "").split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");

  if (!safeCompare(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));

    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
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
  return deepMerge(deepClone(DEFAULT_SITE_CONTENT), nextPayload || {});
}

async function ensureSiteContentExists() {
  if (mongoEnabled) {
    const existing = await SiteContent.findOne({ key: "main" }).lean();

    if (!existing) {
      await SiteContent.create({
        key: "main",
        payload: deepClone(DEFAULT_SITE_CONTENT)
      });
    }

    return;
  }

  memoryStore.siteContent = normalizeSiteContent(memoryStore.siteContent);
}

async function getSiteContent() {
  if (mongoEnabled) {
    const doc = await SiteContent.findOne({ key: "main" }).lean();
    return normalizeSiteContent(doc ? doc.payload : DEFAULT_SITE_CONTENT);
  }

  return normalizeSiteContent(memoryStore.siteContent);
}

async function saveSiteContent(payload) {
  const normalized = normalizeSiteContent(payload);

  if (mongoEnabled) {
    await SiteContent.findOneAndUpdate(
      { key: "main" },
      { key: "main", payload: normalized },
      { upsert: true, new: true }
    );
    return normalized;
  }

  memoryStore.siteContent = normalized;
  return normalized;
}

function buildTrackingCode(prefix) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

function normalizeId(documentOrRecord) {
  return String(documentOrRecord._id || documentOrRecord.id);
}

function toAdminApplication(record) {
  return {
    id: normalizeId(record),
    trackingCode: record.trackingCode,
    deviceId: record.deviceId,
    fullName: record.fullName,
    phone: record.phone,
    email: record.email,
    selectedProgram: record.selectedProgram,
    portfolioLink: record.portfolioLink,
    message: record.message,
    status: record.status,
    adminNote: record.adminNote,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toPublicApplication(record) {
  return {
    id: normalizeId(record),
    trackingCode: record.trackingCode,
    selectedProgram: record.selectedProgram,
    status: record.status,
    adminNote: record.adminNote,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function toAdminAppointment(record) {
  return {
    id: normalizeId(record),
    trackingCode: record.trackingCode,
    deviceId: record.deviceId,
    fullName: record.fullName,
    phone: record.phone,
    email: record.email,
    organization: record.organization,
    meetingType: record.meetingType,
    preferredDate: record.preferredDate,
    note: record.note,
    status: record.status,
    adminNote: record.adminNote,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

async function createApplication(payload) {
  const record = {
    ...payload,
    trackingCode: buildTrackingCode("APP"),
    status: "submitted",
    adminNote: ""
  };

  if (mongoEnabled) {
    const created = await Application.create(record);
    return toAdminApplication(created.toObject());
  }

  const created = {
    _id: crypto.randomUUID(),
    ...record,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memoryStore.applications.unshift(created);
  return toAdminApplication(created);
}

async function getApplicationsByDeviceId(deviceId) {
  if (mongoEnabled) {
    return Application.find({ deviceId }).sort({ createdAt: -1 }).lean();
  }

  return memoryStore.applications
    .filter((item) => item.deviceId === deviceId)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

async function getAllApplications() {
  if (mongoEnabled) {
    const items = await Application.find({}).sort({ createdAt: -1 }).lean();
    return items.map(toAdminApplication);
  }

  return memoryStore.applications
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map(toAdminApplication);
}

async function updateApplication(id, changes) {
  const nextStatus = changes.status;
  const nextAdminNote = changes.adminNote;

  if (mongoEnabled) {
    const updated = await Application.findByIdAndUpdate(
      id,
      {
        ...(nextStatus ? { status: nextStatus } : {}),
        adminNote: nextAdminNote || ""
      },
      { new: true }
    ).lean();

    return updated ? toAdminApplication(updated) : null;
  }

  const index = memoryStore.applications.findIndex((item) => item._id === id);

  if (index === -1) {
    return null;
  }

  const current = memoryStore.applications[index];
  const updated = {
    ...current,
    status: nextStatus || current.status,
    adminNote: nextAdminNote || "",
    updatedAt: new Date().toISOString()
  };

  memoryStore.applications[index] = updated;
  return toAdminApplication(updated);
}

async function createAppointment(payload) {
  const record = {
    ...payload,
    trackingCode: buildTrackingCode("MEET"),
    status: "new",
    adminNote: ""
  };

  if (mongoEnabled) {
    const created = await Appointment.create(record);
    return toAdminAppointment(created.toObject());
  }

  const created = {
    _id: crypto.randomUUID(),
    ...record,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  memoryStore.appointments.unshift(created);
  return toAdminAppointment(created);
}

async function getAllAppointments() {
  if (mongoEnabled) {
    const items = await Appointment.find({}).sort({ createdAt: -1 }).lean();
    return items.map(toAdminAppointment);
  }

  return memoryStore.appointments
    .slice()
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .map(toAdminAppointment);
}

async function updateAppointment(id, changes) {
  const nextStatus = changes.status;
  const nextAdminNote = changes.adminNote;

  if (mongoEnabled) {
    const updated = await Appointment.findByIdAndUpdate(
      id,
      {
        ...(nextStatus ? { status: nextStatus } : {}),
        adminNote: nextAdminNote || ""
      },
      { new: true }
    ).lean();

    return updated ? toAdminAppointment(updated) : null;
  }

  const index = memoryStore.appointments.findIndex((item) => item._id === id);

  if (index === -1) {
    return null;
  }

  const current = memoryStore.appointments[index];
  const updated = {
    ...current,
    status: nextStatus || current.status,
    adminNote: nextAdminNote || "",
    updatedAt: new Date().toISOString()
  };

  memoryStore.appointments[index] = updated;
  return toAdminAppointment(updated);
}

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || "qarshi-texnopark",
        resource_type: "image",
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}
