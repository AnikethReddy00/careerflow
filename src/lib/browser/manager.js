import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const SESSION_TTL_MS = 30 * 60 * 1000;
const WINDOW_SIZE = { width: 1440, height: 1200 };

function getStore() {
  const g = globalThis;
  if (!g.__careerflowBrowserStore) {
    g.__careerflowBrowserStore = {
      sessions: new Map(),
      cleanupTimer: null,
    };
  }
  return g.__careerflowBrowserStore;
}

function normalizeUrl(input) {
  const value = String(input || "").trim();
  if (!value) {
    throw new Error("A URL is required.");
  }

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)
    ? value
    : `https://${value}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  return url.toString();
}

function captureConsole(session) {
  session.consoleLogs = [];
  session.page.on("console", (message) => {
    session.consoleLogs.push({
      type: message.type(),
      text: message.text(),
      time: new Date().toISOString(),
    });
    if (session.consoleLogs.length > 50) {
      session.consoleLogs.shift();
    }
  });
  session.page.on("pageerror", (error) => {
    session.consoleLogs.push({
      type: "pageerror",
      text: error.message,
      time: new Date().toISOString(),
    });
    if (session.consoleLogs.length > 50) {
      session.consoleLogs.shift();
    }
  });
}

async function createSessionObject({ userId, url }) {
  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "careerflow-browser-")
  );
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--window-size=${WINDOW_SIZE.width},${WINDOW_SIZE.height}`,
      "--start-maximized",
    ],
    viewport: null,
    noDefaultViewport: true,
    javaScriptEnabled: true,
  });
  const page = await context.newPage();
  const session = {
    id: randomUUID(),
    userId: String(userId),
    context,
    userDataDir,
    page,
    createdAt: new Date(),
    lastUsedAt: new Date(),
    consoleLogs: [],
  };
  captureConsole(session);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.bringToFront().catch(() => {});
  return session;
}

export async function openBrowserSession({ userId, url }) {
  const normalizedUrl = normalizeUrl(url);
  const session = await createSessionObject({ userId, url: normalizedUrl });
  getStore().sessions.set(session.id, session);
  return snapshotBrowserSession(session);
}

export function listBrowserSessions(userId) {
  const sessions = [];
  for (const session of getStore().sessions.values()) {
    if (String(session.userId) !== String(userId)) continue;
    sessions.push({
      id: session.id,
      url: session.page.url(),
      title: session.title || null,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      consoleLogs: session.consoleLogs.slice(-10),
    });
  }
  return sessions.sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
}

export async function getBrowserSession(userId, sessionId) {
  const session = getStore().sessions.get(String(sessionId));
  if (!session) {
    return null;
  }
  if (String(session.userId) !== String(userId)) {
    throw new Error("You do not have access to that browser session.");
  }
  session.lastUsedAt = new Date();
  session.title = await session.page.title().catch(() => session.title || null);
  return session;
}

export async function navigateBrowserSession({ userId, sessionId, url }) {
  const session = await getBrowserSession(userId, sessionId);
  if (!session) {
    throw new Error("Browser session not found.");
  }
  const normalizedUrl = normalizeUrl(url);
  await session.page.goto(normalizedUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await session.page.bringToFront().catch(() => {});
  session.lastUsedAt = new Date();
  return snapshotBrowserSession(session);
}

export async function evaluateBrowserSession({ userId, sessionId, script }) {
  const session = await getBrowserSession(userId, sessionId);
  if (!session) {
    throw new Error("Browser session not found.");
  }
  const source = String(script || "").trim();
  if (!source) {
    throw new Error("JavaScript is required.");
  }

  const result = await session.page.evaluate(async (userScript) => {
    const fn = new Function(
      `"use strict";\nreturn (async () => {\n${userScript}\n})();`
    );
    return await fn();
  }, source);

  session.lastUsedAt = new Date();
  await session.page.bringToFront().catch(() => {});
  return {
    ...(await snapshotBrowserSession(session)),
    result: result === undefined ? null : result,
  };
}

async function mutateSession({ userId, sessionId, mutate }) {
  const session = await getBrowserSession(userId, sessionId);
  if (!session) {
    throw new Error("Browser session not found.");
  }
  await mutate(session);
  session.lastUsedAt = new Date();
  await session.page.bringToFront().catch(() => {});
  return snapshotBrowserSession(session);
}

export async function clickBrowserSession({ userId, sessionId, selector }) {
  const value = String(selector || "").trim();
  if (!value) {
    throw new Error("A CSS selector is required.");
  }
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.locator(value).first().click({ timeout: 10000 });
    },
  });
}

export async function clickPointBrowserSession({
  userId,
  sessionId,
  x,
  y,
  clickCount = 1,
  button = "left",
}) {
  const pointX = Number(x);
  const pointY = Number(y);
  if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) {
    throw new Error("Valid x/y coordinates are required.");
  }
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.mouse.click(pointX, pointY, {
        clickCount: Math.max(1, Number(clickCount) || 1),
        button,
      });
    },
  });
}

export async function fillBrowserSession({ userId, sessionId, selector, value }) {
  const target = String(selector || "").trim();
  if (!target) {
    throw new Error("A CSS selector is required.");
  }
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.locator(target).first().fill(String(value ?? ""), {
        timeout: 10000,
      });
    },
  });
}

export async function typeBrowserSession({ userId, sessionId, text }) {
  const value = String(text ?? "");
  if (!value) {
    throw new Error("Text is required.");
  }
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.keyboard.insertText(value);
    },
  });
}

export async function pressBrowserSession({ userId, sessionId, key }) {
  const value = String(key || "").trim();
  if (!value) {
    throw new Error("A key is required.");
  }
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.keyboard.press(value);
    },
  });
}

export async function scrollBrowserSession({ userId, sessionId, deltaY }) {
  const amount = Number(deltaY);
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.mouse.wheel(0, Number.isFinite(amount) ? amount : 800);
    },
  });
}

export async function backBrowserSession({ userId, sessionId }) {
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(
        () => {}
      );
    },
  });
}

export async function forwardBrowserSession({ userId, sessionId }) {
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.goForward({
        waitUntil: "domcontentloaded",
        timeout: 30000,
      }).catch(() => {});
    },
  });
}

export async function reloadBrowserSession({ userId, sessionId }) {
  return mutateSession({
    userId,
    sessionId,
    mutate: async (session) => {
      await session.page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    },
  });
}

export async function closeBrowserSession({ userId, sessionId }) {
  const store = getStore();
  const session = await getBrowserSession(userId, sessionId);
  if (!session) {
    return false;
  }
  await session.context.close().catch(() => {});
  if (session.userDataDir) {
    await fs.rm(session.userDataDir, { recursive: true, force: true }).catch(
      () => {}
    );
  }
  store.sessions.delete(String(sessionId));
  return true;
}

export async function snapshotBrowserSession(session) {
  session.title = await session.page.title().catch(() => session.title || null);
  return toSerializableSession(session);
}

function toSerializableSession(session) {
  return {
    id: session.id,
    url: session.page.url(),
    title: session.title || null,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    consoleLogs: session.consoleLogs.slice(-25),
  };
}

function cleanupExpiredSessions() {
  const store = getStore();
  const now = Date.now();
  for (const [id, session] of store.sessions.entries()) {
    if (now - session.lastUsedAt.getTime() <= SESSION_TTL_MS) {
      continue;
    }
    session.context.close().catch(() => {});
    if (session.userDataDir) {
      fs.rm(session.userDataDir, { recursive: true, force: true }).catch(
        () => {}
      );
    }
    store.sessions.delete(id);
  }
}

export function ensureBrowserCleanup() {
  const store = getStore();
  if (store.cleanupTimer) return;
  store.cleanupTimer = setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
  if (typeof store.cleanupTimer.unref === "function") {
    store.cleanupTimer.unref();
  }
}
