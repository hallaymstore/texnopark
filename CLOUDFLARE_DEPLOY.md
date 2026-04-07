# Cloudflare Deploy

1. `npm install`
2. `npm run build:static`
3. `.dev.vars.example` faylidan nusxa olib `.dev.vars` yarating va local secretlarni to'ldiring.
4. Cloudflare D1 baza yarating:
   `npx wrangler d1 create qarshi-texnopark`
5. `wrangler.toml` ichidagi `database_id` va `preview_database_id` qiymatlarini yangi D1 ID bilan almashtiring.
6. Schema ni ishlating:
   `npx wrangler d1 execute qarshi-texnopark --file=cloudflare/schema.sql`
7. Secretlarni kiriting:
   `npx wrangler secret put SESSION_SECRET`
   `npx wrangler secret put ADMIN_USERNAME`
   `npx wrangler secret put ADMIN_PASSWORD`
   `npx wrangler secret put GROQ_API_KEY`
   `npx wrangler secret put CLOUDINARY_CLOUD_NAME`
   `npx wrangler secret put CLOUDINARY_API_KEY`
   `npx wrangler secret put CLOUDINARY_API_SECRET`
8. Local worker preview:
   `npm run cf:dev`
9. Deploy:
   `npm run cf:deploy`

Eslatma:
- D1 ulanmasa worker memory mode bilan ham ishga tushadi, lekin ma'lumotlar doimiy saqlanmaydi.
- `ADMIN_SLUG` ni ommaga ko'rinmaydigan qiymatga almashtirish tavsiya qilinadi.
