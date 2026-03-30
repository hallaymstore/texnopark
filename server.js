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
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
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
    fileSize: 50 * 1024 * 1024
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
    logo: "",
    logoType: "image",
    tagline: "Yoshlar, startaplar va raqamli loyihalar uchun rasmiy innovatsion platforma",
    seoTitle: "Qarshi Yoshlar Texnoparki | Rasmiy IT ta'lim, startap va innovatsiya platformasi",
    seoKeywords:
      "qarshi texnopark, yoshlar texnoparki, rasmiy texnopark sayti, it ta'lim, startup, robototexnika, innovatsiya, qarshi",
    metaDescription:
      "Qarshi Yoshlar Texnoparki uchun rasmiy platforma: yo'nalishlar, loyihalar, uchrashuv belgilash, ariza topshirish va device ID orqali natijani kuzatish imkoniyati."
  },
  hero: {
    eyebrow: "Qashqadaryo yoshlariga yangi avlod texnoparki",
    title: "Kelajak kasblari, startaplar va innovatsiyalar uchun premium raqamli makon",
    highlight: "ta'lim, mentorlik va real loyihalar",
    description:
      "Qarshi Yoshlar Texnoparki yoshlar, hamkor tashkilotlar va investorlar uchun yagona rasmiy raqamli kirish nuqtasi bo'lib, dasturlar, arizalar, uchrashuvlar va media axborotni bitta makonda birlashtiradi.",
    primaryActionLabel: "Ariza topshirish",
    primaryActionLink: "#application",
    secondaryActionLabel: "Uchrashuv belgilash",
    secondaryActionLink: "#meeting",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    mediaType: "image",
    cardTitle: "Texnopark boshqaruvi va imkoniyatlari bitta platformada",
    cardDescription:
      "Talabgorlar uchun qulay murojaat oqimi, admin uchun yashirin boshqaruv paneli va media kontentni Cloudinary orqali yuritish tizimi."
  },
  trustItems: [
    "Rasmiy va premium taqdimot",
    "Device ID asosida natijani ko'rish",
    "Logo va favicon bilan brend boshqaruvi",
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
      label: "qamrab olinadigan yoshlar va talabgorlar"
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
      "Mazkur sayt rasmiy ishonchlilikni zamonaviy premium ko'rinish bilan uyg'unlashtiradi. Har bir bo'lim admin panel orqali yangilanadi, foydalanuvchilar esa ro'yxatdan o'tmasdan qurilma ID yordamida o'z ariza natijasini kuzata oladi, hamkorlar esa rasmiy aloqalar va davlat tashkilotlari bilan tez bog'lana oladi.",
    imageA:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    imageAType: "image",
    imageB:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    imageBType: "image",
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
        category: "Digital",
        title: "Sun'iy intellekt va dasturlash",
        description: "Web, backend, AI, data va avtomatlashtirish bo'yicha amaliy o'quv dasturlari."
      },
      {
        icon: "STEM",
        category: "Engineering",
        title: "Robototexnika va muhandislik",
        description: "Prototiplash, konstruktorlik va apparat yechimlari ustida ishlash maydoni."
      },
      {
        icon: "MEDIA",
        category: "Creative",
        title: "Digital media va dizayn",
        description: "Grafik dizayn, motion, SMM va kontent ishlab chiqish uchun kreativ laboratoriya."
      },
      {
        icon: "START",
        category: "Business",
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
        mediaType: "image",
        featured: true
      },
      {
        category: "STEM",
        title: "Robototexnika laboratoriyasi",
        summary: "Amaliy sensorlar, mikrokontrollerlar va real qurilmalar bilan tajriba maydoni.",
        image:
          "https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=1200&q=80",
        mediaType: "image",
        featured: false
      },
      {
        category: "Analytics",
        title: "Ma'lumotlar tahlili va dashboard",
        summary: "Hududiy tashabbus va o'quv jarayonini kuzatish uchun data-driven boshqaruv paneli.",
        image:
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
        mediaType: "image",
        featured: false
      },
      {
        category: "Startup",
        title: "Demo day va investor uchrashuvlari",
        summary: "Iqtidorli jamoalarni taqdimot, mentorlik va hamkorlik bilan bog'laydigan dastur.",
        image:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
        mediaType: "image",
        featured: false
      }
    ]
  },
  timelineSection: {
    tag: "Qabul bosqichlari",
    title: "Texnopark platformasiga qo'shilishning aniq va shaffof yo'li",
    description:
      "Talabgorlar, rezidentlar va hamkorlar uchun barcha bosqichlar oldindan ko'rsatiladi. Bu bo'lim qabul jarayonini tushunarli va ishonchli qiladi.",
    items: [
      {
        step: "01",
        title: "Ariza yuborish",
        description: "Platformada forma to'ldiriladi va qurilmaga maxsus ID biriktiriladi.",
        state: "active"
      },
      {
        step: "02",
        title: "Birlamchi saralash",
        description: "Admin panelda ariza ko'rib chiqiladi va yo'nalish bo'yicha tasniflanadi.",
        state: "upcoming"
      },
      {
        step: "03",
        title: "Uchrashuv yoki suhbat",
        description: "Zarur bo'lsa uchrashuv yoki qisqa suhbat belgilanadi.",
        state: "upcoming"
      },
      {
        step: "04",
        title: "Natijani e'lon qilish",
        description: "Talabgor qurilma ID orqali o'z statusini va admin izohini ko'radi.",
        state: "complete"
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
  testimonialsSection: {
    tag: "Muvaffaqiyat hikoyalari",
    title: "Texnopark rezidentlari, mentorlar va hamkorlar fikrlari",
    description:
      "Platforma ko'rinishi nafaqat zamonaviy, balki foydalanuvchilar uchun aniq natija beradigan boshqaruv muhitiga aylantirilgan.",
    items: [
      {
        name: "Shahzod Xudoyberdiyev",
        role: "AI yo'nalishi rezidenti",
        quote:
          "Ariza topshirish, statusni ko'rish va uchrashuvlarni boshqarish jarayoni ancha soddalashdi. Platforma premium va juda tushunarli.",
        result: "AI intensiv dasturiga qabul qilingan",
        image:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
        imageType: "image"
      },
      {
        name: "Madina To'rayeva",
        role: "Digital media treneri",
        quote:
          "Admin panel juda qulay. Kontentni oddiy formalar bilan yangilash mumkinligi jamoa uchun katta yengillik bo'ldi.",
        result: "Kontent va media oqimi bir markazga yig'ildi",
        image:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
        imageType: "image"
      },
      {
        name: "Ulug'bek Mirzaev",
        role: "Hamkor tashkilot vakili",
        quote:
          "Rasmiy ko'rinish, qulay aloqa bloklari va uchrashuv booking tizimi hamkorlik jarayonini ancha tezlashtirdi.",
        result: "Hamkorlik uchrashuvlari onlayn boshqarilmoqda",
        image:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
        imageType: "image"
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
  faqSection: {
    title: "Ko'p so'raladigan savollar",
    description: "Qidiruv orqali kerakli savolni tez topish mumkin.",
    items: [
      {
        question: "Ariza topshirish qanday ishlaydi?",
        answer: "Foydalanuvchi forma to'ldiradi, tizim esa avtomatik device ID yaratib statusni shu ID orqali kuzatish imkonini beradi."
      },
      {
        question: "Uchrashuv qanday belgilanadi?",
        answer: "Uchrashuv bo'limida kerakli tur va sanani tanlab so'rov yuboriladi, admin esa panel orqali holatni boshqaradi."
      },
      {
        question: "Natijani qayerdan bilaman?",
        answer: "Status bo'limida device ID kiritilib, barcha yuborilgan arizalar va admin izohlari ko'riladi."
      },
      {
        question: "Ro'yxatdan o'tish kerakmi?",
        answer: "Yo'q. Tizim ro'yxatdan o'tmasdan ishlash uchun device ID asosidagi qulay oqimni taklif qiladi."
      }
    ]
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
  },
  governmentOrganizations: [
    {
      name: "Qashqadaryo viloyati hokimligi",
      url: "https://qashqadaryo.uz",
      description: "Hududiy rivojlanish va hamkorlik bo'yicha rasmiy tashkilot."
    },
    {
      name: "Yoshlar ishlari agentligi",
      url: "https://yoshlar.gov.uz",
      description: "Yoshlar siyosati va iqtidorli tashabbuslarni qo'llab-quvvatlash."
    },
    {
      name: "Raqamli texnologiyalar vazirligi",
      url: "https://digital.uz",
      description: "Raqamli transformatsiya va IT ekotizimini rivojlantirish bo'yicha rasmiy hamkor."
    },
    {
      name: "Oliy ta'lim, fan va innovatsiyalar vazirligi",
      url: "https://edu.uz",
      description: "Ta'lim, ilmiy rivojlanish va innovatsion tashabbuslar bo'yicha rasmiy yo'nalish."
    },
    {
      name: "IT Park Uzbekistan",
      url: "https://it-park.uz",
      description: "IT ekotizimi, startaplar va rezident loyihalarni rivojlantirish bo'yicha hamkor platforma."
    }
  ],
  partnersSection: {
    tag: "Rasmiy hamkorlar",
    title: "Ekotizimni qo'llab-quvvatlayotgan hamkorlar va platformalar",
    description:
      "Davlat, ta'lim va texnologik hamkorlar bilan birgalikdagi ishlar uchun rasmiy hamkorlar devori alohida ko'rsatiladi.",
    items: [
      {
        name: "Yoshlar ishlari agentligi",
        url: "https://yoshlar.gov.uz",
        description: "Yoshlar siyosati va dasturlar hamkori",
        logo:
          "https://dummyimage.com/480x280/eaf0ff/3557cb.png&text=Yoshlar+Agentligi",
        logoType: "image"
      },
      {
        name: "IT Park Uzbekistan",
        url: "https://it-park.uz",
        description: "Texnologik ekotizim hamkori",
        logo:
          "https://dummyimage.com/480x280/eaf0ff/3557cb.png&text=IT+Park",
        logoType: "image"
      },
      {
        name: "Qashqadaryo viloyati hokimligi",
        url: "https://qashqadaryo.uz",
        description: "Hududiy rivojlanish hamkori",
        logo:
          "https://dummyimage.com/480x280/eaf0ff/3557cb.png&text=Qashqadaryo+hokimligi",
        logoType: "image"
      },
      {
        name: "Raqamli texnologiyalar vazirligi",
        url: "https://digital.uz",
        description: "Raqamli ekotizim hamkori",
        logo:
          "https://dummyimage.com/480x280/eaf0ff/3557cb.png&text=Digital+Uz",
        logoType: "image"
      }
    ]
  },
  liveStatus: {
    title: "Jonli status",
    items: [
      {
        label: "Qabul holati",
        value: "Ochiq",
        tone: "success"
      },
      {
        label: "Platforma",
        value: "24/7 online",
        tone: "primary"
      },
      {
        label: "Uchrashuvlar",
        value: "Haftalik slotlar faol",
        tone: "info"
      }
    ]
  },
  footer: {
    officialLabel: "Rasmiy axborot platformasi",
    officialNote:
      "Mazkur veb-sayt Qarshi Yoshlar Texnoparki faoliyati, dasturlari, imkoniyatlari, ariza va uchrashuv oqimlari bo'yicha rasmiy raqamli axborot manbasi sifatida xizmat qiladi.",
    legalText:
      "Saytdagi ma'lumotlar muntazam yangilanadi. Hamkorlik, dasturlarga qo'shilish va rasmiy murojaatlar bo'yicha yuqoridagi rasmiy kanallardan foydalanish tavsiya etiladi."
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

app.post("/api/assistant/chat", async (req, res, next) => {
  try {
    const messages = normalizeChatMessages(req.body.messages);

    if (!messages.length) {
      return res.status(400).json({
        message: "Kamida bitta xabar yuborilishi kerak."
      });
    }

    const content = await getSiteContent();
    const result = await generateAssistantReply(messages, content);

    res.json({
      data: result
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

app.post("/api/admin/upload", requireAdmin, upload.single("media"), async (req, res, next) => {
  try {
    if (!hasCloudinary) {
      return res.status(400).json({
        message: "Cloudinary sozlamalari .env faylida to'ldirilmagan."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Media fayli tanlanmagan."
      });
    }

    if (!req.file.mimetype.startsWith("image/") && !req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        message: "Faqat rasm va video fayllari qabul qilinadi."
      });
    }

    const result = await uploadToCloudinary(req.file);

    res.json({
      message: "Media Cloudinary ga yuklandi.",
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type
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

async function generateAssistantReply(messages, content) {
  const lastUserMessage = [...messages].reverse().find((item) => item.role === "user")?.content || "";
  const fallbackReply = buildFallbackAssistantReply(lastUserMessage, content);
  const apiKey = cleanText(process.env.GROQ_API_KEY, 240);

  if (!apiKey) {
    return {
      reply: fallbackReply,
      mode: "fallback"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 420,
        messages: [
          {
            role: "system",
            content: buildSiteAssistantPrompt(content)
          },
          ...messages
        ]
      }),
      signal: controller.signal
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
  } finally {
    clearTimeout(timeout);
  }
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
        resource_type: "auto",
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
