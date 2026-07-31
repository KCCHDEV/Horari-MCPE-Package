import { MongoClient, Db, ObjectId } from 'mongodb';

let client: MongoClient | null = null;
let database: Db | null = null;

export function mongoConfigured() {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);
}

export async function getDb() {
  if (!mongoConfigured()) {
    throw new Error('MongoDB is not configured. Set MONGODB_URI and MONGODB_DB.');
  }

  if (database) return database;

  client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10
  });
  await client.connect();
  database = client.db(process.env.MONGODB_DB);
  await ensureIndexes(database);
  return database;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('orders').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('orders').createIndex({ externalId: 1 }, { unique: true }),
    db.collection('orders').createIndex({ paymentId: 1 }, { sparse: true }),
    db.collection('catalog_packages').createIndex({ serviceType: 1, packageId: 1 }, { unique: true }),
    db.collection('site_settings').createIndex({ _id: 1 }, { unique: true })
  ]);
}

export { ObjectId };
