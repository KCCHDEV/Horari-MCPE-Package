import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb, mongoConfigured, ObjectId } from './db.ts';

const SESSION_COOKIE = 'horari_session';
const SESSION_DAYS = 30;

function normalizeEmail(email: unknown) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const digest = pbkdf2Sync(password, salt, 210_000, 32, 'sha256').toString('hex');
  return `pbkdf2$210000$${salt}$${digest}`;
}

function verifyPassword(password: string, stored: string) {
  const [, iterations, salt, expected] = stored.split('$');
  if (!iterations || !salt || !expected) return false;
  const actual = pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getSessionToken(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] || '';
}

function cookieHeader(token: string, maxAge: number) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function createUser(name: string, email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('กรุณากรอกชื่อและอีเมลให้ถูกต้อง');
  }
  if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email: normalizedEmail });
  if (existing) throw new Error('อีเมลนี้มีบัญชีอยู่แล้ว');

  // Bootstrap the first account as admin; later accounts remain customers.
  const role = (await db.collection('users').countDocuments({})) === 0 ? 'admin' : 'customer';

  const result = await db.collection('users').insertOne({
    name: name.trim().slice(0, 100),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return { id: result.insertedId.toString(), name: name.trim(), email: normalizedEmail, role };
}

export async function loginUser(email: string, password: string) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ email: normalizeEmail(email) });
  if (!user || !verifyPassword(password, String(user.passwordHash))) {
    throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  }

  const token = randomBytes(32).toString('base64url');
  await db.collection('sessions').insertOne({
    tokenHash: hashToken(token),
    userId: user._id,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
    createdAt: new Date()
  });

  return {
    token,
    cookie: cookieHeader(token, SESSION_DAYS * 86400),
    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role }
  };
}

export async function getCurrentUser(req: Request) {
  const token = getSessionToken(req);
  if (!token) return null;

  const db = await getDb();
  const session = await db.collection('sessions').findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() }
  });
  if (!session) return null;

  const user = await db.collection('users').findOne({ _id: session.userId });
  if (!user) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

export async function logoutUser(req: Request) {
  const token = getSessionToken(req);
  if (token && mongoConfigured()) {
    const db = await getDb();
    await db.collection('sessions').deleteOne({ tokenHash: hashToken(token) });
  }
  return cookieHeader('', 0);
}

export function isObjectId(value: string) {
  return ObjectId.isValid(value);
}
