// POST /api/auth/login — verify credentials and start a session.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import {
  signSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body?.email?.trim().toLowerCase() || "";
  const password = body?.password || "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // passwordHash is select:false, so re-include it explicitly for the compare.
    const user = await User.findOne({ email }).select("+passwordHash");

    // Deliberately identical response whether the email is unknown or the
    // password is wrong, so we never reveal which emails have accounts.
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await signSession(user._id);
    const res = NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
