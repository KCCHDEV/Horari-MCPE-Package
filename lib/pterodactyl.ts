import { parseResource } from './catalog.ts';

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function profile(type: string) {
  const key = type.toUpperCase();
  let environment: Record<string, string> = { SERVER_JARFILE: 'server.jar', VANILLA_VERSION: env('PTERO_VANILLA_VERSION') || 'latest' };
  try {
    const configured = env(`PTERO_${key}_ENV_JSON`);
    if (configured) environment = { ...environment, ...JSON.parse(configured) };
  } catch {
    throw new Error(`PTERO_${key}_ENV_JSON must be valid JSON`);
  }
  return {
    nest: Number(env(`PTERO_${key}_NEST_ID`) || env('PTERO_NEST_ID')),
    egg: Number(env(`PTERO_${key}_EGG_ID`) || env('PTERO_EGG_ID')),
    image: env(`PTERO_${key}_DOCKER_IMAGE`) || env('PTERO_DOCKER_IMAGE') || 'ghcr.io/pterodactyl/yolks:java_21',
    startup: env(`PTERO_${key}_STARTUP`) || env('PTERO_STARTUP') || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar',
    environment
  };
}

export function pterodactylConfigured() {
  const hasServiceEgg = ['MINECRAFT', 'WEBHOSTING', 'CODEHOSTING', 'CODESERVER'].some((type) => env(`PTERO_${type}_EGG_ID`));
  return Boolean(env('PTERO_URL') && env('PTERO_APPLICATION_TOKEN') && env('PTERO_NEST_ID') && (env('PTERO_EGG_ID') || hasServiceEgg) && env('PTERO_LOCATION_ID'));
}

function pteroUrl(path: string) {
  return `${env('PTERO_URL').replace(/\/$/, '')}/api/application${path}`;
}

export function panelServerUrl(identifier: string) {
  return `${env('PTERO_URL').replace(/\/$/, '')}/server/${encodeURIComponent(identifier)}`;
}

export async function createServer(input: {
  externalId: string;
  name: string;
  user: { email: string; name: string };
  pkg: Record<string, any>;
}) {
  if (!pterodactylConfigured()) throw new Error('Pterodactyl is not configured');
  const serviceProfile = profile(String(input.pkg.type || 'minecraft'));
  if (!serviceProfile.nest || !serviceProfile.egg) throw new Error(`Pterodactyl profile for ${input.pkg.type} is incomplete`);
  const specs = input.pkg.specMap || {};
  const memory = Math.max(128, Math.round(parseResource(specs.ram, 1) * 1024));
  const disk = Math.max(1024, Math.round(parseResource(specs.ssd, 10) * 1024));
  const cpu = Math.max(10, Math.round(parseResource(specs.cpu, 1) * 100));
  const pteroUserId = await ensurePterodactylUser(input.user);
  const existing = await findServerByExternalId(input.externalId);
  if (existing) return existing;

  const response = await fetch(pteroUrl('/servers'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('PTERO_APPLICATION_TOKEN')}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      external_id: input.externalId,
      name: input.name,
      user: pteroUserId,
      nest: serviceProfile.nest,
      egg: serviceProfile.egg,
      docker_image: serviceProfile.image,
      startup: serviceProfile.startup,
      environment: serviceProfile.environment,
      limits: { memory, swap: 0, disk, io: 500, cpu },
      feature_limits: { databases: 0, allocations: 1, backups: Number(input.pkg.specMap?.backup || 0) || 0 },
      deploy: { locations: [Number(env('PTERO_LOCATION_ID'))], dedicated_ip: false, port_range: [] },
      start_on_completion: true
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Pterodactyl ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  const server = body.attributes || body;
  return { ...server, panelUrl: server.identifier ? panelServerUrl(server.identifier) : null };
}

async function findServerByExternalId(externalId: string) {
  const response = await fetch(`${pteroUrl('/servers')}?filter[external_id]=${encodeURIComponent(externalId)}`, {
    headers: {
      Authorization: `Bearer ${env('PTERO_APPLICATION_TOKEN')}`,
      Accept: 'Application/vnd.pterodactyl.v1+json'
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Pterodactyl server lookup ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  const existing = body.data?.[0]?.attributes;
  return existing?.identifier ? { ...existing, panelUrl: panelServerUrl(existing.identifier) } : null;
}

async function ensurePterodactylUser(user: { email: string; name: string }) {
  const headers = {
    Authorization: `Bearer ${env('PTERO_APPLICATION_TOKEN')}`,
    Accept: 'Application/vnd.pterodactyl.v1+json',
    'Content-Type': 'application/json'
  };
  const search = await fetch(`${pteroUrl('/users')}?filter[email]=${encodeURIComponent(user.email)}`, { headers });
  const searchBody = await search.json().catch(() => ({}));
  if (!search.ok) throw new Error(`Pterodactyl user lookup ${search.status}: ${JSON.stringify(searchBody).slice(0, 500)}`);
  const existing = searchBody.data?.[0]?.attributes;
  if (existing?.id) return existing.id;

  const username = user.email.split('@')[0].replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || `user${Date.now()}`;
  const created = await fetch(pteroUrl('/users'), {
    method: 'POST', headers, body: JSON.stringify({
      email: user.email,
      username,
      first_name: user.name.split(/\s+/)[0].slice(0, 30) || 'Horari',
      last_name: user.name.split(/\s+/).slice(1).join(' ').slice(0, 30) || 'Customer',
      root_admin: false,
      language: 'en'
    })
  });
  const body = await created.json().catch(() => ({}));
  if (!created.ok) throw new Error(`Pterodactyl user ${created.status}: ${JSON.stringify(body).slice(0, 500)}`);
  return body.attributes?.id || body.id;
}
