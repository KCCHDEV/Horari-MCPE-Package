# Horari Service Online

เว็บ Next.js 16 สำหรับสั่งซื้อบริการโฮสติ้งแบบมีบัญชีลูกค้าและ provisioning ผ่าน Pterodactyl

## Next.js 16 runtime

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000` โดย Next.js App Router เป็นตัวรันหลัก และ API อยู่ใน `app/api/[...path]/route.ts` ใช้ Node.js 20.9+ ตามข้อกำหนดของ Next.js 16

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

เปิด `http://localhost:3000/register`

## หลังบ้านจัดการราคาและ Event

เมื่อเชื่อม MongoDB แล้ว ให้สมัครบัญชีแรกผ่าน `/register` บัญชีแรกจะได้ `role=admin` อัตโนมัติ จากนั้นเข้า `/admin` ได้ทันที บัญชีถัดไปจะเป็น `customer`

```js
db.users.updateOne({ email: "อีเมลแอดมิน" }, { $set: { role: "admin" } })
```

เข้า `/admin` เพื่อแก้ชื่อ/วันสิ้นสุด Event, เปิด/ปิด Event, ราคาปกติ, ราคาลด หรือเปอร์เซ็นต์ส่วนลดของทุกแพ็กเกจ ระบบจะ seed แพ็กเกจจาก `data/*.json` เข้า collection `catalog_packages` ครั้งแรก และหลังจากนั้นใช้ค่าจาก MongoDB เป็นหลัก

หมายเหตุ: หน้า static ที่ build ด้วย Netlify ใช้ข้อมูลจาก `data/*.json` ตอน build จึงไม่รับราคาใหม่แบบ realtime; ถ้าต้องการให้แก้จากหลังบ้านแล้วหน้าแพ็กเกจเปลี่ยนทันที ต้องเปิดเว็บผ่าน Bun runtime ที่เชื่อม MongoDB

## Docker + MongoDB

```bash
cp .env.example .env
# ตั้งค่า provider ใน .env ก่อนเปิดขาย
docker compose up -d --build
curl http://localhost:3002/healthz
```

`/healthz` จะคืน `200` ต่อเมื่อ MongoDB, Pterodactyl และ payment configuration ครบ; ถ้ายังไม่พร้อมจะคืน `503` พร้อมชื่อ check ที่ขาด โดยไม่เปิดเผย secret

## Production requirements

- ต้อง deploy เป็น Next.js Node runtime/Netlify Next.js runtime ไม่ใช่ static-only publish
- MongoDB ต้อง reachable จาก runtime
- Pterodactyl Application API token ต้องมีสิทธิ์สร้าง users และ servers
- Payment gateway ต้องตั้ง webhook ให้ส่ง `x-payment-signature` เป็น HMAC-SHA256 ของ raw JSON body
- ถ้าใช้ Stripe ให้ตั้ง `PAYMENT_PROVIDER=stripe`, `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` และเพิ่ม event `checkout.session.completed` ที่ `/api/payments/webhook`; Stripe ต้องส่ง raw body เพื่อ verify signature
- ต้องตั้งค่า nest/egg/location ให้ตรงกับ Pterodactyl จริงก่อนเปิดขาย
- ถ้าแต่ละบริการใช้ Egg คนละตัว ให้ใช้ `PTERO_MINECRAFT_EGG_ID`, `PTERO_WEBHOSTING_EGG_ID`, `PTERO_CODEHOSTING_EGG_ID`, `PTERO_CODESERVER_EGG_ID` พร้อม startup/image/environment ของแต่ละบริการ

ห้าม commit `.env`, token, payment secret หรือ Pterodactyl credentials
