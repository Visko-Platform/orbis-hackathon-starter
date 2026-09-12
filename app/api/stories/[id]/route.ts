import {
  failure,
  identity,
  json,
  snapshot,
  owned,
  db,
  assertOrigin,
} from "@/lib/cutline/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, ctx: Context) {
  try {
    return json(await snapshot((await ctx.params).id, await identity(request)));
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request, ctx: Context) {
  try {
    assertOrigin(request);
    const { row } = await owned(request, (await ctx.params).id);
    await db()
      .prepare("DELETE FROM stories WHERE id = ? AND owner = ?")
      .bind(row.id, row.owner)
      .run();
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
