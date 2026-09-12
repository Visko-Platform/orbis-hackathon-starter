import { db, failure, identity, snapshot, getRow } from "@/lib/cutline/server";
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const voter = await identity(request);
    const id = (await ctx.params).id;
    const row = await getRow(id);
    const isAudience = row.owner !== voter;
    const encoder = new TextEncoder();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous = "";
    const started = Date.now();
    let seen = 0;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const stop = () => {
          if (stopped) return;
          stopped = true;
          if (timer) clearTimeout(timer);
          try {
            controller.close();
          } catch {}
        };
        request.signal.addEventListener("abort", stop, { once: true });
        controller.enqueue(encoder.encode("retry: 500\n\n"));
        const tick = async () => {
          if (stopped) return;
          try {
            if (isAudience && Date.now() - seen > 10000) {
              await db()
                .prepare(
                  "INSERT INTO viewers (story_id,voter,seen_at) VALUES (?,?,?) ON CONFLICT(story_id,voter) DO UPDATE SET seen_at=excluded.seen_at",
                )
                .bind(id, voter, Date.now())
                .run();
              seen = Date.now();
            }
            const value = JSON.stringify(await snapshot(id, voter));
            if (stopped) return;
            if (value !== previous) {
              controller.enqueue(encoder.encode("data: " + value + "\n\n"));
              previous = value;
            } else controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            if (!stopped)
              controller.enqueue(
                encoder.encode("event: unavailable\ndata: {}\n\n"),
              );
            stop();
            return;
          }
          if (Date.now() - started > 25000) {
            stop();
            return;
          }
          timer = setTimeout(tick, 700);
        };
        void tick();
      },
      cancel() {
        stopped = true;
        if (timer) clearTimeout(timer);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
