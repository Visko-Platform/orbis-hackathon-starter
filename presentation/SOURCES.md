# CUTLINE presentation sources

Source references are photographs, observations, simulations and artist concepts as individually labeled; the slide-3 gallery is not an app screenshot. Multiverse and train stills are speculative AI artwork.

- Original speculative AI artwork, assets/multiverse.png. Not a factual visualization.
- repository/lib/cutline/content.ts
- repository/components/cutline/audience.tsx
- Original AI story still, assets/train.png.
- repository/components/cutline
- Webb's First Deep Field (NIRCam Image) — NASA, ESA, CSA, STScI — https://science.nasa.gov/asset/webb/webbs-first-deep-field-nircam-image/
- Journey Through the Cosmic Web: Cosmic Cruising 2 — NASA/NCSA University of Illinois; visualization: Frank Summers (STScI); simulation: Martin White and Lars Hernquist (Harvard University) — https://svs.gsfc.nasa.gov/10118/
- Our Milky Way Gets a Makeover (Artist Concept) — NASA/JPL-Caltech — https://science.nasa.gov/photojournal/our-milky-way-gets-a-makeover-artist-concept/
- Image of Sun From NASA's Solar Dynamics Observatory — NASA/GSFC/Solar Dynamics Observatory — https://www.jpl.nasa.gov/images/pia26681-image-of-sun-from-nasas-solar-dynamics-observatory/
- The Blue Marble — NASA / Apollo 17 crew — https://science.nasa.gov/resource/the-blue-marble/
- San Francisco's Metropolitan Mosaic — NASA Earth Observatory / ISS Crew Earth Observations Facility and Earth Science and Remote Sensing Unit, NASA Johnson Space Center — https://science.nasa.gov/missions/station/san-franciscos-metropolitan-mosaic/
- Source references shown on this slide are not app screenshots. Multiverse: speculative AI artwork. The Three.js camera journey uses cinematic compressed scales. Six thumbnails retain their exact agency image classifications.
- repository/db/schema.ts
- repository/app/api/stories/[id]/vote/route.ts
- repository/app/api/stories/[id]/action/route.ts
- repository/app/api/stories/[id]/events/route.ts
- repository/lib/cutline/director.ts
- repository/components/cutline/use-live-video.ts
- repository/app/api/stories/[id]/token/route.ts
- https://github.com/Visko-Platform/orbis-hackathon-starter/tree/6de7ad733e90967f25979afcfca55b73a71f064a
- https://www.reactor.inc/models/visko-orbis-stable/api
- Official starter audited at commit 6de7ad733e90967f25979afcfca55b73a71f064a on 2026-09-12. CUTLINE is a separate application, not the unmodified starter.
- Browser observations supplied by project lead. Latest Orbis Stable session showed 2560×1440 delivery, 18 fps, and image_confirmed. Earlier Orbis Dynamic session also delivered live video. No standalone trace log was captured for the earlier timing observation. Earth imagery visibly distorted after 40 seconds in a Stable test, motivating use of original NASA source imagery in the cinematic 3D opening, with generated video reserved for fiction. This is not a measured quality benchmark.
- Reactor documentation describes 832×480 generation at 18 fps with upscaled delivery. 2560×1440 is a delivery resolution, not native model generation resolution.
- repository/lib/cutline/story.ts
- repository/tests/story.test.ts
- https://svs.gsfc.nasa.gov/10118/
- Cosmic-web background credit: NASA/NCSA University of Illinois; visualization: Frank Summers (STScI); simulation: Martin White and Lars Hernquist (Harvard University); scientific simulation.
- repository/docs/testing/api-results.json
- repository/docs/testing/sse-evidence.json
- repository/tests/integration.mjs
- Recorded integration run completed 2026-09-12T22:23:48.873Z. 12 passed groups, 0 failed, 210 assertions.
- repository/docs/testing/combined-live.json
- 2026-09-12T23:30:48.972571+00:00: local production build, reactor/visko-orbis-stable, Nebius openai/gpt-oss-120b. Open the last door won; Nebius produced Mara Opens the Amber Door with three choices; source nebius; image conditioning confirmed; 18 fps; prompt acknowledgment 93 ms; next chunk after cue 1927 ms. Visual inspection showed Mara near an amber train doorway. These are one-run observations, not a benchmark or proof of every requested semantic detail.
- repository/components/cutline/studio.tsx
- Original speculative AI background, assets/multiverse.png.
