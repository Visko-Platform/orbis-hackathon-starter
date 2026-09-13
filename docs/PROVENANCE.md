# Source and media provenance

Cutline includes application code, an official hackathon starter adaptation, third-party dependencies, generated artwork, and agency-distributed scientific imagery. Their provenance and rights are not interchangeable.

## Official Visko starter

- Repository: [Visko-Platform/orbis-hackathon-starter](https://github.com/Visko-Platform/orbis-hackathon-starter).
- Pinned commit: [`6de7ad733e90967f25979afcfca55b73a71f064a`](https://github.com/Visko-Platform/orbis-hackathon-starter/tree/6de7ad733e90967f25979afcfca55b73a71f064a).
- Adapted material: model-message type and unwrapping helper in `lib/cutline/orbis/starter.ts`, plus image-conditioned startup/readiness patterns used by the live hook.
- Added product work: creator/audience UI, voting, story memory, graph persistence, bounded lifecycle handling, scientific source reference fitting, Dynamic steering, exports, and tests.
- Rights status: the upstream commit has no declared license. Attribution is preserved; it is not represented as wholly Cutline-authored or automatically covered by a blanket MIT claim. Any broader licensing decision must account for this separately.

See [STARTER.md](STARTER.md) for the exact implementation note. The presence of public source is not itself a declaration that every file is under the same license.

## Framework and dependency notices

The project originated from the Vinext / Sites starter shape and uses the dependencies in `package.json` and its lockfile. Preserve package license notices and the checked-in notices for `build/sites-vite-plugin.ts` and `vendor/shadcn-tailwind-4.13.0.css`. Reactor runtime assets copied into `public/reactor/` come from the installed SDK, not original Cutline source.

## Scientific source frames

Full image records, exact asset URLs, credits, classifications, dates, and reuse notes are maintained in [NASA provenance](provenance/NASA.md). Preserve the companion JSON manifest if included in the final repository.

| Chapter            | Original source kind                | Display credit / qualification                                                         |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------- |
| Universe           | JWST NIRCam infrared composite      | NASA / ESA / CSA / STScI; a small deep field, not the whole universe                   |
| Cosmic web         | Scientific simulation visualization | NASA / NCSA / University of Illinois; project contributors retained in the full credit |
| Milky Way          | Professional artist concept         | NASA / JPL-Caltech; no external whole-galaxy photograph exists                         |
| Solar system / Sun | SDO extreme-ultraviolet observation | NASA / GSFC / SDO; assigned color, no planetary orbit diagram                          |
| Earth              | Apollo 17 photograph                | NASA / Apollo 17 crew; Africa and Antarctica face the camera                           |
| San Francisco      | ISS astronaut photograph            | NASA / ISS / Johnson Space Center; orbital source, not a generated aerial photograph   |

The Earth image does not show California; moving from it to the San Francisco image is an editorial transition. The reference fitting helper contains original images within a 1600 × 900 canvas without stretching or cropping their source composition. Letterboxing is intentional.

NASA imagery is generally reusable under its media guidelines, with exceptions for identified third-party material and restrictions on implying endorsement. Preserve the exact credits and individual source notes rather than describing every asset as an unqualified public-domain file. Primary policies: [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/), [NASA SVS reuse FAQ](https://svs.gsfc.nasa.gov/help/), [JPL image policy](https://www.jpl.nasa.gov/jpl-image-use-policy/).

## Fictional and generated artwork

`public/images/multiverse.png`, `the-last-train.png`, and `cutline-banner.png` were generated as original Cutline concept artwork. The multiverse is explicitly speculative. The train is a fictional story keyframe. The banner is product artwork, not a screenshot of verified live footage. Prompts are documented in [ASSETS.md](ASSETS.md) and [COSMIC-ASSET.md](COSMIC-ASSET.md).

The release's cosmic opening displays original source images with gentle camera motion. It does not regenerate the scientific frames. Live Orbis takes belong to the fictional film and are labeled as generated. If future work animates a NASA reference with a generative model, acknowledge the source image while labeling that output as generated; do not credit NASA as the creator of model output or imply institutional sponsorship of Cutline.

## Publication hygiene

Keep source URLs usable, preserve the original credit alongside public assets, and use relative repository paths for local images. Do not publish credentials, private local paths, or a guessed product URL as provenance.

## Continuous 3D flight

`components/cutline/cosmic-flight.tsx` renders a cinematic compressed scale journey in which the credited NASA source images are mapped onto soft-edged discs and spheres inside the 3D scene (Webb deep field, NASA SVS cosmic web, NASA/JPL Milky Way concept, SDO Sun, NASA equirectangular Earth, ISS San Francisco), surrounded by original procedural star fields, geometry, and a modeled theater audience. It is a visualization, not recorded astronomical footage. Earth uses the original NASA equirectangular map in `public/images/nasa/earth-day.jpg`; see [Earth texture provenance](provenance/EARTH-TEXTURE.md). The SF terrain uses the credited ISS aerial; no invented buildings are overlaid on that photograph. The older NASA reference images remain available as scientific references, not consecutive movie frames.
