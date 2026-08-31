import { getCurrentUser } from "@/lib/session";
import {
  backBrowserSession,
  closeBrowserSession,
  ensureBrowserCleanup,
  evaluateBrowserSession,
  fillBrowserSession,
  listBrowserSessions,
  getBrowserSession,
  clickBrowserSession,
  clickPointBrowserSession,
  navigateBrowserSession,
  forwardBrowserSession,
  pressBrowserSession,
  reloadBrowserSession,
  scrollBrowserSession,
  snapshotBrowserSession,
  typeBrowserSession,
  openBrowserSession,
} from "@/lib/browser/manager";

export const dynamic = "force-dynamic";

ensureBrowserCleanup();

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Not authenticated", 401);
  }

  return Response.json({ sessions: listBrowserSessions(user._id) });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return jsonError("Not authenticated", 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const action = String(body?.action || "");
  try {
    if (action === "open") {
      return Response.json({
        session: await openBrowserSession({ userId: user._id, url: body?.url }),
      });
    }

    if (action === "navigate") {
      return Response.json({
        session: await navigateBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          url: body?.url,
        }),
      });
    }

    if (action === "click") {
      return Response.json({
        session: await clickBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          selector: body?.selector,
        }),
      });
    }

    if (action === "clickPoint") {
      return Response.json({
        session: await clickPointBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          x: body?.x,
          y: body?.y,
          clickCount: body?.clickCount,
          button: body?.button,
        }),
      });
    }

    if (action === "fill") {
      return Response.json({
        session: await fillBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          selector: body?.selector,
          value: body?.value,
        }),
      });
    }

    if (action === "type") {
      return Response.json({
        session: await typeBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          text: body?.text,
        }),
      });
    }

    if (action === "press") {
      return Response.json({
        session: await pressBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          key: body?.key,
        }),
      });
    }

    if (action === "scroll") {
      return Response.json({
        session: await scrollBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          deltaY: body?.deltaY,
        }),
      });
    }

    if (action === "back") {
      return Response.json({
        session: await backBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
        }),
      });
    }

    if (action === "forward") {
      return Response.json({
        session: await forwardBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
        }),
      });
    }

    if (action === "reload") {
      return Response.json({
        session: await reloadBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
        }),
      });
    }

    if (action === "evaluate") {
      return Response.json({
        session: await evaluateBrowserSession({
          userId: user._id,
          sessionId: body?.sessionId,
          script: body?.script,
        }),
      });
    }

    if (action === "close") {
      const closed = await closeBrowserSession({
        userId: user._id,
        sessionId: body?.sessionId,
      });
      return Response.json({ closed });
    }

    if (action === "snapshot") {
      const session = await getBrowserSession(user._id, body?.sessionId);
      if (!session) {
        return jsonError("Browser session not found.", 404);
      }
      return Response.json({ session: await snapshotBrowserSession(session) });
    }

    return jsonError("Unsupported browser action", 400);
  } catch (err) {
    return jsonError(err.message || "Browser action failed", 500);
  }
}
