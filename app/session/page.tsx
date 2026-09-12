import { ViskoOrbisStableApp } from "../ViskoOrbisStableApp";
import { SetupRequired } from "../SetupRequired";

// The actual Reactor app, moved off the public root. This route is
// gated by middleware.ts — only an authenticated (allowlisted) Google
// session reaches this component, which is what makes it safe for
// this route (and /api/reactor/token) to mint billable sessions.
//
// Server Component: only job is to check whether the app is configured
// (REACTOR_API_KEY present) and render the right tree.
//   - missing key  → friendly <SetupRequired /> landing
//   - present      → <ViskoOrbisStableApp />, which fetches the JWT itself
//
// `dynamic = "force-dynamic"` skips static prerendering so the env
// check runs per-request.
export const dynamic = "force-dynamic";

export default function SessionPage() {
  const hasKey = !!process.env.REACTOR_API_KEY;
  return hasKey ? <ViskoOrbisStableApp /> : <SetupRequired />;
}
