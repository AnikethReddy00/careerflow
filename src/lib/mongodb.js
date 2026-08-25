import mongoose from "mongoose";

// Local dev default; overridden by MONGODB_URI in .env.local, and swapped for an
// Atlas connection string in production.
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/careerflow";

// Next.js dev hot-reloads modules on almost every request. Without caching the
// connection on the global object, each reload would open a brand-new pool and
// quickly exhaust MongoDB's connection limit. We stash a single connection (and
// its in-flight promise) on `global` so it survives reloads.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        // Fail fast instead of buffering queries when disconnected — makes
        // "is Mongo running?" problems obvious rather than silently hanging.
        bufferCommands: false,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset so the next call retries the connection instead of reusing a
    // rejected promise forever.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
