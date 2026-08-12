# work.md — Project Working Memory

## Current Status

- State: cpu-package-comparison-ready-push-blocked
- Last updated: 2026-08-12
- Current task: ปรับระบบเลือกแพ็กเกจและเพิ่มการเปรียบเทียบ CPU/Package
- Main goal: ลูกค้าสมัคร/ล็อกอิน สั่งซื้อผ่านเว็บ ชำระเงินแล้วได้เครื่อง Pterodactyl อัตโนมัติ

## User Request

ปรับปรุงระบบ และทำระบบเปรียบเทียบ CPU และ Package

## Active Plan

- [x] อ่านโครงสร้างโปรเจกต์และไฟล์หลัก
- [x] เปิดเว็บจริง ตรวจทุกหน้าและ flow หลัก
- [x] สรุปปัญหา/ข้อเสนอแก้ไขสำหรับ DEV
- [x] แก้การโหลด app.js ให้ครบทุกหน้า
- [x] เอา Tailwind CDN ออกจาก production templates
- [x] แก้ mobile overflow ของ footer navigation
- [x] build และ browser QA ที่ 390/768/1280px
- [x] บันทึกผลและ resume prompt
- [x] ตรวจว่าโค้ดเดิมยังไม่มี auth/database/order/Pterodactyl integration
- [x] เพิ่ม MongoDB persistence และ session auth
- [x] เพิ่ม order lifecycle และ signed payment webhook
- [x] เพิ่ม idempotent Pterodactyl user/server provisioning path
- [x] เพิ่มหน้า login/register/dashboard
- [x] เปลี่ยน package order UI จาก inline onclick เป็น event listener และทดสอบ browser flow
- [x] เพิ่ม Stripe Checkout adapter แบบ subscription/one-time และ Stripe signature verification
- [x] เพิ่ม Docker + MongoDB compose runtime และ `/healthz` readiness check
- [x] แยก Pterodactyl Egg/Startup/Image/Environment ตาม service type
- [x] เพิ่ม customer panel access instructions และ login email ใน order state
- [x] เพิ่ม automated payment/Pterodactyl contract tests
- [x] เพิ่ม external_id reconciliation และ order provisioning claim กัน duplicate webhook/retry
- [x] เพิ่ม catalog/settings persistence ใน MongoDB พร้อม fallback JSON
- [x] เพิ่ม `/admin` และ API หลังบ้านสำหรับราคา/ส่วนลด/event
- [x] แก้ no-JavaScript package visibility และ static route trailing slash บนมือถือ
- [x] ติดตั้ง Next.js 16.2.12 และ React 19.2
- [x] เพิ่ม App Router pages, API catch-all route, auth/admin guards และ Next runtime config
- [ ] ลบ/แยก legacy Bun server หลัง Next QA ผ่านครบ
- [x] เพิ่มภาพ hero และภาพตัวอย่างแพ็กเกจจริง
- [x] ตั้ง Open Graph/Twitter social card สำหรับ Discord
- [x] ตรวจ responsive ใน browser ที่ 390px
- [x] กันหน้า mobile ว่างเมื่อ browser หน่วง/ปิด animation
- [x] ตรวจหน่วยเงิน THB ของ Stripe และเพิ่ม production controlled-purchase checklist
- [x] ยืนยัน Netlify redirect loop บน service routes
- [x] archive `netlify.toml` ก่อนแก้
- [x] ลบ forced trailing-slash redirects ที่ชนกับ Next.js
- [x] รัน typecheck/build/test และตรวจ route แบบ local
- [ ] deploy แล้วตรวจ production routes ซ้ำ
- [x] สร้างภาพสินค้าใหม่ 4 ภาพสำหรับ Minecraft, Web Hosting, Code Hosting และ Code Server
- [x] เปลี่ยนการ์ดให้ใช้ภาพเฉพาะบริการโดยไม่ทับไฟล์เดิม
- [x] ตรวจภาพจริงบนหน้าเว็บและรัน build
- [x] ตรวจข้อมูล CPU และแพ็กเกจจริงทั้ง 24 รายการ
- [x] เพิ่มสรุปเปรียบเทียบ CPU จากช่วงราคาและทรัพยากรจริง
- [x] เพิ่มตัวกรอง CPU
- [x] เพิ่มระบบเลือกเทียบแพ็กเกจสูงสุด 3 รายการ
- [x] ตรวจ keyboard/mobile/desktop และ order flow เดิม
- [ ] ผูก payment gateway จริงและตรวจ webhook จริง
- [ ] ทดสอบ MongoDB + Pterodactyl ด้วย credentials ของร้าน

## Files Changed

| File | Action | Notes |
|---|---|---|
| `work.md` | created | เก็บสถานะการสำรวจเว็บครั้งนี้ |
| `views/index.ejs` | edited | เพิ่ม app.js และลบ Tailwind CDN |
| `views/contact.ejs` | edited | เพิ่ม app.js และลบ Tailwind CDN |
| `views/content-page.ejs` | edited | เพิ่ม app.js และลบ Tailwind CDN |
| `views/minecraft.ejs`, `views/webhosting.ejs`, `views/codehosting.ejs` | edited | ลบ Tailwind CDN |
| `views/codeserver.ejs`, `views/servers.ejs` | edited | ลบ Tailwind CDN |
| `public/css/styles.css` | edited | จำกัดความกว้าง responsive และให้ footer links wrap บน mobile |
| `lib/db.ts` | created | MongoDB connection and indexes |
| `lib/auth.ts` | created | PBKDF2 password hash and Mongo-backed sessions |
| `lib/catalog.ts` | created | server-side package lookup and resource parsing |
| `lib/orders.ts` | created | order creation, payment confirmation and provisioning lifecycle |
| `lib/pterodactyl.ts` | created | Application API user/server provisioning |
| `lib/payment.ts` | created | Stripe Checkout session and webhook signature adapter |
| `Dockerfile`, `compose.yaml` | created | Bun runtime + MongoDB deployment |
| `tests/payment.test.ts`, `tests/pterodactyl.test.ts` | created | provider contract tests without live secrets |
| `docs/PRODUCTION_SETUP.md` | created | exact deployment and controlled purchase checklist |
| `views/auth.ejs` | created | login/register |
| `views/dashboard.ejs` | created | customer order dashboard |
| `public/js/app.js` | edited | package selection/order event wiring |
| `.env.example` | created | runtime configuration contract |
| `README.md` | edited | setup and production requirements |
| `package.json`, `package-lock.json` | edited | MongoDB dependency and server checks |
| `lib/catalog.ts` | edited | MongoDB catalog seed, effective discount price, admin updates |
| `lib/db.ts` | edited | catalog/settings indexes |
| `lib/orders.ts` | edited | อ่านราคาจาก catalog ที่อยู่ใน MongoDB |
| `server.ts` | edited | async Mongo-backed rendering and admin routes |
| `views/admin.ejs` | created | price/event control panel |
| `public/css/styles.css` | edited | package content remains visible without JS |
| `netlify.toml` | edited | mobile/static service route redirects |
| `app/` | created | Next.js App Router pages, API, healthz, favicon |
| `components/ejs-page.tsx` | created | preserves existing UI while migrating runtime |
| `lib/next-render.ts`, `lib/next-auth.ts` | created | Next server rendering/auth bridge |
| `next.config.ts`, `tsconfig.json`, `next-env.d.ts` | created | Next.js 16 configuration |
| `Dockerfile`, `package.json`, `package-lock.json` | edited | Node/Next runtime scripts |
| `public/images/horari-minecraft-hero.png` | created | ภาพ hero/social preview ที่สร้างใหม่ |
| `public/images/horari-minecraft-package.png` | created | ภาพประกอบแพ็กเกจ Minecraft |
| `public/images/horari-webhosting-package.png` | created | ภาพประกอบแพ็กเกจ Web/Code hosting |
| `views/index.ejs`, `public/css/styles.css` | edited | landing มีภาพและ mobile layout ที่อ่านง่ายขึ้น |
| `app/layout.tsx` | edited | Open Graph/Twitter preview image สำหรับ Discord |
| `netlify.toml` | edited | ลบ forced trailing-slash redirects ที่ทำให้ Next.js redirect วนซ้ำ |
| `archive/2026-08-12/netlify.toml` | archived | สำรอง Netlify config ก่อนแก้ |
| `archive/ARCHIVE_LOG.md` | created | บันทึกสาเหตุและวิธีกู้คืน |
| `public/images/horari-*-package-v2.webp` | created | ภาพสินค้าใหม่ 4 บริการ แบบ 4:3 และบีบอัด WebP |
| `views/index.ejs` | edited | เปลี่ยนการ์ดสินค้าให้ใช้ภาพเฉพาะ พร้อมกำหนดขนาดภาพลด layout shift |
| `views/minecraft.ejs` | edited | เพิ่มสรุป CPU, ตัวกรอง และพื้นที่ตารางเปรียบเทียบแพ็กเกจ |
| `public/js/app.js` | edited | เพิ่ม compare state/table/limit/order flow และแก้ initialization หลัง Next.js โหลดหน้าแล้ว |
| `public/css/styles.css` | edited | เพิ่ม responsive UI สำหรับ CPU cards, compare controls และตารางแนวนอนบนมือถือ |

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `rg --files` | pass | พบ Bun + EJS + static assets |
| `bun run server.ts` | pass | เปิดเว็บที่ `http://localhost:3002` |
| Browser audit | partial | ตรวจ 9 routes, desktop/mobile, menu และ package modal |
| `npm run build` | pass | สร้าง `dist` สำเร็จ |
| `git diff --check` | pass | ไม่พบ whitespace error |
| `Browser QA: 9 routes × 390/768/1280px` | pass | ทุกหน้ามี app.js, ไม่มี Tailwind CDN, ไม่มี horizontal overflow |
| `Browser interaction: mobile nav` | pass | toggle เปิดได้และ `aria-expanded=true` |
| `bun run server.ts` | pass | Bun server starts after pinning `mongodb@6.17.0` |
| `HTTP /login /register` | pass | 200 and rendered auth forms |
| `HTTP /dashboard` without MongoDB | expected 503 | fails closed until `MONGODB_URI` and `MONGODB_DB` exist |
| `POST /api/auth/login` without MongoDB | expected 503 | explicit configuration error |
| `bun build server.ts --target bun` | pass | server bundles successfully |
| `Pterodactyl client local stub` | pass | verified user lookup/create, server payload and 2GB/20GB/2-core conversion |
| `Browser package flow` | pass | modal opens, Discord list renders, order message generated |
| `Stripe checkout adapter stub` | pass | generated subscription Checkout payload and URL without live secret |
| `Stripe webhook signature test` | pass | valid signature accepted, stale/invalid signature rejected |
| `Pterodactyl per-service stub` | pass | Web Hosting uses its own Egg/startup/environment override |
| `GET /healthz` without provider env | expected 503 | reports mongo/pterodactyl/payment checks without leaking secrets |
| `npm test` | pass | 3 tests, 11 assertions |
| `npm test` latest | pass | 4 tests, 13 assertions, including duplicate external_id reconciliation |
| `Stripe THB amount review` | pass | adapter uses minor units (`amount * 100`) for THB prices |
| `HTTP / /login /register` | pass | 200 from Bun server |
| `bun build server.ts --target bun` | pass | admin/catalog changes compile |
| `npm run build` | pass | static package pages generated |
| `npm test` latest | pass | 4 tests, 13 assertions |
| `HTTP smoke / /minecraft /admin/login /healthz` | pass/expected | `/minecraft` 200 with 24 package buttons; `/admin` 503 without MongoDB; `/healthz` 503 without providers |
| `git diff --check` | pass | no whitespace errors |
| `npm run build` | pending | Next.js 16 migration |
| `npm run test` | pending | regression check after migration |
| `npm run build` | pass | Next.js 16.2.12 production build and route manifest |
| `npm test` | pass | 4 tests, 13 assertions |
| `Next runtime smoke` | pass | `/minecraft` 200, `/admin/login` 200, auth redirects and `/api/orders` 401 |
| `MongoDB Atlas ping` | pass | connected to `horari_service`; `users` count 0; no data written |
| `npm run typecheck && npm run build && npm test` | pass | Next build, typecheck, and 4 tests / 13 assertions |
| `git diff --check` | pass | no whitespace errors |
| `bun build server.ts --target bun` | pending | run after admin/catalog changes |
| `npm run build` | pending | run after admin/catalog changes |
| `npm run typecheck && npm run build` | pass | Next build/typecheck หลังเพิ่มภาพและ social metadata |
| Browser QA: `/` at 390px | pass | hero/card images โหลดครบ, menu แสดง, ไม่มี horizontal overflow |
| Browser QA: `/minecraft` at 390px | pass | card 360px, filter 366px, ไม่มี horizontal overflow |
| Open Graph metadata | pass | `summary_large_image` และ `og:image` ชี้ภาพใน `/images/` |
| Mobile animation fallback | implemented | content ไม่รอ animation ก่อนแสดงบนจอ <=640px และ Reduce Motion |
| Production route probe | fail confirmed | 4 service routes วน `301` เกิน 8 redirects เพราะ Netlify บังคับ `/` ชนกับ Next.js |
| `npm run typecheck` | pass | TypeScript ผ่านหลังแก้ Netlify config |
| `npm test` | pass | 4 tests, 13 assertions |
| `npm run build` | pass | Next.js 16 production build ผ่านและมี service routes ครบ |
| Local route probe | pass | ทั้ง 4 service routes ตอบ 200; URL มี `/` ท้ายถูก normalize เพียง 1 ครั้ง |
| `git commit` | pass | local commit `fix: stop Netlify service route redirect loop` |
| `git push origin main` | fail | GitHub HTTPS credential ไม่พร้อม (`could not read Username`); production ยังไม่ได้ deploy |
| Image generation | pass | สร้างภาพ 4:3 แยกตามบริการด้วย built-in image generation; ไม่มีข้อความ โลโก้ หรือลายน้ำ |
| WebP optimization | pass | ภาพ 1448×1086 เหลือ 82–117 KB ต่อไฟล์ |
| Browser QA 390px | pass | ภาพทั้ง 4 โหลดครบ, การ์ดกว้างพอดี และ `scrollWidth=390` |
| Browser QA 1280px | pass | ภาพทั้ง 4 โหลดครบในการ์ด 2 คอลัมน์ และไม่มี horizontal overflow |
| `npm run typecheck && npm test && npm run build` | pass | 4 tests / 13 assertions และ Next.js production build ผ่าน |
| CPU/package data audit | pass | 24 แพ็กเกจ, 4 กลุ่ม CPU; แสดงเฉพาะราคาและทรัพยากรจาก catalog จริง |
| Browser CPU shortcut | pass | เลือก XEON แล้วเหลือ 7/24 แพ็กเกจและซ่อนกลุ่มอื่น |
| Browser package comparison | pass | เลือกได้ 3 รายการ, รายการที่ 4 ถูกปฏิเสธพร้อมข้อความ, ลบและล้างได้ |
| Browser comparison order | pass | ปุ่มจากตารางเปิด modal พร้อมชื่อ ราคา และ CPU model เดิมถูกต้อง |
| Browser QA 390px/1280px | pass | ไม่มี horizontal page overflow; ตารางเลื่อนภายในได้และ CPU grid 1/4 คอลัมน์ตาม viewport |
| Next late-script initialization | fixed | filter/ราคา/modal/compare เริ่มทำงานแม้ app.js โหลดหลัง `DOMContentLoaded` |
| Final `node --check`, typecheck, test, build | pass | JavaScript syntax, TypeScript, 4 tests/13 assertions และ production build ผ่าน |

## Audit Findings

- Fixed: เพิ่ม `/js/app.js?v=<%= assets.js %>` ใน `index.ejs`, `contact.ejs`, `content-page.ejs`
- Fixed: ลบ `https://cdn.tailwindcss.com` จากทั้ง 9 templates; ไม่พบ Tailwind CDN เหลือใน `views/`
- Fixed: mobile 390px เดิม `scrollWidth=560`; สาเหตุสุดท้ายคือ footer nav flex ไม่ wrap จึงเพิ่ม mobile wrapping และ harden ความกว้างของ hero/typewriter
- Verified: ที่ 390/768/1280px ทุก route มี `scrollWidth <= innerWidth` และไม่มี horizontal overflow
- Medium remaining: Iconify, Google Fonts และภาพยังพึ่ง external/CDN; ควร self-host หากต้องการ production resilience เต็มรูปแบบ
- Architecture: runtime order flow is now Bun + MongoDB + Pterodactyl Application API; static Netlify publish alone cannot run auth/order/webhook routes
- Auth: PBKDF2 password hashes and HttpOnly Mongo sessions; no plaintext password/token committed
- Payment: generic signed HMAC webhook contract at `POST /api/payments/webhook`; checkout URL is environment-provided via `PAYMENT_CHECKOUT_URL_TEMPLATE`
- Payment: `PAYMENT_PROVIDER=stripe` now creates hosted Checkout Session URLs; default is monthly subscription, switch to one-time with `PAYMENT_MODE=payment`
- Provisioning: payment confirmation is separated from Pterodactyl provisioning; provider failure keeps order `payment_confirmed` with error for retry, not a false active state
- Package UI: removed inline `onclick` dependency; tested package modal and Discord order message in browser
- Positive: ทุก route ตอบสนองและมี title/h1; รูปที่ตรวจไม่พบ broken image; package modal เปิดได้และสร้างข้อความสั่งซื้อได้; Discord invite ทั้ง 2 ลิงก์ตอบ 301 ไป `discord.com/invite`
- Scope note: ยังไม่ได้ส่งข้อความ/เปิด ticket จริง เพราะเป็น external side effect และผู้ใช้ขอสำรวจ ไม่ได้ขอให้ส่ง

## Bugs / Risks

- Browser interaction ของ mobile nav ตรวจผ่านแล้ว
- Package selection/order modal browser flow ผ่านแล้วหลังเปลี่ยนเป็น event listener
- ยังไม่ได้ส่งข้อความ/เปิด ticket จริง เพราะเป็น external side effect
- MongoDB/Pterodactyl/payment provider credentials are not present in this workspace, so real purchase-to-server activation remains unverified
- Stripe checkout/webhook code is implemented but live payment remains unverified until real Stripe keys and webhook delivery are configured
- Pterodactyl egg/startup/environment/nest/location values must match the actual panel; defaults are not production truth
- Pterodactyl Application API user password is nullable; dashboard gives the customer the panel URL and instructs password reset using the same email rather than storing a plaintext panel password
- Deployment: `compose.yaml` provides Bun app + MongoDB, but Docker is not installed in this workspace so container startup is not locally executed
- Live readiness: no `.env`, MongoDB, Pterodactyl or Stripe variables exist in this workspace; `/healthz` correctly returns `503` with all three checks false
- Concurrency: provisioning claims `payment_confirmed` atomically and treats stale provisioning locks as retryable after 15 minutes
- Admin requires an existing MongoDB user with `role: "admin"`; no admin password/secret is hardcoded or auto-created
- Static Netlify build cannot receive live MongoDB changes; live price/event updates require deploying the Bun runtime route
- Discord ใช้ Open Graph จาก `app/layout.tsx`; production ต้องตั้ง `APP_URL` เป็น HTTPS public domain ก่อนแชร์ เพื่อให้ Discord ดึงภาพได้
- Mobile: เดิม `.hero-entry`/`.card-entry` เริ่มต้น `opacity: 0`; เพิ่ม fallback ให้แสดงทันทีบนมือถือและทุก browser ที่เปิด Reduce Motion
- User supplied a MongoDB Atlas URI; the real credential was intentionally not written to repo or `.env`.
- Added `docs/NETLIFY_ENV.md` with safe environment-variable handoff and the Netlify static/runtime limitation.
- Next.js 16 uses App Router and a catch-all API route; existing EJS is rendered inside the App Router to preserve the supplied UI during migration.
- First MongoDB user now bootstraps as `admin`; later registrations remain `customer`.
- MongoDB Atlas read-only smoke check passed with `horari_service`; current user count is 0, so the next successful registration will be the first admin.
- Production routing: Netlify forced `/minecraft` → `/minecraft/` while Next.js normalized the same route, causing an infinite `301` loop; remove the four manual redirects and let Next.js own route canonicalization.
- Next.js loaded `/js/app.js` with `afterInteractive`; the old DOMContentLoaded-only listener could miss initialization entirely. `initializeApp()` now runs immediately when the document is already ready and remains single-run.
- CPU comparison deliberately uses catalog facts (starting price and maximum package resources) and explicitly avoids invented benchmark scores.

## Next Steps

- [x] รันเว็บ local
- [x] ตรวจ desktop/mobile ทุก route
- [ ] หากต้อง harden production เพิ่ม: self-host fonts/icons/images และตรวจ CDN outage fallback
- [ ] Set `.env` from `.env.example` on runtime host and promote one user to `role: "admin"`
- [ ] Create a real paid checkout and webhook mapping
- [ ] Run one controlled test purchase and verify Pterodactyl user/server/start state
- [ ] Confirm the actual payment provider choice; generic webhook cannot create a checkout without provider credentials/API contract
- [ ] Run `docker compose up -d --build` on the deployment host and make `/healthz` return 200
- [ ] Follow `docs/PRODUCTION_SETUP.md` for test-mode purchase before live mode
- [ ] Deploy commit containing the Netlify redirect fix
- [ ] Verify `/minecraft`, `/webhosting`, `/codehosting`, and `/codeserver` return 200 without redirects looping
- [ ] Push and deploy CPU/package comparison, then repeat comparison/order QA on the public URL

## Current Blocker

- GitHub ในเครื่องยังไม่ authenticated และไม่มี GitHub CLI จึง push commit ขึ้น `origin/main` ไม่ได้; ตาม GitHub publish workflow ต้องให้ owner ติดตั้ง/ล็อกอิน `gh` ก่อน
- ไม่มี `.env`, MongoDB URI, Stripe keys หรือ Pterodactyl Application API config ใน workspace
- จึงยังทำ controlled purchase จริงและยืนยัน server `active` ใน Panel ไม่ได้
- ห้ามใช้ mock data เป็นหลักฐานแทน provider จริง

## Required User/Dev Input

- ตั้งค่า secret บน deployment host ตาม `.env.example` หรือแจ้งเมื่อ host พร้อมให้ทดสอบ
- ต้องมี MongoDB, Stripe test keys/webhook secret และ Pterodactyl URL/token/nest/egg/location
- หลังตั้งค่าแล้วให้รัน `docker compose up -d --build` และแจ้งผล `/healthz`

## Resume Prompt

อ่าน `work.md` แล้วเริ่มจาก authenticate GitHub (`gh auth login`), push commit แก้ redirect loop ขึ้น `main`, รอ Netlify deploy และตรวจ 4 service routes ให้ได้ 200 จากนั้นค่อยต่อ provider E2E ตามรายการเดิม
