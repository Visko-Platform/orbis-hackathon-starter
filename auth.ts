import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Single-purpose gate: only the presenter's own Google account may sign in.
// This is the actual access-control boundary for the whole site, including
// /api/reactor/token — Vercel's own Deployment Protection cannot cover this
// project's assigned production domain, so this callback is what stands
// between the public internet and a billable Reactor session.
const ALLOWED_EMAILS = new Set(["romy.ilano@gmail.com"]);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      return !!profile?.email && ALLOWED_EMAILS.has(profile.email);
    },
  },
  pages: {
    error: "/api/auth/error",
  },
});
