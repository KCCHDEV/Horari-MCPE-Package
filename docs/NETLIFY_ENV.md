# Netlify Environment Variables

ตั้งค่าที่ Netlify Site configuration → Environment variables:

```env
MONGODB_URI=<วาง MongoDB URI ที่ได้รับจากเจ้าของระบบ>
MONGODB_DB=horari_service
```

บัญชีที่สมัครสำเร็จเป็นบัญชีแรกในฐานข้อมูลจะได้ `role=admin` อัตโนมัติ เพื่อเข้า `/admin` และตั้งราคา/Event ได้ทันที บัญชีถัดไปจะเป็น `customer`

ค่าที่ต้องใส่ใน runtime ของเว็บหลังบ้านเพิ่มเติม:

```env
PORT=3002
APP_URL=https://โดเมนจริงของร้าน
```

## Runtime ที่ใช้ตอนนี้

โปรเจกต์ถูกย้ายไป Next.js 16 แล้ว และ `netlify.toml` ใช้ `@netlify/plugin-nextjs` เพื่อให้ `/admin`, `/api/auth/*` และ `/api/orders` ทำงานผ่าน Next.js runtime ได้

ต้องตั้งค่า environment variables ใน Netlify production context และ deploy ใหม่หลังแก้ค่า

ห้าม commit ค่า `MONGODB_URI` จริงลง Git และควรเปลี่ยนรหัสผ่าน MongoDB หาก URI ถูกส่งต่อในช่องทางที่ไม่ใช่ secret manager
