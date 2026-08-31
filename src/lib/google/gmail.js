// Read-only Gmail REST calls. Pure fetch — no database and no `@/` imports — so
// this module stays trivially unit-testable: the caller supplies a valid OAuth
// access token (minted by src/lib/google/tokens.js from the stored refresh
// token). Everything here relies only on the gmail.readonly scope granted when
// the user connected their account.

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// Separates "Gmail said no / was unreachable" from ordinary bugs, so the route
// can map it to a 502 rather than a 500.
export class GmailError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message);
    this.name = "GmailError";
    if (status !== undefined) this.status = status;
    if (cause) this.cause = cause;
  }
}

// Gmail snippets arrive HTML-escaped (&amp; &#39; …). Decode the common entities
// so they read naturally in the UI. Declared as a hoisted function so
// getMessageMetadata can call it above its definition.
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

async function gmailGet(accessToken, path) {
  let res;
  try {
    res = await fetch(`${GMAIL_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    throw new GmailError("Couldn't reach Gmail.", { cause: err });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.error?.message || `HTTP ${res.status}`;
    throw new GmailError(`Gmail request failed (${res.status}): ${detail}`, {
      status: res.status,
    });
  }
  return data;
}

// List recent message IDs. Returns [{ id, threadId }] (may be empty). Defaults
// to the inbox so we don't surface Sent/Spam/Drafts. Gmail caps maxResults at
// 500; the list call returns newest-first.
export async function listMessageIds(
  accessToken,
  { maxResults = 15, labelIds = ["INBOX"] } = {}
) {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  for (const id of labelIds) params.append("labelIds", id);
  const data = await gmailGet(accessToken, `/messages?${params.toString()}`);
  return data.messages || [];
}

function headerValue(headers, name) {
  const target = name.toLowerCase();
  const found = (headers || []).find((h) => h.name?.toLowerCase() === target);
  return found?.value || "";
}

// Fetch just the metadata we need for one message — format=metadata avoids
// downloading the full body, which keeps the sync fast and cheap.
export async function getMessageMetadata(accessToken, id) {
  const params = new URLSearchParams({ format: "metadata" });
  for (const h of ["From", "Subject", "Date"]) {
    params.append("metadataHeaders", h);
  }
  const msg = await gmailGet(
    accessToken,
    `/messages/${id}?${params.toString()}`
  );
  const headers = msg.payload?.headers || [];
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: headerValue(headers, "From"),
    subject: headerValue(headers, "Subject"),
    snippet: decodeEntities(msg.snippet || ""),
    // internalDate is ms-since-epoch as a string — more reliable for ordering
    // and display than the free-text Date header.
    date: msg.internalDate
      ? new Date(Number(msg.internalDate)).toISOString()
      : null,
    labelIds: msg.labelIds || [],
  };
}

// List recent inbox messages with their metadata, newest first. Metadata for
// each message is fetched in parallel; an individual failure is dropped rather
// than failing the whole sync.
export async function listRecentMessages(accessToken, { maxResults = 15 } = {}) {
  const ids = await listMessageIds(accessToken, { maxResults });
  const settled = await Promise.allSettled(
    ids.map((m) => getMessageMetadata(accessToken, m.id))
  );
  return settled
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
}
