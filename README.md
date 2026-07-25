# Horari Service Online

เว็บสั่งซื้อบริการโฮสติ้งแบบมีบัญชีลูกค้าและ provisioning ผ่าน Pterodactyl

## Flow หลัก

1. ลูกค้าสมัคร/เข้าสู่ระบบที่ `/register` หรือ `/login`
2. เลือกบริการ แพ็กเกจ และชื่อเซิร์ฟเวอร์ใน `/dashboard`
3. ระบบเก็บคำสั่งซื้อใน MongoDB สถานะ `pending_payment`
4. ถ้า `PAYMENT_PROVIDER=stripe` ระบบสร้าง Stripe Checkout URL แบบ subscription รายเดือน (หรือ one-time เมื่อ `PAYMENT_MODE=payment`)
5. Stripe ส่ง signed webhook ไปที่ `POST /api/payments/webhook`
6. ระบบยืนยัน payment แบบ idempotent แล้วสร้าง Pterodactyl user/server อัตโนมัติ
7. ลูกค้าเห็นสถานะ `active` และลิงก์เข้า Pterodactyl Panel ใน dashboard

## Local setup

```bash
cp .env.example .env
# ใส่ MongoDB, payment webhook secret และ Pterodactyl Application API config
bun install
bun run dev
```

เปิด `http://localhost:3002/register`

## Docker + MongoDB

```bash
cp .env.example .env
# ตั้งค่า provider ใน .env ก่อนเปิดขาย
docker compose up -d --build
curl http://localhost:3002/healthz
```

`/healthz` จะคืน `200` ต่อเมื่อ MongoDB, Pterodactyl และ payment configuration ครบ; ถ้ายังไม่พร้อมจะคืน `503` พร้อมชื่อ check ที่ขาด โดยไม่เปิดเผย secret

## Production requirements

- ต้อง deploy เป็น Bun/Node runtime ที่รัน `server.ts` ได้ ไม่ใช่ static-only Netlify publish
- MongoDB ต้อง reachable จาก runtime
- Pterodactyl Application API token ต้องมีสิทธิ์สร้าง users และ servers
- Payment gateway ต้องตั้ง webhook ให้ส่ง `x-payment-signature` เป็น HMAC-SHA256 ของ raw JSON body
- ถ้าใช้ Stripe ให้ตั้ง `PAYMENT_PROVIDER=stripe`, `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` และเพิ่ม event `checkout.session.completed` ที่ `/api/payments/webhook`; Stripe ต้องส่ง raw body เพื่อ verify signature
- ต้องตั้งค่า nest/egg/location ให้ตรงกับ Pterodactyl จริงก่อนเปิดขาย
- ถ้าแต่ละบริการใช้ Egg คนละตัว ให้ใช้ `PTERO_MINECRAFT_EGG_ID`, `PTERO_WEBHOSTING_EGG_ID`, `PTERO_CODEHOSTING_EGG_ID`, `PTERO_CODESERVER_EGG_ID` พร้อม startup/image/environment ของแต่ละบริการ

ห้าม commit `.env`, token, payment secret หรือ Pterodactyl credentials
