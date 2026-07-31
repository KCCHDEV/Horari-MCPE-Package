import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createUser, getCurrentUser, loginUser, logoutUser } from '@/lib/auth';
import { attachCheckoutSession, confirmPayment, createOrder, listOrders, provisionOrder } from '@/lib/orders';
import { updateCatalogPackage, updateStoredSettings } from '@/lib/catalog';
import { createStripeCheckout, stripePaymentEvent, verifyStripeWebhook } from '@/lib/payment';

export const dynamic = 'force-dynamic';

async function body(request: Request) { try { return await request.json(); } catch { return {}; } }
function json(data: unknown, status = 200, headers: Record<string, string> = {}) { return NextResponse.json(data, { status, headers }); }
function error(errorValue: unknown, status = 400) { return json({ error: errorValue instanceof Error ? errorValue.message : String(errorValue || 'เกิดข้อผิดพลาด') }, status); }
function adminOnly(request: Request) { return getCurrentUser(request).then((user) => user?.role === 'admin' ? user : null); }
function verifyGeneric(raw: string, signature: string) {
  const secret = String(process.env.PAYMENT_WEBHOOK_SECRET || '');
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected); const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  if (path === '/api/orders') {
    try { const user = await getCurrentUser(request); if (!user) return error('กรุณาเข้าสู่ระบบ', 401); return json({ orders: await listOrders(user.id) }); }
    catch (e) { return error(e, 503); }
  }
  return error('Not Found', 404);
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  if (path === '/api/auth/register') {
    try { const data = await body(request); const user = await createUser(data.name, data.email, data.password); const session = await loginUser(data.email, data.password); return json({ user }, 201, { 'Set-Cookie': session.cookie }); }
    catch (e) { return error(e, 400); }
  }
  if (path === '/api/auth/login') {
    try { const data = await body(request); const session = await loginUser(data.email, data.password); return json({ user: session.user }, 200, { 'Set-Cookie': session.cookie }); }
    catch (e) { return error(e, 401); }
  }
  if (path === '/api/auth/logout') {
    try { return json({ ok: true }, 200, { 'Set-Cookie': await logoutUser(request) }); }
    catch (e) { return error(e, 503); }
  }
  if (path === '/api/orders') {
    try {
      const user = await getCurrentUser(request); if (!user) return error('กรุณาเข้าสู่ระบบ', 401);
      const data = await body(request);
      const order = await createOrder(user.id, data.serviceType, data.packageId, data.serverName);
      let payment: any = { provider: process.env.PAYMENT_PROVIDER || 'external-webhook', status: 'pending', checkoutUrl: null };
      const template = String(process.env.PAYMENT_CHECKOUT_URL_TEMPLATE || '').trim();
      if (template) payment.checkoutUrl = template.replaceAll('{orderId}', encodeURIComponent(order.id));
      if (String(process.env.PAYMENT_PROVIDER || '').toLowerCase() === 'stripe') {
        const session = await createStripeCheckout({ orderId: order.id, email: user.email, packageName: `${String((order.package as any).name || 'Service')} Server`, amount: order.amount });
        await attachCheckoutSession(order.id, session); payment = { provider: 'stripe', status: 'checkout_created', checkoutUrl: session.url };
      }
      return json({ order, payment }, 201);
    } catch (e) { return error(e, 400); }
  }
  const provision = path.match(/^\/api\/orders\/([a-f0-9]{24})\/provision$/i);
  if (provision) {
    try { const user = await getCurrentUser(request); if (!user) return error('กรุณาเข้าสู่ระบบ', 401); const orders = await listOrders(user.id); if (!orders.some((item: any) => item._id?.toString() === provision[1])) return error('ไม่พบคำสั่งซื้อของบัญชีนี้', 404); return json({ order: await provisionOrder(provision[1]) }); }
    catch (e) { return error(e, 400); }
  }
  if (path === '/api/payments/webhook') {
    const raw = await request.text();
    if (String(process.env.PAYMENT_PROVIDER || '').toLowerCase() === 'stripe') {
      if (!verifyStripeWebhook(raw, request.headers.get('stripe-signature') || '')) return error('ลายเซ็น Stripe webhook ไม่ถูกต้อง', 401);
      try { const event = stripePaymentEvent(raw); if (!event) return json({ ok: true, ignored: true }); const order = await confirmPayment(event.orderId, event.paymentId); try { await provisionOrder(event.orderId); } catch (e) { console.error('Provisioning deferred:', e); } return json({ ok: true, orderId: order?._id?.toString(), event: event.eventType }); }
      catch (e) { return error(e, 400); }
    }
    if (!verifyGeneric(raw, request.headers.get('x-payment-signature') || '')) return error('ลายเซ็น webhook ไม่ถูกต้อง', 401);
    try { const data = JSON.parse(raw); if (data.status !== 'paid' || !data.orderId || !data.paymentId) return error('ข้อมูล payment webhook ไม่ครบ', 400); const order = await confirmPayment(String(data.orderId), String(data.paymentId)); try { await provisionOrder(String(data.orderId)); } catch (e) { console.error('Provisioning deferred:', e); } return json({ ok: true, orderId: order?._id?.toString(), status: 'accepted' }); }
    catch (e) { return error(e, 400); }
  }
  return error('Not Found', 404);
}

export async function PATCH(request: Request) {
  const path = new URL(request.url).pathname;
  if (!(await adminOnly(request))) return error('ไม่มีสิทธิ์ผู้ดูแลระบบ', 403);
  try {
    if (path === '/api/admin/settings') { await updateStoredSettings(await body(request)); return json({ ok: true }); }
    const match = path.match(/^\/api\/admin\/packages\/([a-f0-9]{24})$/i);
    if (match) { await updateCatalogPackage(match[1], await body(request)); return json({ ok: true }); }
    return error('Not Found', 404);
  } catch (e) { return error(e, 400); }
}
