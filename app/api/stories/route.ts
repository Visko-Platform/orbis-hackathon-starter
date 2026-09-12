import { z } from "zod";
import {
  body,
  db,
  failure,
  identity,
  json,
  rateLimit,
  toStory,
  HttpError,
} from "@/lib/cutline/server";
import { createState, TEMPLATES } from "@/lib/cutline/content";
export async function GET(request: Request) {
  try {
    const owner = await identity(request);
    const rows = await db()
      .prepare(
        "SELECT * FROM stories WHERE owner = ? ORDER BY updated_at DESC LIMIT 50",
      )
      .bind(owner)
      .all();
    return json({
      stories: rows.results.map((x) =>
        toStory(x as Parameters<typeof toStory>[0]),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const owner = await identity(request);
    const parsed = z
      .object({
        templateId: z.enum(["last-train", "cosmic-premiere", "custom"]),
        title: z.string().trim().min(1).max(80).optional(),
        opening: z.string().trim().min(10).max(1200).optional(),
        memory: z.string().trim().min(10).max(1200).optional(),
      })
      .safeParse(await body(request));
    if (!parsed.success)
      throw new HttpError(
        400,
        "Choose a story template and a title under 80 characters.",
      );
    await rateLimit(owner, "create", 30);
    const t = TEMPLATES.find((x) => x.id === parsed.data.templateId)!;
    const state = createState(t.id);
    state.currentSceneId = state.scenes[0].id;
    if (parsed.data.opening) state.scenes[0].prompt = parsed.data.opening;
    if (parsed.data.memory) state.memory = parsed.data.memory;
    const id = crypto
      .randomUUID()
      .replaceAll("-", "")
      .slice(0, 8)
      .toUpperCase();
    const now = Date.now();
    await db()
      .prepare(
        "INSERT INTO stories (id, owner, title, template_id, genre, state, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
      )
      .bind(
        id,
        owner,
        parsed.data.title || t.title,
        t.id,
        t.genre,
        JSON.stringify(state),
        now,
        now,
      )
      .run();
    return json(
      {
        story: {
          id,
          title: parsed.data.title || t.title,
          templateId: t.id,
          genre: t.genre,
          state,
          version: 1,
          createdAt: now,
          updatedAt: now,
        },
      },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
