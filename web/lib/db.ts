import mongoose from "mongoose";

const getMongoUri = () => process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smart-voting";

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.__mongoose ?? { conn: null, promise: null };

if (!global.__mongoose) {
  global.__mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 1500,
      connectTimeoutMS: 1500,
    };
    cached.promise = mongoose.connect(getMongoUri(), opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
