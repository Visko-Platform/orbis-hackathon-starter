import { z } from "zod";
import {
  body,
  db,
  failure,
  HttpError,
  owned,
  json,
  save,
  rateLimit,
  toStory,
} from "@/lib/cutline/server";
import { direct } from "@/lib/cutline/director";
import { COSMIC_CHAPTERS, QUICK_CUES, TEMPLATES } from "@/lib/cutline/content";
import type { StoryState } from "@/lib/cutline/types";
const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("direct"),
    planning: z.enum(["rehearsal", "nebius"]).default("rehearsal"),
    prompt: z.string().trim().min(3).max(1200),
  }),
  z.object({ type: z.literal("poll.open") }),
  z.object({ type: z.literal("poll.close") }),
  z.object({
    type: z.literal("poll.apply"),
    planning: z.enum(["rehearsal", "nebius"]).default("rehearsal"),
  }),
  z.object({ type: z.literal("branch"), sceneId: z.string().uuid() }),
  z.object({
    type: z.literal("cue"),
    cueId: z.string().max(40),
    prompt: z.string().max(1600).optional(),
    latency: z.number().min(0).max(120000).nullable().optional(),
  }),
  z.object({
    type: z.literal("cosmic"),
    chapter: z.number().int().min(0).max(8),
    running: z.boolean(),
  }),
  z.object({
    type: z.literal("session"),
    live: z.boolean(),
    paused: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("visual"),
    sceneId: z.string().uuid(),
    status: z.enum(["sent", "acknowledged", "observed", "failed"]),
  }),
  z.object({
    type: z.literal("memory"),
    memory: z.string().trim().min(10).max(1200),
  }),
]);
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { owner, story } = await owned(request, (await ctx.params).id);
    const raw = await body(request);
    const parsed = actionSchema.safeParse(raw);
    if (!parsed.success)
      throw new HttpError(400, "That story action is invalid.");
    if (raw.version !== undefined && raw.version !== story.version)
      throw new HttpError(
        409,
        "The story changed in another tab. Please try again.",
      );
    const action = parsed.data;
    const state: StoryState = structuredClone(story.state);
    const current = state.scenes.find((x) => x.id === state.currentSceneId)!;
    if (action.type === "direct" || action.type === "poll.apply") {
      if (action.type === "direct" && state.poll?.open)
        throw new HttpError(
          409,
          "Close audience voting before sending another direction.",
        );
      if (state.sessionLive && state.sessionPaused)
        throw new HttpError(
          409,
          "Resume the live film before directing the next scene.",
        );

      if (state.scenes.length >= 120)
        throw new HttpError(
          409,
          "This story has reached 120 scenes. Start a new story to continue.",
        );
      let prompt = action.type === "direct" ? action.prompt : "";
      if (action.type === "poll.apply") {
        if (
          !state.poll ||
          state.poll.open ||
          !state.poll.winnerId ||
          state.poll.applied ||
          state.poll.sceneId !== state.currentSceneId
        )
          throw new HttpError(
            409,
            "Close a poll with votes before applying its winner.",
          );
        const scene = state.scenes.find((x) => x.id === state.poll!.sceneId);
        prompt =
          scene?.choices.find((x) => x.id === state.poll!.winnerId)?.action ||
          "";
        if (!prompt)
          throw new HttpError(409, "The winning choice is unavailable.");
      }
      await rateLimit(owner, "director", 100);
      const beat = await direct(request, story, prompt, action.planning);
      state.scenes.push(beat);
      state.currentSceneId = beat.id;
      state.phase = "story";
      if (action.type === "direct") state.poll = null;
      if (state.poll) {
        state.poll.open = false;
        state.poll.closedAt = Date.now();
        if (action.type === "poll.apply") state.poll.applied = true;
      }
    } else if (action.type === "poll.open") {
      if (state.phase !== "story")
        throw new HttpError(
          409,
          "Finish the cosmic opening before opening audience voting.",
        );
      if (state.poll?.open) throw new HttpError(409, "Voting is already open.");
      state.poll = {
        id: crypto.randomUUID(),
        sceneId: current.id,
        open: true,
        openedAt: Date.now(),
      };
    } else if (action.type === "poll.close") {
      if (!state.poll?.open)
        throw new HttpError(409, "There is no open poll to close.");
      const closed = await db()
        .prepare(
          `WITH tallies AS (SELECT choice_id, COUNT(*) AS n FROM votes WHERE story_id = ? AND poll_id = ? GROUP BY choice_id), winner AS (SELECT json_extract(c.value,'$.id') AS id FROM json_each(?) c JOIN tallies t ON t.choice_id=json_extract(c.value,'$.id') ORDER BY t.n DESC, CAST(c.key AS INTEGER) ASC LIMIT 1) UPDATE stories SET state=json_set(state,'$.poll.open',json('false'),'$.poll.closedAt',?,'$.poll.results',json((SELECT json_group_object(choice_id,n) FROM tallies)),'$.poll.winnerId',(SELECT id FROM winner)), version=version+1, updated_at=? WHERE id=? AND version=? AND json_extract(state,'$.poll.open')=1 RETURNING *`,
        )
        .bind(
          story.id,
          state.poll.id,
          JSON.stringify(
            state.scenes.find((s) => s.id === state.poll!.sceneId)?.choices ||
              [],
          ),
          Date.now(),
          Date.now(),
          story.id,
          story.version,
        )
        .first();
      if (!closed)
        throw new HttpError(
          409,
          "The story changed while closing voting. Please try again.",
        );
      const updated = toStory(closed as Parameters<typeof toStory>[0]);
      return json({
        story: updated,
        winner: updated.state.poll?.winnerId || null,
      });
    } else if (action.type === "branch") {
      if (!state.scenes.some((x) => x.id === action.sceneId))
        throw new HttpError(404, "This scene was not found.");
      state.currentSceneId = action.sceneId;
      state.poll = null;
      state.phase = "story";
      state.cosmicRunning = false;
    } else if (action.type === "cue") {
      const cue = QUICK_CUES.find((x) => x.id === action.cueId);
      if (!cue && !["camera", "lighting"].includes(action.cueId))
        throw new HttpError(400, "Unknown live cue.");
      state.lastCue = cue?.label || action.prompt || action.cueId;
      state.lastCueAt = Date.now();
      state.lastCueLatency = action.latency ?? null;
      if (action.cueId === "camera")
        state.camera = action.prompt || state.camera;
      if (action.cueId === "lighting")
        state.lighting = action.prompt || state.lighting;
    } else if (action.type === "cosmic") {
      if (
        action.chapter !== state.cosmicChapter ||
        state.phase !== (action.chapter === 8 ? "story" : "opening")
      )
        state.poll = null;
      state.cosmicChapter = action.chapter;
      state.cosmicRunning = action.running;
      state.phase = action.chapter === 8 ? "story" : "opening";
      if (state.sessionLive) state.sessionPaused = action.chapter < 8;
      state.lastCue = COSMIC_CHAPTERS[action.chapter].name;
      state.lastCueAt = Date.now();
      if (
        action.chapter === 8 &&
        story.templateId === "cosmic-premiere" &&
        current.prompt === TEMPLATES[1].opening
      ) {
        const opening = TEMPLATES[0];
        current.prompt = opening.opening;
        current.title = "The departure";
        current.narration = opening.description;
        current.choices = structuredClone(opening.choices);
      }
    } else if (action.type === "session") {
      state.sessionLive = action.live;
      state.sessionPaused = action.paused || false;
      if (!action.live) state.cosmicRunning = false;
    } else if (action.type === "visual") {
      const beat = state.scenes.find((x) => x.id === action.sceneId);
      if (!beat) throw new HttpError(404, "This scene was not found.");
      beat.visualStatus = action.status;
    } else if (action.type === "memory") {
      state.memory = action.memory;
    }
    return json({ story: await save(story, state) });
  } catch (e) {
    return failure(e);
  }
}
