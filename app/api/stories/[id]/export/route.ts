import { failure, owned } from "@/lib/cutline/server";
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { story } = await owned(request, (await ctx.params).id);
    const format = new URL(request.url).searchParams.get("format");
    const content =
      format === "md"
        ? `# ${story.title}\n\nCreated with Cutline.\n\n## Story memory\n${story.state.memory}\n\n${story.state.scenes.map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.narration}\n\n**Direction:** ${s.prompt}\n\n**Source:** ${s.source}. **Video:** ${s.visualStatus || "draft"}.\n\nParent scene: ${s.parentId || "opening"}.\n\n${s.choices.map((c) => "- " + c.label + ": " + c.action).join("\n")}`).join("\n\n")}\n`
        : JSON.stringify(
            {
              schemaVersion: 1,
              product: "Cutline",
              exportedAt: new Date().toISOString(),
              story,
            },
            null,
            2,
          );
    return new Response(content, {
      headers: {
        "Content-Type":
          format === "md" ? "text/markdown; charset=utf-8" : "application/json",
        "Content-Disposition": `attachment; filename="cutline-${story.id}.${format === "md" ? "md" : "json"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
