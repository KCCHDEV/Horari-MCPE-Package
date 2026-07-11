import { serve } from 'bun';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import ejs from 'ejs';

const root = import.meta.dir;
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
      const cpuModel = pkg.specs?.find((spec: Record<string, string>) => spec.label === 'CPU Model')?.value || 'Unknown CPU';

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

function readSettings() {
  return { ...defaultSettings, ...readJSON(settingsPath, {}) };
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

function renderFavicon() {
  const settings = readSettings();
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

function renderOgCard() {
  const settings = readSettings();
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

function renderIndex(origin: string) {
  const templatePath = join(viewsDir, 'index.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const packages = readJSON(join(dataDir, 'packages.json'), []);
  const packageGroups = buildPackageGroups(packages);
  const settings = readSettings();
  const meta = buildMeta(settings, origin, '/', `${settings.shopName} | Minecraft Server Hosting`, settings.heroSubtitle);
  return ejs.render(template, { packages, packageGroups, settings, meta, assets: buildAssets() });
}

function renderServers(origin: string) {
  const templatePath = join(viewsDir, 'servers.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const servers = readJSON(join(dataDir, 'servers.json'), []);
  const settings = readSettings();
  const meta = buildMeta(settings, origin, '/servers', `รายการเซิร์ฟเวอร์ | ${settings.shopName}`, 'ตรวจสอบสเปกเครื่องหลักที่ใช้รองรับแพ็กเกจ Minecraft Server Hosting');
  return ejs.render(template, { servers, settings, meta, serversJSON: JSON.stringify(servers, null, 2), assets: buildAssets() });
}

function renderContentPage(kind: 'terms' | 'privacy', origin: string) {
  const templatePath = join(viewsDir, 'content-page.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const settings = readSettings();
  const page = kind === 'terms'
    ? { title: settings.termsTitle, content: settings.termsContent, eyebrow: 'Terms of Service' }
    : { title: settings.privacyTitle, content: settings.privacyContent, eyebrow: 'Privacy Policy' };
  const meta = buildMeta(settings, origin, `/${kind}`, `${page.title} | ${settings.shopName}`, page.content);

  return ejs.render(template, { settings, page, meta, activePath: `/${kind}`, assets: buildAssets() });
}

function renderContact(origin: string) {
  const templatePath = join(viewsDir, 'contact.ejs');
  const template = readFileSync(templatePath, 'utf8');
  const settings = readSettings();
  const meta = buildMeta(settings, origin, '/contact', `${settings.contactPageTitle} | ${settings.shopName}`, settings.contactPageIntro);
  return ejs.render(template, { settings, meta, assets: buildAssets() });
}

const server = serve({
  port: Number(process.env.PORT || 3002),
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/favicon.svg') {
      return new Response(renderFavicon(), {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    if (url.pathname === '/og-card.svg') {
      return new Response(renderOgCard(), {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    if (url.pathname === '/') {
      const html = renderIndex(url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/servers') {
      const html = renderServers(url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/terms') {
      const html = renderContentPage('terms', url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/privacy') {
      const html = renderContentPage('privacy', url.origin);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/contact') {
      const html = renderContact(url.origin);
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
