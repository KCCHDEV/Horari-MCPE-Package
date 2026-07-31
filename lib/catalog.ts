import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ObjectId } from 'mongodb';
import { getDb } from './db.ts';

const root = process.cwd();
const dataDir = join(root, 'data');
const types = ['minecraft', 'webhosting', 'codehosting', 'codeserver'] as const;
export type ServiceType = typeof types[number];

function readJSON(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function specsToMap(specs: Array<{ label: string; value: string }> = []) {
  return Object.fromEntries(specs.map((spec) => [spec.label.toLowerCase(), spec.value]));
}

export function findPackage(type: string, id: string) {
  if (!types.includes(type as ServiceType)) return null;
  const raw = readJSON(join(dataDir, `${type}.json`));
  const groups = Array.isArray(raw) ? { default: raw } : raw;

  for (const [cpuModel, packages] of Object.entries(groups)) {
    for (const pkg of packages as Array<Record<string, any>>) {
      if (String(pkg.id) === id || `${cpuModel}-${pkg.id}` === id) {
        return { ...pkg, id: `${cpuModel}-${pkg.id}`, baseId: String(pkg.id), type, cpuModel, specMap: specsToMap(pkg.specs) };
      }
    }
  }
  return null;
}

function withEffectivePrice(pkg: Record<string, any>) {
  const now = Date.now();
  const starts = pkg.saleStartsAt ? Date.parse(String(pkg.saleStartsAt)) : -Infinity;
  const ends = pkg.saleEndsAt ? Date.parse(String(pkg.saleEndsAt)) : Infinity;
  const active = pkg.active !== false && now >= starts && now <= ends;
  const sale = Number(pkg.salePrice);
  const percent = Number(pkg.salePercent);
  const price = active && Number.isFinite(sale) && sale >= 0
    ? sale
    : active && Number.isFinite(percent) && percent > 0 && percent < 100
      ? Math.round(Number(pkg.price) * (1 - percent / 100) * 100) / 100
      : Number(pkg.price);
  return { ...pkg, price, regularPrice: Number(pkg.price), discountActive: active && price < Number(pkg.price) };
}

async function seedCatalog(db: Awaited<ReturnType<typeof getDb>>) {
  for (const type of types) {
    const raw = readJSON(join(dataDir, `${type}.json`));
    const groups = Array.isArray(raw) ? { default: raw } : raw;
    for (const [groupKey, packages] of Object.entries(groups)) {
      for (const pkg of packages as Array<Record<string, any>>) {
        const actualGroup = Array.isArray(raw) ? String(pkg.specs?.find((spec: any) => spec.label === 'CPU Model')?.value || groupKey) : groupKey;
        await db.collection('catalog_packages').updateOne(
          { serviceType: type, packageId: String(pkg.id) },
          { $setOnInsert: { ...pkg, serviceType: type, groupKey: actualGroup, createdAt: new Date() }, $set: { updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }
  }
}

export async function catalogForAsync(type: string) {
  if (!types.includes(type as ServiceType)) return [];
  const db = await getDb();
  await seedCatalog(db);
  const items = await db.collection('catalog_packages').find({ serviceType: type, active: { $ne: false } }).sort({ groupKey: 1, sortOrder: 1, name: 1 }).toArray();
  return items.map((item) => withEffectivePrice({ ...item, id: `${item.groupKey || 'default'}-${item.packageId || item.id}`, baseId: String(item.packageId || item.id), type, cpuModel: item.groupKey || 'default' }));
}

export async function findPackageAsync(type: string, id: string) {
  const db = await getDb();
  await seedCatalog(db);
  const [groupKey, ...rest] = String(id).split('-');
  const baseId = rest.length ? rest.join('-') : id;
  const item = await db.collection('catalog_packages').findOne({ serviceType: type, $or: [{ packageId: id }, { packageId: baseId, groupKey }] });
  if (!item) return findPackage(type, id);
  return withEffectivePrice({ ...item, id: `${item.groupKey || 'default'}-${item.packageId || item.id}`, baseId: String(item.packageId || item.id), type, cpuModel: item.groupKey || 'default' });
}

export async function listCatalogAdmin() {
  const db = await getDb();
  await seedCatalog(db);
  const items = await db.collection('catalog_packages').find({}).sort({ serviceType: 1, groupKey: 1, sortOrder: 1, name: 1 }).toArray();
  return items.map((item) => withEffectivePrice({ ...item, _id: item._id.toString() }));
}

export async function updateCatalogPackage(id: string, values: Record<string, any>) {
  const db = await getDb();
  const allowed = ['name', 'subtitle', 'price', 'salePrice', 'salePercent', 'saleStartsAt', 'saleEndsAt', 'active', 'sortOrder'];
  const update = Object.fromEntries(allowed.filter((key) => key in values).map((key) => [key, key === 'name' || key === 'subtitle' ? String(values[key] || '').trim().slice(0, 180) : values[key]]));
  if ('price' in update && (!Number.isFinite(Number(update.price)) || Number(update.price) < 0)) throw new Error('ราคาปกติไม่ถูกต้อง');
  if ('salePrice' in update && update.salePrice !== '' && (!Number.isFinite(Number(update.salePrice)) || Number(update.salePrice) < 0)) throw new Error('ราคาลดไม่ถูกต้อง');
  if ('salePercent' in update && update.salePercent !== '' && (Number(update.salePercent) < 0 || Number(update.salePercent) >= 100)) throw new Error('เปอร์เซ็นต์ส่วนลดต้องอยู่ระหว่าง 0-99');
  if (!ObjectId.isValid(id)) throw new Error('แพ็กเกจไม่ถูกต้อง');
  const result = await db.collection('catalog_packages').updateOne({ _id: new ObjectId(id) }, { $set: { ...update, updatedAt: new Date() } });
  if (!result.matchedCount) throw new Error('ไม่พบแพ็กเกจ');
}

export async function getStoredSettings(fallback: Record<string, any>) {
  const db = await getDb();
  const stored = await db.collection<any>('site_settings').findOne({ _id: 'site' });
  return { ...fallback, ...(stored || {}) };
}

export async function updateStoredSettings(values: Record<string, any>) {
  const db = await getDb();
  await db.collection<any>('site_settings').updateOne({ _id: 'site' }, { $set: { ...values, updatedAt: new Date() } }, { upsert: true });
}

export function catalogFor(type: string) {
  if (!types.includes(type as ServiceType)) return [];
  const raw = readJSON(join(dataDir, `${type}.json`));
  const groups = Array.isArray(raw) ? { default: raw } : raw;
  return Object.entries(groups).flatMap(([cpuModel, packages]) => (packages as Array<Record<string, any>>).map((pkg) => ({
    id: `${cpuModel}-${pkg.id}`, name: pkg.name, subtitle: pkg.subtitle, price: Number(pkg.price), type, cpuModel,
    specs: pkg.specs || []
  })));
}

export function parseResource(value: unknown, fallback: number) {
  const match = String(value || '').match(/[\d.]+/);
  return match ? Number(match[0]) : fallback;
}
