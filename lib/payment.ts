import { createHmac, timingSafeEqual } from 'node:crypto';

function env(name: string) {
  return String(process.env[name] || '').trim();
}

export function stripeConfigured() {
  return Boolean(env('STRIPE_SECRET_KEY') && env('STRIPE_WEBHOOK_SECRET') && env('APP_URL'));
}

function stripeSignatureValid(rawBody: string, signature: string) {
  const secret = env('STRIPE_WEBHOOK_SECRET');
  const parts = Object.fromEntries(signature.split(',').map((part) => part.split('=').map((item) => item.trim())));
  const timestamp = Number(parts.t);
  if (!secret || !timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !parts.v1) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const actual = Buffer.from(parts.v1, 'utf8');
  const digest = Buffer.from(expected, 'utf8');
  return actual.length === digest.length && timingSafeEqual(actual, digest);
}

export function verifyStripeWebhook(rawBody: string, signature: string) {
  return stripeSignatureValid(rawBody, signature);
}

export async function createStripeCheckout(input: {
  orderId: string;
  email: string;
  packageName: string;
  amount: number;
}) {
  if (!stripeConfigured()) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and APP_URL.');
  const mode = env('PAYMENT_MODE') === 'payment' ? 'payment' : 'subscription';
  const params = new URLSearchParams();
  params.set('mode', mode);
  params.set('client_reference_id', input.orderId);
  params.set('customer_email', input.email);
  params.set('success_url', `${env('APP_URL').replace(/\/$/, '')}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${env('APP_URL').replace(/\/$/, '')}/dashboard?payment=cancelled`);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'thb');
  params.set('line_items[0][price_data][unit_amount]', String(Math.round(input.amount * 100)));
  params.set('line_items[0][price_data][product_data][name]', input.packageName.slice(0, 120));
  if (mode === 'subscription') params.set('line_items[0][price_data][recurring][interval]', 'month');
  params.set('metadata[order_id]', input.orderId);
  if (mode === 'subscription') params.set('subscription_data[metadata][order_id]', input.orderId);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env('STRIPE_SECRET_KEY')}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.url) throw new Error(`Stripe checkout ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  return { id: body.id, url: body.url, mode };
}

export function stripePaymentEvent(rawBody: string) {
  const event = JSON.parse(rawBody);
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'invoice.paid'].includes(event.type)) return null;
  const object = event.data?.object || {};
  if (event.type === 'checkout.session.completed' && object.payment_status && object.payment_status !== 'paid') return null;
  const orderId = object.metadata?.order_id || object.client_reference_id;
  const paymentId = object.payment_intent || object.id;
  return orderId && paymentId ? { orderId: String(orderId), paymentId: String(paymentId), eventType: event.type } : null;
}
