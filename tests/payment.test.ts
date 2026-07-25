import { describe, expect, it, afterEach } from 'bun:test';
import { createHmac } from 'node:crypto';
import { createStripeCheckout, stripePaymentEvent, verifyStripeWebhook } from '../lib/payment.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ['PAYMENT_PROVIDER', 'APP_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) delete process.env[key];
});

describe('Stripe payment adapter', () => {
  it('creates a monthly hosted checkout session with order metadata', async () => {
    process.env.PAYMENT_PROVIDER = 'stripe';
    process.env.APP_URL = 'https://shop.example';
    process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
    let requestBody = '';
    globalThis.fetch = async (_input, init) => {
      requestBody = String(init?.body);
      return Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.test/cs_test_1' });
    };

    const session = await createStripeCheckout({ orderId: 'order-1', email: 'buyer@example.com', packageName: 'Gold Server', amount: 200 });
    expect(session.url).toBe('https://checkout.stripe.test/cs_test_1');
    expect(requestBody).toContain('mode=subscription');
    expect(requestBody).toContain('metadata%5Border_id%5D=order-1');
    expect(requestBody).toContain('unit_amount%5D=20000');
  });

  it('accepts valid Stripe signatures and rejects invalid signatures', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
    const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_1', payment_status: 'paid', client_reference_id: 'order-1', payment_intent: 'pi_1' } } });
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest('hex');
    expect(verifyStripeWebhook(body, `t=${timestamp},v1=${digest}`)).toBe(true);
    expect(verifyStripeWebhook(body, 't=1,v1=invalid')).toBe(false);
    expect(stripePaymentEvent(body)).toEqual({ orderId: 'order-1', paymentId: 'pi_1', eventType: 'checkout.session.completed' });
  });
});
