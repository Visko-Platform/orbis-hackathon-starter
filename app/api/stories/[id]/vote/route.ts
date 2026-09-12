import { z } from "zod";
import {
  body,
  db,
  failure,
  HttpError,
  identity,
  json,
  snapshot,
  getRow,
} from "@/lib/cutline/server";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const voter = await identity(request);
    const id = (await ctx.params).id;
    const data = z
      .object({
        pollId: z.string().uuid(),
        choiceId: z.string().min(1).max(40),
      })
      .safeParse(await body(request));
    if (!data.success)
      throw new HttpError(400, "Choose one of the current options.");
    await getRow(id);
    const result = await db()
      .prepare(
        `INSERT INTO votes (story_id,poll_id,voter,choice_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM stories s, json_each(s.state,'$.scenes') scene, json_each(scene.value,'$.choices') choice WHERE s.id = ? AND json_extract(s.state,'$.phase') = 'story' AND json_extract(s.state,'$.poll.open') = 1 AND json_extract(s.state,'$.poll.id') = ? AND json_extract(scene.value,'$.id') = json_extract(s.state,'$.poll.sceneId') AND json_extract(choice.value,'$.id') = ?) ON CONFLICT(story_id,poll_id,voter) DO UPDATE SET choice_id = excluded.choice_id, created_at = excluded.created_at RETURNING choice_id`,
      )
      .bind(
        id,
        data.data.pollId,
        voter,
        data.data.choiceId,
        Date.now(),
        id,
        data.data.pollId,
        data.data.choiceId,
      )
      .first();
    if (!result)
      throw new HttpError(409, "Voting has closed or the options changed.");
    return json(await snapshot(id, voter));
  } catch (e) {
    return failure(e);
  }
}
