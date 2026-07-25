# Production setup checklist

เอกสารนี้ใช้สำหรับ DEV/ผู้ดูแลระบบก่อนเปิดขายจริง

## 1. Runtime

ใช้ host ที่รัน Bun ได้ หรือใช้ Docker Compose:

```bash
cp .env.example .env
docker compose up -d --build
curl -i https://YOUR_DOMAIN/healthz
```

ต้องได้ `200` และ checks ทั้งหมดเป็น `true` ก่อนเปิดปุ่มสั่งซื้อ

## 2. MongoDB

ตั้งค่า:

```env
MONGODB_URI=mongodb://mongo:27017
MONGODB_DB=horari_service
```

Production ควรใช้ MongoDB Atlas หรือ MongoDB ที่มี authentication, backup และ network allowlist

## 3. Stripe

ตั้งค่า:

```env
PAYMENT_PROVIDER=stripe
PAYMENT_MODE=subscription
APP_URL=https://YOUR_DOMAIN
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

สร้าง webhook endpoint:

```text
https://YOUR_DOMAIN/api/payments/webhook
```

เปิด event อย่างน้อย:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.paid`

ห้าม mark order เป็น paid จากหน้า success redirect; ให้เชื่อถือ webhook ที่ตรวจ signature แล้วเท่านั้น

## 4. Pterodactyl

ตั้งค่า Application API token ที่สร้างจาก Admin API และกำหนด Nest/Egg/Location ให้ตรงกับ Panel:

```env
PTERO_URL=https://panel.example.com
PTERO_APPLICATION_TOKEN=...
PTERO_NEST_ID=1
PTERO_EGG_ID=1
PTERO_LOCATION_ID=1
```

ถ้าแต่ละบริการใช้ Egg ต่างกัน ให้เพิ่ม override เช่น `PTERO_WEBHOSTING_EGG_ID`, `PTERO_CODEHOSTING_EGG_ID` และ startup/image/environment ของบริการนั้น

## 5. Controlled purchase

1. สร้าง test customer
2. สั่งแพ็กเกจราคาต่ำสุด
3. จ่ายด้วย Stripe test mode
4. ตรวจ order: `pending_payment → payment_confirmed → provisioning → active`
5. ตรวจ Pterodactyl มี user ตามอีเมล และ server มี `external_id=order-...`
6. เปิด Panel ด้วยอีเมลเดียวกัน ถ้ายังไม่มี password ให้ใช้ Forgot password
7. ตรวจ server start และ resource limits
8. ทดสอบ webhook ซ้ำ ต้องไม่สร้าง server ซ้ำ

ห้ามเปิด live mode จนกว่าขั้นตอนนี้ผ่านและมี backup MongoDB แล้ว
