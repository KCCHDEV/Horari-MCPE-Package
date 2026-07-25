import { describe, expect, it } from 'bun:test';
import { createServer } from '../lib/pterodactyl.ts';

describe('Pterodactyl provisioning adapter', () => {
  it('creates a per-service server with mapped resources', async () => {
    const payloads: Record<string, any>[] = [];
    const stub = Bun.serve({
      port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname;
        if (req.method === 'GET') return Response.json({ data: [] });
        const body = await req.json();
        payloads.push(body);
        if (path.endsWith('/users')) return Response.json({ attributes: { id: 7 } });
        return Response.json({ attributes: { id: 9, identifier: 'test123', uuid: 'uuid-1', name: body.name } });
      }
    });

    process.env.PTERO_URL = `http://127.0.0.1:${stub.port}`;
    process.env.PTERO_APPLICATION_TOKEN = 'test-token';
    process.env.PTERO_NEST_ID = '1';
    process.env.PTERO_EGG_ID = '1';
    process.env.PTERO_LOCATION_ID = '3';
    process.env.PTERO_WEBHOSTING_EGG_ID = '9';
    process.env.PTERO_WEBHOSTING_STARTUP = 'node server.js';

    try {
      const result = await createServer({ externalId: 'order-1', name: 'Web Test', user: { email: 'test@example.com', name: 'Test User' }, pkg: { type: 'webhosting', specMap: { ram: '2 GB', ssd: '20 GB', cpu: '2 Cores' } } });
      expect(result.identifier).toBe('test123');
      expect(payloads[1].egg).toBe(9);
      expect(payloads[1].startup).toBe('node server.js');
      expect(payloads[1].limits).toEqual({ memory: 2048, swap: 0, disk: 20480, io: 500, cpu: 200 });
    } finally {
      stub.stop();
      for (const key of ['PTERO_URL', 'PTERO_APPLICATION_TOKEN', 'PTERO_NEST_ID', 'PTERO_EGG_ID', 'PTERO_LOCATION_ID', 'PTERO_WEBHOSTING_EGG_ID', 'PTERO_WEBHOSTING_STARTUP']) delete process.env[key];
    }
  });

  it('reuses a server found by external_id instead of creating a duplicate', async () => {
    let createCalls = 0;
    const stub = Bun.serve({
      port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname;
        if (req.method === 'GET' && path.endsWith('/users')) return Response.json({ data: [] });
        if (req.method === 'GET' && path.endsWith('/servers')) return Response.json({ data: [{ attributes: { id: 8, identifier: 'existing123', uuid: 'uuid-existing', name: 'Existing' } }] });
        if (path.endsWith('/users')) return Response.json({ attributes: { id: 7 } });
        createCalls += 1;
        return Response.json({ attributes: { id: 9, identifier: 'new123', uuid: 'uuid-new', name: 'New' } });
      }
    });
    process.env.PTERO_URL = `http://127.0.0.1:${stub.port}`;
    process.env.PTERO_APPLICATION_TOKEN = 'test-token';
    process.env.PTERO_NEST_ID = '1';
    process.env.PTERO_EGG_ID = '1';
    process.env.PTERO_LOCATION_ID = '3';
    try {
      const result = await createServer({ externalId: 'order-retry', name: 'Retry Test', user: { email: 'retry@example.com', name: 'Retry User' }, pkg: { type: 'minecraft', specMap: { ram: '1 GB', ssd: '10 GB', cpu: '1 Core' } } });
      expect(result.identifier).toBe('existing123');
      expect(createCalls).toBe(0);
    } finally {
      stub.stop();
      for (const key of ['PTERO_URL', 'PTERO_APPLICATION_TOKEN', 'PTERO_NEST_ID', 'PTERO_EGG_ID', 'PTERO_LOCATION_ID']) delete process.env[key];
    }
  });
});
