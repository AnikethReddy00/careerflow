import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/session";
import { processChatbotQuery } from "@/lib/intelligence/chatbotEngine";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { message, history } = body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const result = await processChatbotQuery({
      userId: user._id.toString(),
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
    });

    return Response.json(result);
  } catch (err) {
    console.error("Intelligence Chat Error:", err);
    return Response.json({ error: err.message || "Failed to process question" }, { status: 500 });
  }
}
