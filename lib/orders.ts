import { getDb, ObjectId } from './db.ts';
import { findPackageAsync } from './catalog.ts';
import { createServer } from './pterodactyl.ts';

export type OrderStatus = 'pending_payment' | 'payment_confirmed' | 'provisioning' | 'active' | 'failed';

export async function createOrder(userId: string, type: string, packageId: string, serverName: string) {
  const pkg: any = await findPackageAsync(type, packageId);
  if (!pkg) throw new Error('ไม่พบแพ็กเกจที่เลือก');
  const cleanName = String(serverName || `${pkg.name} Server`).trim().replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 60);
  if (cleanName.length < 3) throw new Error('กรุณาระบุชื่อเซิร์ฟเวอร์อย่างน้อย 3 ตัวอักษร');

  const db = await getDb();
  const externalId = `order-${new ObjectId().toString()}`;
  const result = await db.collection('orders').insertOne({
    externalId,
    userId: new ObjectId(userId),
    serviceType: type,
    packageId: pkg.id,
    packageSnapshot: { id: pkg.id, name: pkg.name, price: Number(pkg.price), cpuModel: pkg.cpuModel, specs: pkg.specs },
    serverName: cleanName,
    amount: Number(pkg.price),
    currency: 'THB',
    status: 'pending_payment' satisfies OrderStatus,
    payment: { status: 'pending', provider: process.env.PAYMENT_PROVIDER || 'external-webhook' },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return { id: result.insertedId.toString(), externalId, amount: Number(pkg.price), currency: 'THB', status: 'pending_payment', package: pkg };
}

export async function listOrders(userId: string) {
  const db = await getDb();
  return db.collection('orders').find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function attachCheckoutSession(orderId: string, session: { id: string; url: string; mode: string }) {
  const db = await getDb();
  await db.collection('orders').updateOne({ _id: new ObjectId(orderId) }, {
    $set: { 'payment.status': 'checkout_created', 'payment.checkoutSessionId': session.id, 'payment.checkoutUrl': session.url, 'payment.mode': session.mode, updatedAt: new Date() }
  });
}

export async function confirmPayment(orderId: string, paymentId: string) {
  const db = await getDb();
  const id = new ObjectId(orderId);
  const order = await db.collection('orders').findOne({ _id: id });
  if (!order) throw new Error('ไม่พบคำสั่งซื้อ');
  if (['active', 'provisioning'].includes(String(order.status))) return order;
  if (order.payment?.status === 'paid' && order.payment.paymentId && order.payment.paymentId !== paymentId) {
    throw new Error('คำสั่งซื้อนี้มี payment reference อื่นถูกยืนยันไปแล้ว');
  }

  await db.collection('orders').updateOne({ _id: id }, {
    $set: { status: 'payment_confirmed', 'payment.status': 'paid', 'payment.paymentId': paymentId, paidAt: new Date(), updatedAt: new Date() }
  });
  return db.collection('orders').findOne({ _id: id });
}

export async function provisionOrder(orderId: string) {
  const db = await getDb();
  const id = new ObjectId(orderId);
  const order = await db.collection('orders').findOne({ _id: id });
  if (!order) throw new Error('ไม่พบคำสั่งซื้อ');
  if (order.status === 'active') return order;
  if (order.status !== 'payment_confirmed' && order.status !== 'provisioning') throw new Error('คำสั่งซื้อนี้ยังไม่ยืนยันการชำระเงิน');

  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  const claim = await db.collection('orders').updateOne({
    _id: id,
    $or: [
      { status: 'payment_confirmed' },
      { status: 'provisioning', provisioningStartedAt: { $lt: staleBefore } }
    ]
  }, { $set: { status: 'provisioning', provisioningStartedAt: new Date(), updatedAt: new Date() } });
  if (!claim.matchedCount) return db.collection('orders').findOne({ _id: id });
  try {
    const owner = await db.collection('users').findOne({ _id: order.userId });
    if (!owner?.email) throw new Error('ไม่พบข้อมูลผู้ใช้ของคำสั่งซื้อ');
    const pkg: any = await findPackageAsync(String(order.serviceType), String(order.packageId));
    if (!pkg) throw new Error('แพ็กเกจในคำสั่งซื้อไม่อยู่ใน catalog แล้ว');
    const server = await createServer({ externalId: String(order.externalId), name: String(order.serverName), user: { email: String(owner.email), name: String(owner.name) }, pkg });
    await db.collection('orders').updateOne({ _id: id }, {
      $set: { status: 'active', pterodactyl: { id: server.id, identifier: server.identifier, uuid: server.uuid, name: server.name, panelUrl: server.panelUrl, loginEmail: owner.email, passwordSetup: 'ใช้ Forgot password ใน Pterodactyl Panel ด้วยอีเมลเดียวกับบัญชีเว็บ' }, activatedAt: new Date(), updatedAt: new Date() },
      $unset: { provisioningStartedAt: '', provisionError: '' }
    });
  } catch (error) {
    await db.collection('orders').updateOne({ _id: id }, { $set: { status: 'payment_confirmed', provisionError: String(error instanceof Error ? error.message : error), updatedAt: new Date() }, $unset: { provisioningStartedAt: '' } });
    throw error;
  }
  return db.collection('orders').findOne({ _id: id });
}
