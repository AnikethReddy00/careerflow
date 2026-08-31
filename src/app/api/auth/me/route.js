// GET /api/auth/me — the current user, or 401 if not signed in. Used by the
// client-side auth guard and to show who is logged in.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: { id: user._id, name: user.name, email: user.email },
  });
}
