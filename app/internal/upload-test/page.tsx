import { Header } from "../../components/Header";
import { SetupRequired } from "../../SetupRequired";
import { UploadTestApp } from "./UploadTestApp";

// Gated by middleware.ts same as /session — this is a developer-only route,
// never linked from the public teaser or the presenter flow.
export const dynamic = "force-dynamic";

export default function UploadTestPage() {
  const hasReactorKey = !!process.env.REACTOR_API_KEY;
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;

  if (!hasReactorKey) return <SetupRequired />;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {!hasGeminiKey && (
        <div className="border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 text-xs text-amber-300">
          GEMINI_API_KEY is not set — the edit and grounding steps will fail
          until it&apos;s added to .env.local (see .env.example).
        </div>
      )}
      <UploadTestApp />
    </div>
  );
}
