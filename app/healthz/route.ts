import { mongoConfigured } from '@/lib/db';
import { pterodactylConfigured } from '@/lib/pterodactyl';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export async function GET() {
  const stripeReady = String(process.env.PAYMENT_PROVIDER || '').toLowerCase() === 'stripe'
    ? Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.APP_URL)
    : Boolean(process.env.PAYMENT_WEBHOOK_SECRET);
  const checks = { mongo: mongoConfigured(), pterodactyl: pterodactylConfigured(), payment: stripeReady };
  return NextResponse.json({ ok: Object.values(checks).every(Boolean), checks }, { status: Object.values(checks).every(Boolean) ? 200 : 503 });
}
