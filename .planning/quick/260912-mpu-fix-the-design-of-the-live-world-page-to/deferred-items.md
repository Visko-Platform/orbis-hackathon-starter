# Deferred Items — 260912-mpu

## Out-of-scope typecheck failure (concurrent work)

**Found during:** Task 2 verification (`npm run typecheck`)

**Issue:** `app/live-world/page.tsx(85,29): error TS2322: Type '{ memoryId: string; }' is not
assignable to type 'IntrinsicAttributes'.` — a concurrent session (working in this same shared
branch, without worktree isolation) edited `app/live-world/page.tsx` to pass
`memoryId={memoryId}` into `<LiveWorldSession />`, but `app/components/LiveWorldSession.tsx`'s
signature (`export function LiveWorldSession()`) has not been updated to accept that prop yet.

**Why deferred, not fixed:** This plan's `<context>` explicitly lists `LiveWorldSession.tsx` as
"Out of scope — do not touch." The broken line (`<LiveWorldSession memoryId={memoryId} />`) is
not part of this plan's diff — it was introduced by concurrent, unrelated work landing in the
same file while this plan executed. Fixing `LiveWorldSession.tsx`'s prop contract is an
architectural decision that belongs to whichever plan owns that memoryId-wiring change, not to
this reskin plan.

**This plan's own diff to `page.tsx`** (Schibsted Grotesk import/binding, `live-world-theme`
class, nav brand anchor) type-checks cleanly in isolation — the error is confined to the
unrelated `LiveWorldSession memoryId` line.

**Action:** Left unfixed. Whoever owns the memoryId-wiring plan should update
`LiveWorldSession`'s props to accept `memoryId?: string`.
