import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ejs from 'ejs';
import { mongoConfigured } from './db';
import { catalogForAsync, getStoredSettings, listCatalogAdmin } from './catalog';

const root = process.cwd();
const viewsDir = join(root, 'views');
const dataDir = join(root, 'data');

function readJSON(path: string, fallback: any = {}) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

export async function siteSettings() {
  const fallback = readJSON(join(dataDir, 'settings.json'), {});
  return mongoConfigured() ? getStoredSettings(fallback) : fallback;
}

function buildPackageGroups(packages: any[] | Record<string, any[]>) {
  if (Array.isArray(packages)) {
    return packages.reduce<Record<string, any[]>>((groups, pkg) => {
      const group = pkg.cpuModel || pkg.specs?.find((item: any) => item.label === 'CPU Model')?.value || 'Unknown CPU';
      groups[group] ||= [];
      groups[group].push({ ...pkg, cpuModel: group, specs: (pkg.specs || []).filter((item: any) => item.label !== 'CPU Model').concat([{ label: 'CPU Model', value: group }]) });
      return groups;
    }, {});
  }
  return Object.entries(packages || {}).reduce<Record<string, any[]>>((groups, [group, list]) => {
    groups[group] = (Array.isArray(list) ? list : []).map((pkg) => ({ ...pkg, cpuModel: group, specs: (pkg.specs || []).filter((item: any) => item.label !== 'CPU Model').concat([{ label: 'CPU Model', value: group }]) }));
    return groups;
  }, {});
}

function meta(settings: any, path: string, title?: string) {
  const origin = process.env.APP_URL || 'http://localhost:3000';
  return {
    title: title || `${settings.shopName} | Minecraft Server Hosting`,
    description: settings.heroSubtitle || settings.tagline || '',
    canonical: `${origin.replace(/\/$/, '')}${path}`,
    icon: settings.logoUrl || '/favicon.svg',
    image: settings.ogImageUrl || '/og-card.svg',
    siteName: settings.shopName
  };
}

function extract(html: string) {
  const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]).join('\n');
  const scripts: Array<{ src?: string; content?: string }> = [];
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = match[1].match(/src=["']([^"']+)["']/i)?.[1];
    if (src && !src.includes('/js/app.js')) scripts.push({ src });
    if (!src && match[2].trim()) scripts.push({ content: match[2] });
  }
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  return { body: body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ''), styles, scripts };
}

async function render(view: string, data: Record<string, any>) {
  const html = ejs.render(readFileSync(join(viewsDir, view), 'utf8'), data);
  return extract(html);
}

export async function renderRoute(pathname: string, user?: Record<string, string>) {
  const settings = await siteSettings();
  const assets = { css: 'next', js: 'next' };
  if (pathname === '/') return render('index.ejs', { settings, meta: meta(settings, '/', `${settings.shopName} | Online Services`), assets });
  if (pathname === '/minecraft') {
    const packages = mongoConfigured() ? await catalogForAsync('minecraft') : readJSON(join(dataDir, 'packages.json'), []);
    return render('minecraft.ejs', { packages, packageGroups: buildPackageGroups(packages), settings, meta: meta(settings, '/minecraft', `${settings.shopName} | Minecraft Server Hosting`), assets });
  }
  if (pathname === '/servers') {
    const servers = readJSON(join(dataDir, 'servers.json'), []);
    return render('servers.ejs', { servers, settings, serversJSON: JSON.stringify(servers, null, 2), meta: meta(settings, '/servers', `รายการเซิร์ฟเวอร์ | ${settings.shopName}`), assets });
  }
  if (pathname === '/contact') return render('contact.ejs', { settings, meta: meta(settings, '/contact', `${settings.contactPageTitle} | ${settings.shopName}`), assets });
  if (pathname === '/terms' || pathname === '/privacy') {
    const kind = pathname.slice(1);
    const page = kind === 'terms' ? { title: settings.termsTitle, content: settings.termsContent, eyebrow: 'Terms of Service' } : { title: settings.privacyTitle, content: settings.privacyContent, eyebrow: 'Privacy Policy' };
    return render('content-page.ejs', { settings, page, activePath: pathname, meta: meta(settings, pathname, `${page.title} | ${settings.shopName}`), assets });
  }
  if (['webhosting', 'codehosting', 'codeserver'].includes(pathname.slice(1))) {
    const kind = pathname.slice(1) as 'webhosting' | 'codehosting' | 'codeserver';
    const labels: Record<string, string> = { webhosting: 'Web Hosting', codehosting: 'Code Hosting', codeserver: 'Code Server' };
    const packages = mongoConfigured() ? await catalogForAsync(kind) : readJSON(join(dataDir, `${kind}.json`), {});
    return render(`${kind}.ejs`, { packages, packageGroups: buildPackageGroups(packages), settings, meta: meta(settings, pathname, `${labels[kind]} | ${settings.shopName}`), assets });
  }
  if (pathname === '/login' || pathname === '/register' || pathname === '/admin/login') {
    const register = pathname === '/register';
    return render('auth.ejs', { settings, register, title: register ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ', meta: meta(settings, pathname), assets });
  }
  if (pathname === '/admin') return render('admin.ejs', { settings, user, packages: await listCatalogAdmin(), meta: meta(settings, pathname), assets });
  if (pathname === '/dashboard') {
    const labels: Record<string, string> = { minecraft: 'Minecraft Server', webhosting: 'Web Hosting', codehosting: 'Code Hosting', codeserver: 'Code Server' };
    const catalog = await Promise.all(Object.entries(labels).map(async ([type, label]) => ({ type, label, packages: mongoConfigured() ? await catalogForAsync(type) : [] })));
    return render('dashboard.ejs', { settings, user, catalog, meta: meta(settings, pathname), assets });
  }
  throw new Error('Not found');
}

export async function renderFavicon() {
  const settings = await siteSettings();
  const primary = /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor) ? settings.primaryColor : '#f97316';
  const secondary = /^#[0-9a-fA-F]{6}$/.test(settings.secondaryColor) ? settings.secondaryColor : '#2563eb';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g"><stop stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs><rect width="128" height="128" rx="24" fill="url(#g)"/><text x="64" y="76" text-anchor="middle" font-family="Arial" font-size="42" font-weight="800" fill="#fff">${String(settings.logoText || 'MC').slice(0, 4)}</text></svg>`;
}
