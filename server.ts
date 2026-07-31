import { serve } from 'bun';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import ejs from 'ejs';
import { mongoConfigured } from './lib/db.ts';
import { createUser, getCurrentUser, loginUser, logoutUser } from './lib/auth.ts';
import { catalogForAsync, getStoredSettings, listCatalogAdmin, updateCatalogPackage, updateStoredSettings } from './lib/catalog.ts';
import { confirmPayment, createOrder, listOrders, provisionOrder } from './lib/orders.ts';
import { attachCheckoutSession } from './lib/orders.ts';
import { createStripeCheckout, stripePaymentEvent, verifyStripeWebhook } from './lib/payment.ts';
import { pterodactylConfigured } from './lib/pterodactyl.ts';

const root = process.cwd();
const viewsDir = join(root, 'views');
const publicDir = join(root, 'public');
const dataDir = join(root, 'data');
const settingsPath = join(dataDir, 'settings.json');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function hashAsset(relativePath: string) {
  try {
    const content = readFileSync(join(publicDir, relativePath));
    return createHash('md5').update(content).digest('hex').slice(0, 8);
  } catch {
    return 'dev';
  }
}

function buildAssets() {
  return {
    css: hashAsset('css/styles.css'),
    js: hashAsset('js/app.js')
  };
}

function buildPackageGroups(packages: Array<Record<string, any>> | Record<string, Array<Record<string, any>>>) {
  if (Array.isArray(packages)) {
    return packages.reduce<Record<string, Array<Record<string, any>>>>((groups, pkg) => {
      const cpuModel = pkg.cpuModel || pkg.specs?.find((spec: Record<string, string>) => spec.label === 'CPU Model')?.value || 'Unknown CPU';

      if (!groups[cpuModel]) {
        groups[cpuModel] = [];
      }

      const normalizedPkg = {
        ...pkg,
        cpuModel,
        specs: (pkg.specs || [])
          .filter((spec: Record<string, string>) => spec.label !== 'CPU Model')
          .concat([{ label: 'CPU Model', value: cpuModel }])
      };

      groups[cpuModel].push(normalizedPkg);
      return groups;
    }, {});
  }

  return Object.entries(packages).reduce<Record<string, Array<Record<string, any>>>>((groups, [cpuModel, groupPackages]) => {
    groups[cpuModel] = (Array.isArray(groupPackages) ? groupPackages : []).map((pkg) => {
      const specs = (pkg.specs || []).filter((spec: Record<string, string>) => spec.label !== 'CPU Model');

      return {
        ...pkg,
        cpuModel,
        specs: specs.concat([{ label: 'CPU Model', value: cpuModel }])
      };
    });

    return groups;
  }, {});
}

const defaultSettings = {
  shopName: 'MC Hosting',
  tagline: 'บริการเช่าเซิร์ฟเวอร์ Minecraft PE/BE พร้อมดูแลระบบ',
  logoText: 'MC',
  logoUrl: '',
  primaryColor: '#f97316',
  secondaryColor: '#2563eb',
  heroTitle: 'เช่าเซิร์ฟเวอร์ Minecraft อย่างเป็นระบบ',
  heroSubtitle: 'แพ็กเกจพร้อมใช้งานสำหรับผู้เล่นทั่วไป คอมมูนิตี้ และร้านค้าที่ต้องการเซิร์ฟเวอร์เสถียร รองรับการเติบโต พร้อมทีมดูแลหลังการขาย',
  contactLabel: 'ติดต่อสั่งซื้อ',
  contactUrl: '#',
  announcement: 'เปิดให้บริการทุกวัน พร้อมย้ายข้อมูลเบื้องต้นฟรี',
  footerText: 'บริการโฮสติ้งสำหรับ Minecraft PE/BE',
  eventEnabled: 'true',
  eventTitle: 'Grand Opening Event',
  eventDescription: 'รับส่วนลดเปิดร้านสำหรับแพ็กเกจแรก เมื่อสั่งซื้อก่อนหมดเวลา',
  eventDate: '2026-08-01T20:00',
  eventButtonLabel: 'ดูแพ็กเกจโปรโมชัน',
  eventButtonUrl: '#packages',
  termsTitle: 'ข้อตกลงการใช้บริการ',
  termsContent: 'การสั่งซื้อบริการถือว่าลูกค้ายอมรับเงื่อนไขการใช้งาน การใช้งานต้องไม่ขัดต่อกฎหมาย ไม่รบกวนระบบส่วนรวม และร้านขอสงวนสิทธิ์ในการระงับบริการที่มีพฤติกรรมเสี่ยงต่อความปลอดภัย',
  privacyTitle: 'นโยบายความเป็นส่วนตัว',
  privacyContent: 'ร้านเก็บข้อมูลเท่าที่จำเป็นต่อการให้บริการ เช่น ช่องทางติดต่อ รายละเอียดคำสั่งซื้อ และประวัติการ support ข้อมูลจะไม่ถูกขายหรือส่งต่อให้บุคคลภายนอก ยกเว้นเมื่อจำเป็นต่อการให้บริการหรือข้อกำหนดตามกฎหมาย',
  contactPageTitle: 'ช่องทางติดต่อ',
  contactPageIntro: 'เลือกช่องทางที่สะดวก ทีมงานจะตอบกลับตามลำดับคิวและรายละเอียดที่แจ้งมา',
  contactCards: [
    {
      icon: 'mdi:message-text-outline',
      title: 'สั่งซื้อแพ็กเกจ',
      detail: 'แจ้งแพ็กเกจที่ต้องการ จำนวนผู้เล่น และเวอร์ชันที่ใช้งาน',
      url: '#',
      action: 'ติดต่อสั่งซื้อ'
    },
    {
      icon: 'mdi:lifebuoy',
      title: 'แจ้งปัญหาการใช้งาน',
      detail: 'ส่งรายละเอียดปัญหา เวลาเกิดเหตุ และชื่อเซิร์ฟเวอร์เพื่อให้ตรวจสอบเร็วขึ้น',
      url: '#',
      action: 'แจ้งปัญหา'
    },
    {
      icon: 'mdi:account-tie-outline',
      title: 'ปรึกษาก่อนเลือกแพ็กเกจ',
      detail: 'เหมาะสำหรับผู้ที่ยังไม่แน่ใจเรื่อง CPU, RAM หรือจำนวนผู้เล่น',
      url: '#',
      action: 'ขอคำแนะนำ'
    }
  ],
  discordContacts: [
    {
      name: 'เปิด Ticket ใน Discord',
      description: 'เหมาะสำหรับสั่งซื้อแพ็กเกจใหม่ แจ้งรายละเอียดครบ และรอทีมงานตอบกลับใน ticket',
      url: 'https://discord.gg/your-server'
    },
    {
      name: 'ทักแอดมินผ่าน Discord',
      description: 'เหมาะสำหรับลูกค้าที่ต้องการคุยรายละเอียดก่อนเริ่มใช้งาน',
      url: 'https://discord.com/users/your-user-id'
    }
  ]
};

function readJSON(path: string, fallback: any) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function readSettingsFile() {
  return { ...defaultSettings, ...readJSON(settingsPath, {}) };
}

async function readSettings() {
  const fallback = readSettingsFile();
  return mongoConfigured() ? getStoredSettings(fallback) : fallback;
}

async function jsonBody(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

function errorResponse(error: unknown, status = 400) {
  return jsonResponse({ error: error instanceof Error ? error.message : String(error || 'เกิดข้อผิดพลาด') }, status);
}

async function catalogForDashboard() {
  const labels: Record<string, string> = { minecraft: 'Minecraft Server', webhosting: 'Web Hosting', codehosting: 'Code Hosting', codeserver: 'Code Server' };
  return Promise.all(Object.entries(labels).map(async ([type, label]) => ({ type, label, packages: mongoConfigured() ? await catalogForAsync(type) : [] })));
}

function paymentCheckoutUrl(orderId: string) {
  const template = String(process.env.PAYMENT_CHECKOUT_URL_TEMPLATE || '').trim();
  return template ? template.replaceAll('{orderId}', encodeURIComponent(orderId)) : null;
}

function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = String(process.env.PAYMENT_WEBHOOK_SECRET || '');
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function stripText(value: string, maxLength = 180) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function absoluteUrl(origin: string, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function buildMeta(settings: any, origin: string, path: string, title?: string, description?: string) {
  const pageTitle = title || `${settings.shopName} | Minecraft Server Hosting`;
  const pageDescription = stripText(description || settings.heroSubtitle || settings.tagline);
  const icon = settings.logoUrl || absoluteUrl(origin, '/favicon.svg');
  const image = settings.ogImageUrl || absoluteUrl(origin, '/og-card.svg');
  const canonical = absoluteUrl(origin, path);

  return {
    title: pageTitle,
    description: pageDescription,
    canonical,
    icon,
    image: absoluteUrl(origin, image),
    siteName: settings.shopName
  };
}

function escapeSvg(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function renderFavicon() {
  const settings = await readSettings();
  const logoText = escapeSvg(settings.logoText || 'MC').slice(0, 4);
  const primary = /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor) ? settings.primaryColor : '#f97316';
  const secondary = /^#[0-9a-fA-F]{6}$/.test(settings.secondaryColor) ? settings.secondaryColor : '#2563eb';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#g)"/>
  <text x="64" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="#fff">${logoText}</text>
</svg>`;
}

async function renderOgCard() {
  const settings = await readSettings();
  const primary = /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor) ? settings.primaryColor : '#f97316';
  const secondary = /^#[0-9a-fA-F]{6}$/.test(settings.secondaryColor) ? settings.secondaryColor : '#2563eb';
  const title = escapeSvg(settings.shopName || 'Minecraft Server Hosting');
  const description = escapeSvg(stripText(settings.heroSubtitle || settings.tagline, 150));
  const logoText = escapeSvg(settings.logoText || 'MC').slice(0, 4);
  const logoImage = settings.logoUrl
    ? `<image href="${escapeSvg(settings.logoUrl)}" x="78" y="78" width="132" height="132" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)"/>`
    : `<text x="144" y="162" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="#fff">${logoText}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${secondary}"/>
    </linearGradient>
    <clipPath id="logoClip">
      <rect x="78" y="78" width="132" height="132" rx="30"/>
    </clipPath>
  </defs>
  <rect width="1200" height="630" fill="#f8fafc"/>
  <rect x="34" y="34" width="1132" height="562" rx="38" fill="url(#bg)"/>
  <circle cx="1030" cy="98" r="178" fill="#ffffff" opacity="0.12"/>
  <circle cx="102" cy="552" r="230" fill="#ffffff" opacity="0.10"/>
  <rect x="78" y="78" width="132" height="132" rx="30" fill="#111827" opacity="0.20"/>
  ${logoImage}
  <text x="78" y="288" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#fff" opacity="0.88">Minecraft PE/BE Server Hosting</text>
  <text x="78" y="374" font-family="Arial, sans-serif" font-size="70" font-weight="900" fill="#fff">${title}</text>
  <foreignObject x="78" y="414" width="860" height="120">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;font-size:32px;line-height:1.35;color:rgba(255,255,255,.86);font-weight:500;">${description}</div>
  </foreignObject>
  <text x="78" y="548" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#fff" opacity="0.92">Ptero game panel • NVMe SSD • พร้อมดูแลหลังการขาย</text>
</svg>`;
}

async function renderIndex(origin: string) {
  const templatePath = join(viewsDir, 'index.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const settings = await readSettings();
  const meta = buildMeta(settings, origin, '/', `${settings.shopName} | Online Services`, settings.heroSubtitle);
  return ejs.render(template, { settings, meta, assets: buildAssets() });
}

async function renderMinecraft(origin: string) {
  const templatePath = join(viewsDir, 'minecraft.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const packages = mongoConfigured() ? await catalogForAsync('minecraft') : readJSON(join(dataDir, 'packages.json'), []);
  const packageGroups = buildPackageGroups(packages);
  const settings = await readSettings();
  const meta = buildMeta(settings, origin, '/minecraft', `${settings.shopName} | Minecraft Server Hosting`, 'เช่าเซิร์ฟเวอร์ Minecraft PE/BE พร้อมดูแล');
  return ejs.render(template, { packages, packageGroups, settings, meta, assets: buildAssets() });
}

async function renderServers(origin: string) {
  const templatePath = join(viewsDir, 'servers.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const servers = readJSON(join(dataDir, 'servers.json'), []);
  const settings = await readSettings();
  const meta = buildMeta(settings, origin, '/servers', `รายการเซิร์ฟเวอร์ | ${settings.shopName}`, 'ตรวจสอบสเปกเครื่องหลักที่ใช้รองรับแพ็กเกจ Minecraft Server Hosting');
  return ejs.render(template, { servers, settings, meta, serversJSON: JSON.stringify(servers, null, 2), assets: buildAssets() });
}

async function renderContentPage(kind: 'terms' | 'privacy', origin: string) {
  const templatePath = join(viewsDir, 'content-page.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const settings = await readSettings();
  const page = kind === 'terms'
    ? { title: settings.termsTitle, content: settings.termsContent, eyebrow: 'Terms of Service' }
    : { title: settings.privacyTitle, content: settings.privacyContent, eyebrow: 'Privacy Policy' };
  const meta = buildMeta(settings, origin, `/${kind}`, `${page.title} | ${settings.shopName}`, page.content);

  return ejs.render(template, { settings, page, meta, activePath: `/${kind}`, assets: buildAssets() });
}

async function renderContact(origin: string) {
  const templatePath = join(viewsDir, 'contact.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const settings = await readSettings();
  const meta = buildMeta(settings, origin, '/contact', `${settings.contactPageTitle} | ${settings.shopName}`, settings.contactPageIntro);
  return ejs.render(template, { settings, meta, assets: buildAssets() });
}

async function renderAuth(origin: string, register = false) {
  const template = readFileSync(join(viewsDir, 'auth.ejs'), 'utf8');
  const settings = await readSettings();
  return ejs.render(template, { settings, register, title: register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ', meta: buildMeta(settings, origin, register ? '/register' : '/login'), assets: buildAssets() });
}

async function renderDashboard(origin: string, user: Record<string, string>) {
  const template = readFileSync(join(viewsDir, 'dashboard.ejs'), 'utf8');
  const settings = await readSettings();
  return ejs.render(template, { settings, user, catalog: await catalogForDashboard(), meta: buildMeta(settings, origin, '/dashboard'), assets: buildAssets() });
}

async function renderServicePage(kind: 'webhosting' | 'codehosting' | 'codeserver', origin: string) {
  const templatePath = join(viewsDir, `${kind}.ejs`);
  const template = readFileSync(templatePath, 'utf8');
  const packages = mongoConfigured() ? await catalogForAsync(kind) : readJSON(join(dataDir, `${kind}.json`), {});
  const packageGroups = buildPackageGroups(packages);
  const settings = await readSettings();
  const labels: Record<string, { title: string; description: string }> = {
    webhosting: { title: 'Web Hosting', description: 'บริการเช่า Web Hosting รองรับ PHP/HTML' },
    codehosting: { title: 'Code Hosting', description: 'บริการ Code Hosting สำหรับรัน backend, API, bot' },
    codeserver: { title: 'Code Server', description: 'บริการ VS Code Server สำหรับพัฒนาในเบราว์เซอร์' }
  };
  const label = labels[kind];
  const meta = buildMeta(settings, origin, `/${kind}`, `${label.title} | ${settings.shopName}`, label.description);
  return ejs.render(template, { packages, packageGroups, settings, meta, assets: buildAssets() });
}

async function adminUser(req: Request) {
  const user = await getCurrentUser(req);
  if (!user || user.role !== 'admin') return null;
  return user;
}

async function renderAdmin(origin: string, user: Record<string, string>, packages: any[]) {
  const template = readFileSync(join(viewsDir, 'admin.ejs'), 'utf8');
  const settings = await readSettings();
  return ejs.render(template, { settings, user, packages, meta: buildMeta(settings, origin, '/admin'), assets: buildAssets() });
}

const server = serve({
  port: Number(process.env.PORT || 3002),
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/healthz' && req.method === 'GET') {
      const stripeReady = String(process.env.PAYMENT_PROVIDER || '').toLowerCase() === 'stripe'
        ? Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.APP_URL)
        : Boolean(process.env.PAYMENT_WEBHOOK_SECRET);
      const checks = { mongo: mongoConfigured(), pterodactyl: pterodactylConfigured(), payment: stripeReady };
      return jsonResponse({ ok: Object.values(checks).every(Boolean), checks }, Object.values(checks).every(Boolean) ? 200 : 503);
    }

    if (url.pathname === '/favicon.svg') {
      return new Response(await renderFavicon(), {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    if (url.pathname === '/og-card.svg') {
      return new Response(await renderOgCard(), {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    if (url.pathname === '/') {
      const html = await renderIndex(url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/login' || url.pathname === '/register') {
      const html = await renderAuth(url.origin, url.pathname === '/register');
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/dashboard') {
      if (!mongoConfigured()) return new Response('ระบบสมาชิกยังไม่ได้เชื่อมต่อ MongoDB', { status: 503 });
      try {
        const user = await getCurrentUser(req);
        if (!user) return Response.redirect(`${url.origin}/login`, 302);
        const html = await renderDashboard(url.origin, user);
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      } catch (error) { return new Response(error instanceof Error ? error.message : 'Database unavailable', { status: 503 }); }
    }

    if (url.pathname === '/admin/login') {
      const html = await renderAuth(url.origin, false);
      return new Response(html.replace('Horari Customer Account', 'Horari Admin Login').replace('เข้าสู่ระบบเพื่อจัดการคำสั่งซื้อและเซิร์ฟเวอร์', 'เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ admin'), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/admin' && req.method === 'GET') {
      if (!mongoConfigured()) return new Response('ระบบหลังบ้านต้องเชื่อมต่อ MongoDB ก่อน', { status: 503 });
      const user = await adminUser(req);
      if (!user) return Response.redirect(`${url.origin}/admin/login`, 302);
      try { return new Response(await renderAdmin(url.origin, user, await listCatalogAdmin()), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }
      catch (error) { return new Response(error instanceof Error ? error.message : 'Database unavailable', { status: 503 }); }
    }

    if (url.pathname === '/api/admin/settings' && req.method === 'PATCH') {
      if (!await adminUser(req)) return errorResponse('ไม่มีสิทธิ์ผู้ดูแลระบบ', 403);
      try { await updateStoredSettings(await jsonBody(req)); return jsonResponse({ ok: true }); }
      catch (error) { return errorResponse(error, 400); }
    }

    const adminPackageMatch = url.pathname.match(/^\/api\/admin\/packages\/([a-f0-9]{24})$/i);
    if (adminPackageMatch && req.method === 'PATCH') {
      if (!await adminUser(req)) return errorResponse('ไม่มีสิทธิ์ผู้ดูแลระบบ', 403);
      try { await updateCatalogPackage(adminPackageMatch[1], await jsonBody(req)); return jsonResponse({ ok: true }); }
      catch (error) { return errorResponse(error, 400); }
    }

    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      if (!mongoConfigured()) return errorResponse('ระบบสมาชิกยังไม่ได้ตั้งค่า MongoDB', 503);
      try {
        const body = await jsonBody(req);
        const user = await createUser(body.name, body.email, body.password);
        const session = await loginUser(body.email, body.password);
        return jsonResponse({ user }, 201, { 'Set-Cookie': session.cookie });
      } catch (error) { return errorResponse(error, 400); }
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      if (!mongoConfigured()) return errorResponse('ระบบสมาชิกยังไม่ได้ตั้งค่า MongoDB', 503);
      try {
        const body = await jsonBody(req);
        const session = await loginUser(body.email, body.password);
        return jsonResponse({ user: session.user }, 200, { 'Set-Cookie': session.cookie });
      } catch (error) { return errorResponse(error, 401); }
    }

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      try { return jsonResponse({ ok: true }, 200, { 'Set-Cookie': await logoutUser(req) }); }
      catch (error) { return errorResponse(error, 503); }
    }

    if (url.pathname === '/api/orders' && req.method === 'GET') {
      try {
        const user = await getCurrentUser(req);
        if (!user) return errorResponse('กรุณาเข้าสู่ระบบ', 401);
        const orders = await listOrders(user.id);
        return jsonResponse({ orders });
      } catch (error) { return errorResponse(error, 503); }
    }

    if (url.pathname === '/api/orders' && req.method === 'POST') {
      try {
        const user = await getCurrentUser(req);
        if (!user) return errorResponse('กรุณาเข้าสู่ระบบ', 401);
        const body = await jsonBody(req);
        const order = await createOrder(user.id, body.serviceType, body.packageId, body.serverName);
        let payment = { provider: process.env.PAYMENT_PROVIDER || 'external-webhook', status: 'pending', checkoutUrl: paymentCheckoutUrl(order.id) as string | null };
        if (String(process.env.PAYMENT_PROVIDER || '').toLowerCase() === 'stripe') {
          const session = await createStripeCheckout({ orderId: order.id, email: user.email, packageName: `${order.package.name} Server`, amount: order.amount });
          await attachCheckoutSession(order.id, session);
          payment = { provider: 'stripe', status: 'checkout_created', checkoutUrl: session.url };
        }
        return jsonResponse({ order, payment }, 201);
      } catch (error) { return errorResponse(error, 400); }
    }

    const provisionMatch = url.pathname.match(/^\/api\/orders\/([a-f0-9]{24})\/provision$/i);
    if (provisionMatch && req.method === 'POST') {
      try {
        const user = await getCurrentUser(req);
        if (!user) return errorResponse('กรุณาเข้าสู่ระบบ', 401);
        const orders = await listOrders(user.id);
        const owned = orders.find((order) => order._id?.toString() === provisionMatch[1]);
        if (!owned) return errorResponse('ไม่พบคำสั่งซื้อของบัญชีนี้', 404);
        const order = await provisionOrder(provisionMatch[1]);
        return jsonResponse({ order });
      } catch (error) { return errorResponse(error, 400); }
    }

    if (url.pathname === '/api/payments/webhook' && req.method === 'POST') {
      const rawBody = await req.text();
      if (String(process.env.PAYMENT_PROVIDER || '').toLowerCase() === 'stripe') {
        if (!verifyStripeWebhook(rawBody, req.headers.get('stripe-signature') || '')) return errorResponse('ลายเซ็น Stripe webhook ไม่ถูกต้อง', 401);
        try {
          const event = stripePaymentEvent(rawBody);
          if (!event) return jsonResponse({ ok: true, ignored: true });
          const order = await confirmPayment(event.orderId, event.paymentId);
          try { await provisionOrder(event.orderId); }
          catch (error) { console.error('Provisioning deferred:', error); }
          return jsonResponse({ ok: true, orderId: order?._id?.toString(), event: event.eventType });
        } catch (error) { return errorResponse(error, 400); }
      }
      if (!verifyWebhookSignature(rawBody, req.headers.get('x-payment-signature') || '')) return errorResponse('ลายเซ็น webhook ไม่ถูกต้อง', 401);
      try {
        const body = JSON.parse(rawBody);
        if (body.status !== 'paid' || !body.orderId || !body.paymentId) return errorResponse('ข้อมูล payment webhook ไม่ครบ', 400);
        const order = await confirmPayment(String(body.orderId), String(body.paymentId));
        try { await provisionOrder(String(body.orderId)); }
        catch (error) { console.error('Provisioning deferred:', error); }
        return jsonResponse({ ok: true, orderId: order?._id?.toString(), status: 'accepted' });
      } catch (error) { return errorResponse(error, 400); }
    }

    if (url.pathname === '/minecraft') {
      const html = await renderMinecraft(url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/servers') {
      const html = await renderServers(url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/terms') {
      const html = await renderContentPage('terms', url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/privacy') {
      const html = await renderContentPage('privacy', url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/contact') {
      const html = await renderContact(url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/webhosting' || url.pathname === '/codehosting' || url.pathname === '/codeserver') {
      const kind = url.pathname.slice(1) as 'webhosting' | 'codehosting' | 'codeserver';
      const html = await renderServicePage(kind, url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const publicPath = join(publicDir, url.pathname.replace(/^\//, ''));

    if (!existsSync(publicPath)) {
      return new Response('Not Found', { status: 404 });
    }

    const ext = publicPath.slice(publicPath.lastIndexOf('.'));
    const contentType = mimeTypes[ext] || 'text/plain; charset=utf-8';
    const body = readFileSync(publicPath);

    return new Response(body, { headers: { 'Content-Type': contentType } });
  }
});

console.log(`Bun server running at http://localhost:${server.port}`);
