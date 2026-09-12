import { auth } from "@/auth";

export default auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  // Only the actual live-session surface is gated. The public teaser page
  // at "/" (app/page.tsx) is intentionally NOT matched here — anyone,
  // judges included, can view it without logging in. /session is where the
  // real ViskoOrbisStableApp renders, and /api/reactor/token is the
  // billable token-mint route; both must stay behind the Google login.
  //
  // /internal/* is the developer-only raw-pipeline test surface (spike
  // 016), and /api/nano-banana + /api/orbis-prompt are its billable Gemini
  // routes — same reasoning as /api/reactor/token above: unmatched here,
  // they'd be world-callable and burn GEMINI_API_KEY with no login at all.
  //
  // /add-family also calls /api/nano-banana + /api/orbis-prompt directly at
  // save time (see AddFamily.tsx's groundFamilyMemory() call) — gated here
  // for the same reason, even though the page itself has no key of its own.
  matcher: [
    "/session/:path*",
    "/api/reactor/:path*",
    "/internal/:path*",
    "/api/nano-banana/:path*",
    "/api/orbis-prompt/:path*",
    "/add-family/:path*",
  ],
};
