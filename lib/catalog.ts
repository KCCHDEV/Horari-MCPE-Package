import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const root = import.meta.dir.replace(/\/lib$/, '');
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
