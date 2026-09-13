import { env } from "cloudflare:workers";
import type { Story, StoryState, Snapshot } from "./types";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function db(): D1Database {
  const value = env.DB as D1Database | undefined;
  if (!value)
    throw new HttpError(
      503,
      "Story storage is unavailable. Please try again shortly.",
    );
  return value;
}
export function setting(name: string): string {
  return String(
    (env as unknown as Record<string, unknown>)[name] ||
      process.env[name] ||
      "",
  );
}
export function cookieToken(request: Request): string | null {
  const raw = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)cutline_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  return raw || null;
}
export function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function hash(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function identity(request: Request) {
  const token = cookieToken(request);
  if (!token)
    throw new HttpError(401, "Open the studio once to start your session.");
  return hash(token);
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new HttpError(403, "This request came from another site.");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site")
    throw new HttpError(403, "Cross-site requests are not allowed.");
}
export async function body(request: Request) {
  assertOrigin(request);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 24000)
    throw new HttpError(413, "This request is too large.");
  const text = await request.text();
  if (text.length > 24000)
    throw new HttpError(413, "This request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Send a valid JSON request.");
  }
}
export function json(
  value: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error(
    "Cutline request failed",
    error instanceof Error ? error.name : "unknown",
  );
  return json(
    {
      error:
        "Something went wrong while saving the story. Your input is safe; please try again.",
    },
    500,
  );
}
type Row = {
  id: string;
  owner: string;
  title: string;
  template_id: string;
  genre: string;
  state: string;
  version: number;
  created_at: number;
  updated_at: number;
};
export function toStory(row: Row): Story {
  return {
    id: row.id,
    title: row.title,
    templateId: row.template_id,
    genre: row.genre,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    state: JSON.parse(row.state),
  };
}
export async function getRow(id: string) {
  if (!/^[A-Z0-9]{8}$/.test(id))
    throw new HttpError(404, "This story room was not found.");
  const row = await db()
    .prepare("SELECT * FROM stories WHERE id = ?")
    .bind(id)
    .first<Row>();
  if (!row) throw new HttpError(404, "This story room was not found.");
  return row;
}
export async function owned(request: Request, id: string) {
  const owner = await identity(request);
  const row = await getRow(id);
  if (row.owner !== owner)
    throw new HttpError(403, "Only this story’s creator can direct it.");
  return { owner, row, story: toStory(row) };
}
export async function save(story: Story, state: StoryState) {
  const result = await db()
    .prepare(
      "UPDATE stories SET state = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ? RETURNING *",
    )
    .bind(JSON.stringify(state), Date.now(), story.id, story.version)
    .first<Row>();
  if (!result)
    throw new HttpError(
      409,
      "The story changed in another tab. Please try your action again.",
    );
  return toStory(result);
}
export async function snapshot(
  id: string,
  viewer: string | null,
): Promise<Snapshot> {
  if (!/^[A-Z0-9]{8}$/.test(id))
    throw new HttpError(404, "This story room was not found.");
  const row = await db()
    .prepare(
      `SELECT s.*, (SELECT json_group_object(choice_id,n) FROM (SELECT choice_id, COUNT(*) n FROM votes WHERE story_id=s.id AND poll_id=json_extract(s.state,'$.poll.id') GROUP BY choice_id)) vote_counts, (SELECT COUNT(*) FROM viewers WHERE story_id=s.id AND seen_at>?) viewer_count, (SELECT choice_id FROM votes WHERE story_id=s.id AND poll_id=json_extract(s.state,'$.poll.id') AND voter=?) my_vote FROM stories s WHERE s.id=?`,
    )
    .bind(Date.now() - 30000, viewer, id)
    .first<
      Row & {
        vote_counts: string;
        viewer_count: number;
        my_vote: string | null;
      }
    >();
  if (!row) throw new HttpError(404, "This story room was not found.");
  return {
    story: toStory(row),
    isOwner: row.owner === viewer,
    votes: JSON.parse(row.vote_counts || "{}"),
    viewers: row.viewer_count,
    myVote: row.my_vote,
  };
}
export async function rateLimit(owner: string, kind: string, limit: number) {
  const bucket = kind + ":" + Math.floor(Date.now() / 3600000);
  const row = await db()
    .prepare(
      "INSERT INTO usage (owner, bucket, count) VALUES (?, ?, 1) ON CONFLICT(owner,bucket) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count",
    )
    .bind(owner, bucket, limit)
    .first();
  if (!row)
    throw new HttpError(
      429,
      "This session has reached its hourly limit. Please try again later.",
    );
}
export function isLocalHost(request: Request) {
  try {
    const host = new URL(request.url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}
export function providerKey(request: Request, provider: "reactor" | "nebius") {
  const own = request.headers.get("x-" + provider + "-key")?.trim();
  if (own) {
    if (own.length > 2048) throw new HttpError(400, "Invalid API key.");
    return own;
  }
  const key = setting(provider.toUpperCase() + "_API_KEY");
  if (!key) return "";
  // Local demos (localhost only) use the shared keys from .env.local without a
  // presenter code. Any public host still requires LIVE_ACCESS_CODE.
  if (isLocalHost(request)) return key;
  const required = setting("LIVE_ACCESS_CODE");
  if (required.length < 16)
    throw new HttpError(
      503,
      "The host must set LIVE_ACCESS_CODE to at least 16 characters to protect the shared sponsor keys, or enter a personal key in Connections.",
    );
  if (request.headers.get("x-cutline-access-code") !== required)
    throw new HttpError(
      403,
      "Enter the presenter access code in Connections to use the shared sponsor keys.",
    );
  return key;
}

export async function sharedBudget(
  request: Request,
  provider: "reactor" | "nebius",
) {
  if (request.headers.get("x-" + provider + "-key")?.trim()) return;
  const fallback = provider === "reactor" ? 12 : 120;
  const configured = Number(
    setting("SHARED_" + provider.toUpperCase() + "_HOURLY_LIMIT"),
  );
  const limit =
    Number.isInteger(configured) && configured > 0
      ? Math.min(configured, 1000)
      : fallback;
  await rateLimit("shared-provider", provider, limit);
}
