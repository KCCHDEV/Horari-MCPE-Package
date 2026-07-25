# work.md — Project Working Memory

## Current Status

- State: blocked-awaiting-provider-config
- Last updated: 2026-07-24
- Current task: ทำระบบสมาชิก คำสั่งซื้อ payment webhook และ Pterodactyl provisioning
- Main goal: ลูกค้าสมัคร/ล็อกอิน สั่งซื้อผ่านเว็บ ชำระเงินแล้วได้เครื่อง Pterodactyl อัตโนมัติ

## User Request

ทำระบบ auto สั่งซื้อผ่าน Website มี login, MongoDB และสร้างเครื่องจาก Pterodactyl ทั้งหมด

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
- [x] ตรวจหน่วยเงิน THB ของ Stripe และเพิ่ม production controlled-purchase checklist
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

## Next Steps

- [x] รันเว็บ local
- [x] ตรวจ desktop/mobile ทุก route
- [ ] หากต้อง harden production เพิ่ม: self-host fonts/icons/images และตรวจ CDN outage fallback
- [ ] Set `.env` from `.env.example` on runtime host
- [ ] Create a real paid checkout and webhook mapping
- [ ] Run one controlled test purchase and verify Pterodactyl user/server/start state
- [ ] Confirm the actual payment provider choice; generic webhook cannot create a checkout without provider credentials/API contract
- [ ] Run `docker compose up -d --build` on the deployment host and make `/healthz` return 200
- [ ] Follow `docs/PRODUCTION_SETUP.md` for test-mode purchase before live mode

## Current Blocker

- ไม่มี `.env`, MongoDB URI, Stripe keys หรือ Pterodactyl Application API config ใน workspace
- จึงยังทำ controlled purchase จริงและยืนยัน server `active` ใน Panel ไม่ได้
- ห้ามใช้ mock data เป็นหลักฐานแทน provider จริง

## Required User/Dev Input

- ตั้งค่า secret บน deployment host ตาม `.env.example` หรือแจ้งเมื่อ host พร้อมให้ทดสอบ
- ต้องมี MongoDB, Stripe test keys/webhook secret และ Pterodactyl URL/token/nest/egg/location
- หลังตั้งค่าแล้วให้รัน `docker compose up -d --build` และแจ้งผล `/healthz`

## Resume Prompt

อ่าน `work.md` แล้วต่อจากการตั้งค่า provider จริง: เติม MongoDB/Pterodactyl/payment env, ทดสอบ webhook แบบ signed, ทำ controlled purchase และตรวจว่า server active ใน panel ก่อนประกาศใช้งานจริง
