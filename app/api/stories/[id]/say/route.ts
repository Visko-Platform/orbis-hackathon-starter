import { z } from "zod";
import {
  body,
  failure,
  getRow,
  HttpError,
  identity,
  json,
  rateLimit,
  save,
  snapshot,
  toStory,
} from "@/lib/cutline/server";
import type { Shout, StoryState } from "@/lib/cutline/types";

/** An audience member talked to the screen. The shout joins the room's crowd
 *  feed; the director's screen merges pending shouts into the next scene. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const voter = await identity(request);
    const id = (await ctx.params).id;
    const data = z
      .object({ text: z.string().trim().min(2).max(240) })
      .safeParse(await body(request));
    if (!data.success)
      throw new HttpError(400, "Say a few words about what should happen.");
    await rateLimit(voter, "say", 240);
    const text = data.data.text.replace(/\s+/g, " ");
    for (let attempt = 0; attempt < 4; attempt++) {
      const story = toStory(await getRow(id));
      const state: StoryState = structuredClone(story.state);
      if (state.phase !== "story")
        throw new HttpError(
          409,
          "The film has not started yet. Watch the screen.",
        );
      if (state.openMic === false)
        throw new HttpError(
          409,
          "The director has closed the room microphone for now.",
        );
      const now = Date.now();
      const shout: Shout = {
        id: crypto.randomUUID(),
        text,
        at: now,
        voter: voter.slice(0, 8),
      };
      state.crowd = [
        ...(state.crowd || []).filter((s) => now - s.at < 300000),
        shout,
      ].slice(-24);
      try {
        await save(story, state);
        return json(await snapshot(id, voter));
      } catch (e) {
        if (!(e instanceof HttpError && e.status === 409) || attempt === 3)
          throw e;
      }
    }
    throw new HttpError(409, "The room is busy. Say it again.");
  } catch (e) {
    return failure(e);
  }
}
