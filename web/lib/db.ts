import mongoose from "mongoose";

const getMongoUri = () =>
  process.env.MONGODB_URI ||
  "mongodb+srv://muhammadramshad07_db_user:1PORYTcCb8cRCZEs@thor.u4tzudv.mongodb.net/smart-voting?retryWrites=true&w=majority&appName=Thor";

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
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(getMongoUri(), opts);
  }

  try {
    cached.conn = await cached.promise;
    console.log("[MongoDB] Connected successfully to Atlas database.");
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
