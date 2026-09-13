# Cosmic zoom source imagery

Six original agency images, downloaded and visually checked on 12 September 2026. All files are under 2 MB. No AI image generation or local image transformation was used.

| Frame                                                                                        | Kind                                                    | Dimensions  | Size    | Credit                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [Webb's First Deep Field (NIRCam Image)](../../public/images/nasa/deep-field.png)            | observed infrared color composite                       | 1024 × 1045 | 1729 KB | NASA, ESA, CSA, STScI                                                                                                                    |
| [Journey Through the Cosmic Web: Cosmic Cruising 2](../../public/images/nasa/cosmic-web.jpg) | scientific simulation visualization                     | 1280 × 720  | 242 KB  | NASA/NCSA University of Illinois; visualization: Frank Summers (STScI); simulation: Martin White and Lars Hernquist (Harvard University) |
| [Our Milky Way Gets a Makeover (Artist Concept)](../../public/images/nasa/milky-way.jpg)     | artist depiction informed by observations               | 1600 × 1600 | 224 KB  | NASA/JPL-Caltech                                                                                                                         |
| [Image of Sun From NASA's Solar Dynamics Observatory](../../public/images/nasa/sun.jpg)      | extreme-ultraviolet observation shown in assigned color | 4096 × 4096 | 1285 KB | NASA/GSFC/Solar Dynamics Observatory                                                                                                     |
| [The Blue Marble](../../public/images/nasa/earth.jpg)                                        | Apollo 17 photograph                                    | 1600 × 1600 | 291 KB  | NASA / Apollo 17 crew                                                                                                                    |
| [San Francisco's Metropolitan Mosaic](../../public/images/nasa/san-francisco.jpg)            | International Space Station astronaut photograph        | 1920 × 1280 | 566 KB  | NASA Earth Observatory / ISS Crew Earth Observations Facility and Earth Science and Remote Sensing Unit, NASA Johnson Space Center       |

## Source and reuse details

### deep-field

- Source: [Webb's First Deep Field (NIRCam Image)](https://science.nasa.gov/asset/webb/webbs-first-deep-field-nircam-image/)
- Downloaded asset: [Agency image](https://assets.science.nasa.gov/dynamicimage/assets/science/missions/webb/science/2022/07/STScI-01G8H1K2BCNATEZSKVRN9Z69SR.png?w=1024&h=1045&fit=clip)
- Credit: NASA, ESA, CSA, STScI
- Display label: **Webb deep field · infrared observation**
- Reuse: NASA-distributed science image; reuse under NASA media guidelines with full institutional credit; no additional restriction marked on source page.
- Accuracy: A real composite of NIRCam exposures of SMACS 0723. Infrared filters are assigned visible colors. It is not a photo of the whole universe or a multiverse.

### cosmic-web

- Source: [Journey Through the Cosmic Web: Cosmic Cruising 2](https://svs.gsfc.nasa.gov/10118/)
- Downloaded asset: [Agency image](https://svs.gsfc.nasa.gov/vis/a010000/a010100/a010118/CosmicWeb0013.jpg)
- Credit: NASA/NCSA University of Illinois; visualization: Frank Summers (STScI); simulation: Martin White and Lars Hernquist (Harvard University)
- Display label: **Cosmic web · scientific simulation**
- Reuse: Public domain under NASA SVS's stated default; no exception notice on this still. Preserve the full project credit.
- Accuracy: Visualizes a 134-megaparsec simulation cube. Purple material represents dark matter; this is not a visible-light telescope photograph.

### milky-way

- Source: [Our Milky Way Gets a Makeover (Artist Concept)](https://science.nasa.gov/photojournal/our-milky-way-gets-a-makeover-artist-concept/)
- Downloaded asset: [Agency image](https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia10/pia10748/PIA10748.jpg?w=1600&h=1600&fit=clip)
- Credit: NASA/JPL-Caltech
- Display label: **Milky Way · NASA/JPL artist concept**
- Reuse: NASA/JPL-Caltech institutional image; reuse subject to NASA/JPL media guidelines, source credit, and no implied endorsement. No additional restriction marked.
- Accuracy: A professional artist's exterior view based on Spitzer-era findings. We cannot photograph our entire galaxy from outside it; do not label this a photograph.

### sun

- Source: [Image of Sun From NASA's Solar Dynamics Observatory](https://www.jpl.nasa.gov/images/pia26681-image-of-sun-from-nasas-solar-dynamics-observatory/)
- Downloaded asset: [Agency image](https://d2pn8kiwq2w21t.cloudfront.net/original_images/contentdamsciencepsdphotojournalpiapia26pia26681PIA26681.jpg)
- Credit: NASA/GSFC/Solar Dynamics Observatory
- Display label: **Sun · SDO/AIA 171 Å observation**
- Reuse: NASA observation distributed by JPL; reusable under the linked media guidelines with the provided NASA/GSFC/SDO credit. No additional restriction marked.
- Accuracy: Real AIA 171 Å data, not naked-eye solar color. Original source includes an instrument/date legend along its lower edge.

### earth

- Source: [The Blue Marble](https://science.nasa.gov/resource/the-blue-marble/)
- Downloaded asset: [Agency image](https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/i/IMG004849.jpg?w=1600&h=1600&fit=clip)
- Credit: NASA / Apollo 17 crew
- Display label: **Earth · Apollo 17 photograph**
- Reuse: NASA astronaut photograph; reusable under NASA media guidelines with source credit and no implied endorsement. No additional restriction marked.
- Accuracy: A real full-disk photograph centered on Africa and Antarctica. California is not visible in this hemisphere, so an Earth-to-San-Francisco transition is editorial rather than a literal continuous zoom.

### san-francisco

- Source: [San Francisco's Metropolitan Mosaic](https://science.nasa.gov/missions/station/san-franciscos-metropolitan-mosaic/)
- Downloaded asset: [Agency image](https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/iotd/2026/san-francisco%E2%80%99s-metropolitan-mosaic/ISS074-E-619284_lrg.jpg?w=1920&h=1280&fit=clip)
- Credit: NASA Earth Observatory / ISS Crew Earth Observations Facility and Earth Science and Remote Sensing Unit, NASA Johnson Space Center
- Display label: **San Francisco · ISS photograph**
- Reuse: NASA astronaut photograph made publicly available by ISS/JSC; reusable under NASA media guidelines with source credit and no implied endorsement. No additional restriction marked.
- Accuracy: Real orbital photograph. NASA's published version was cropped, contrast enhanced, and had lens artifacts removed. Includes Golden Gate Bridge, Bay Bridge, and the northeastern waterfront.

## Where each image appears in the interactive flight

The flight (`components/cutline/cosmic-flight.tsx`) maps the source images into the 3D scene rather than showing them as slides. Each photographed layer sits on a soft-edged disc with additive blending, so black sky contributes nothing and no rectangular frame is visible. Layers fade out before the next scale would enlarge them into a blurry backdrop.

| Chapter | Layer | Treatment |
| --- | --- | --- |
| Universe | Webb deep field | Disc behind the procedural cosmic web; at the multiverse scale it reads as a round universe filled with real galaxies. |
| Cosmic web | NASA SVS simulation still | Centered square crop of the 16:9 frame on a disc behind the procedural filaments and galaxy clusters. |
| Milky Way | NASA/JPL artist concept | Tilted disc (the same oblique angle as before) with a thin scattered stellar layer above it for parallax. |
| Solar system | SDO/AIA 171 Å observation | Disc with the lower legend strip cropped away, a warm core and point light behind it, and planets in observed colours. |
| Earth | NASA equirectangular map | Wrapped on a lit sphere with a two-layer atmosphere rim; see [EARTH-TEXTURE.md](EARTH-TEXTURE.md). |
| San Francisco | ISS photograph | Ground plane under the approach; no invented buildings are overlaid. |

Procedural stars, filaments, orbits, and the theater are original geometry. The sequence remains an artistic scale journey; see the accuracy notes above for each source.

## Integration notes

- NASA imagery is generally reusable under NASA media guidelines, subject to identified third-party rights and no implied endorsement. No third-party copyright restriction was found on these selected image pages.
- NASA SVS states its content is public domain unless otherwise noted; the selected cosmic-web still has no exception notice.
- JPL permits reuse of its images unless otherwise noted, with source credit and no implied endorsement.
- Credit the original source frames. If a live model animates or transforms a source, label the resulting output as AI-generated and disclose NASA source material without attributing the generated result to NASA.
- The sequence is an artistic scale journey, not a measured continuous astronomical flight. There is no real photograph of a multiverse or an external photograph of the Milky Way.

Policies: [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/), [NASA SVS reuse FAQ](https://svs.gsfc.nasa.gov/help/), [JPL image policy](https://www.jpl.nasa.gov/jpl-image-use-policy/).

The JSON manifest includes exact source and asset URLs, individual credits, dates, classifications, dimensions, byte counts, and SHA-256 checksums.
