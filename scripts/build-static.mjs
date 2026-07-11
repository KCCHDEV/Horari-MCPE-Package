import ejs from 'ejs';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const viewsDir = join(root, 'views');
const publicDir = join(root, 'public');
const dataDir = join(root, 'data');
const distDir = join(root, 'dist');

const siteOrigin = normalizeOrigin(
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  process.env.SITE_URL ||
  'http://localhost:8888'
);

function normalizeOrigin(value) {
  return String(value || '').replace(/\/+$/, '');
}

function readJSON(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function stripText(value, maxLength = 180) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function absoluteUrl(origin, pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function escapeSvg(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPackageGroups(packages) {
  if (Array.isArray(packages)) {
    return packages.reduce((groups, pkg) => {
      const cpuModel = pkg.specs?.find((spec) => spec.label === 'CPU Model')?.value || 'Unknown CPU';
      groups[cpuModel] ||= [];

      groups[cpuModel].push({
        ...pkg,
        cpuModel,
        specs: (pkg.specs || [])
          .filter((spec) => spec.label !== 'CPU Model')
          .concat([{ label: 'CPU Model', value: cpuModel }])
      });

      return groups;
    }, {});
  }

  return Object.entries(packages || {}).reduce((groups, [cpuModel, groupPackages]) => {
    groups[cpuModel] = (Array.isArray(groupPackages) ? groupPackages : []).map((pkg) => {
      const specs = (pkg.specs || []).filter((spec) => spec.label !== 'CPU Model');

      return {
        ...pkg,
        cpuModel,
        specs: specs.concat([{ label: 'CPU Model', value: cpuModel }])
      };
    });

    return groups;
  }, {});
}

function buildMeta(settings, path, title, description) {
  const pageTitle = title || `${settings.shopName} | Minecraft Server Hosting`;
  const pageDescription = stripText(description || settings.heroSubtitle || settings.tagline);
  const icon = settings.logoUrl || absoluteUrl(siteOrigin, '/favicon.svg');
  const image = settings.ogImageUrl || absoluteUrl(siteOrigin, '/og-card.svg');

  return {
    title: pageTitle,
    description: pageDescription,
    canonical: absoluteUrl(siteOrigin, path),
    icon,
    image: absoluteUrl(siteOrigin, image),
    siteName: settings.shopName
  };
}

function validHex(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function renderFavicon(settings) {
  const logoText = escapeSvg(settings.logoText || 'MC').slice(0, 4);
  const primary = validHex(settings.primaryColor, '#f97316');
  const secondary = validHex(settings.secondaryColor, '#2563eb');

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

function renderOgCard(settings) {
  const primary = validHex(settings.primaryColor, '#f97316');
  const secondary = validHex(settings.secondaryColor, '#2563eb');
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

function renderTemplate(name, data) {
  const template = readFileSync(join(viewsDir, name), 'utf8');
  return ejs.render(template, data);
}

function renderPages() {
  const settings = readJSON(join(dataDir, 'settings.json'), {});
  const packages = readJSON(join(dataDir, 'packages.json'), []);
  const servers = readJSON(join(dataDir, 'servers.json'), []);
  const packageGroups = buildPackageGroups(packages);

  writeFile(
    join(distDir, 'index.html'),
    renderTemplate('index.ejs', {
      packages,
      packageGroups,
      settings,
      meta: buildMeta(settings, '/', `${settings.shopName} | Minecraft Server Hosting`, settings.heroSubtitle)
    })
  );

  writeFile(
    join(distDir, 'servers', 'index.html'),
    renderTemplate('servers.ejs', {
      servers,
      settings,
      serversJSON: JSON.stringify(servers, null, 2),
      meta: buildMeta(settings, '/servers', `รายการเซิร์ฟเวอร์ | ${settings.shopName}`, 'ตรวจสอบสเปกเครื่องหลักที่ใช้รองรับแพ็กเกจ Minecraft Server Hosting')
    })
  );

  for (const kind of ['terms', 'privacy']) {
    const page = kind === 'terms'
      ? { title: settings.termsTitle, content: settings.termsContent, eyebrow: 'Terms of Service' }
      : { title: settings.privacyTitle, content: settings.privacyContent, eyebrow: 'Privacy Policy' };

    writeFile(
      join(distDir, kind, 'index.html'),
      renderTemplate('content-page.ejs', {
        settings,
        page,
        activePath: `/${kind}`,
        meta: buildMeta(settings, `/${kind}`, `${page.title} | ${settings.shopName}`, page.content)
      })
    );
  }

  writeFile(
    join(distDir, 'contact', 'index.html'),
    renderTemplate('contact.ejs', {
      settings,
      meta: buildMeta(settings, '/contact', `${settings.contactPageTitle} | ${settings.shopName}`, settings.contactPageIntro)
    })
  );

  writeFile(join(distDir, 'favicon.svg'), renderFavicon(settings));
  writeFile(join(distDir, 'og-card.svg'), renderOgCard(settings));
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

if (existsSync(publicDir)) {
  cpSync(publicDir, distDir, { recursive: true });
}

renderPages();
console.log(`Built static site in dist using origin ${siteOrigin}`);
