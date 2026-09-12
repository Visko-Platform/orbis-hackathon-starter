# User demo: a viewer's watch page with an interactive Rolex ad break

Date: 2026-09-12. Status: implemented in the same change.

## Goal

Show the consumer side of an interactive ad. A presenter opens a
YouTube-style watch page from the studio, plays a video, goes fullscreen,
and a few seconds in an interactive Rolex ad takes over the player: the
live Orbis take on the Rolex demo path, steered with the same bubbles the
studio has, then "Skip ad" returns to the video.

## Design

- `app/watch` renders `components/watch/watch-page.tsx`: a fictional
  "ViewTube" page (dark theme) with a header, a custom video player, title,
  channel row, description, comments and an "Up next" column. Content is
  fictional except the clip, which is the Blender Foundation Sintel trailer
  already in `public/scenes` (CC BY 3.0, credited in the description).
- `components/watch/video-player.tsx` owns playback, custom controls,
  keyboard shortcuts and fullscreen on its container, so the ad overlay is
  inside the fullscreen element. The timeline shows a yellow ad marker.
- `lib/watch/schedule.ts` is the pure ad schedule: `prewarm` from
  `adAt - PREWARM_S`, `show` from `adAt`, once per page load.
- `components/watch/ad-break.tsx` is the ad. During prewarm it composes the
  Submariner opening frame, calls `prepare` with the demo's first beat
  (verbatim) and starts the Orbis run; at `adAt` the player pauses and the
  overlay shows the live view with "Rolex · Sponsored", the next bubbles from
  `demoChips`, a free-text field (a cue runs that beat, anything else is a
  pivot carrying the scene contract) and "Skip ad" after 5 s. Skip
  disconnects the session and resumes the video.
- `lib/demo/client.ts` holds the demo-beat and pivot requests, shared by the
  studio and the ad.
- The studio's player footer gets a "User demo" button next to "Generate
  live": it opens `/watch` in a new tab and releases the studio's session
  first (one live session per key).
- `?live=0` shows the ad with the campaign still instead of connecting, for
  demos without a free session slot and for UI checks. `?adAt=<s>` moves
  the break.

## Not included

Real video hosting, comments that post, a real ad auction. The page is a
presentation of the viewer experience, not a product.
