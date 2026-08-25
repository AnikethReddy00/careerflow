import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// TEMPORARY: real Google OAuth is deferred, so there is no logged-in user yet.
// Every request acts as this one fixed "dev" user so applications still have a
// valid owner and the schema stays intact. When auth lands, delete this file
// and read the user from the session instead — nothing else has to change.
const DEV_EMAIL = "dev@careerflow.local";

export async function getDevUser() {
  await connectDB();
  // Upsert so concurrent requests can't create duplicate dev users (the unique
  // index on email would reject the second insert anyway).
  const user = await User.findOneAndUpdate(
    { email: DEV_EMAIL },
    { $setOnInsert: { email: DEV_EMAIL, name: "Dev User" } },
    { new: true, upsert: true }
  );
  return user;
}
