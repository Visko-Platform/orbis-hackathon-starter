export const CHAPTER_REFERENCES = [
  {
    image: "/images/multiverse.png",
    kind: "Speculative artwork",
    credit: "Cutline concept artwork",
    source: "",
    note: "An imagined multiverse. No observational image exists.",
  },
  {
    image: "/images/nasa/deep-field.png",
    kind: "Webb infrared composite",
    credit: "NASA / ESA / CSA / STScI",
    source:
      "https://science.nasa.gov/asset/webb/webbs-first-deep-field-nircam-image/",
    note: "Webb’s first deep field: a small region of the sky, shown in assigned infrared colors.",
  },
  {
    image: "/images/nasa/cosmic-web.jpg",
    kind: "Scientific simulation",
    credit: "NASA / NCSA · F. Summers, M. White & L. Hernquist",
    source: "https://svs.gsfc.nasa.gov/10118/",
    note: "A scientific visualization of large-scale structure, not a photograph.",
  },
  {
    image: "/images/nasa/milky-way.jpg",
    kind: "NASA artist concept",
    credit: "NASA / JPL-Caltech",
    source:
      "https://science.nasa.gov/photojournal/our-milky-way-gets-a-makeover-artist-concept/",
    note: "We cannot photograph the Milky Way from outside. This is an artist’s reconstruction.",
  },
  {
    image: "/images/nasa/sun.jpg",
    kind: "SDO ultraviolet observation",
    credit: "NASA / SDO / AIA",
    source:
      "https://www.jpl.nasa.gov/images/pia26681-image-of-sun-from-nasas-solar-dynamics-observatory/",
    note: "Our star in extreme ultraviolet, assigned color. Planetary orbits are not pictured.",
  },
  {
    image: "/images/nasa/earth.jpg",
    kind: "Apollo 17 photograph",
    credit: "NASA / Apollo 17 crew",
    source: "https://science.nasa.gov/resource/the-blue-marble/",
    note: "The Blue Marble, December 7, 1972. Africa and Antarctica face the camera.",
  },
  {
    image: "/images/nasa/san-francisco.jpg",
    kind: "ISS astronaut photograph",
    credit: "NASA / ISS / Johnson Space Center",
    source:
      "https://science.nasa.gov/missions/station/san-franciscos-metropolitan-mosaic/",
    note: "San Francisco from orbit, May 27, 2026. The Earth-to-city transition is an editorial cut.",
  },
  {
    image: "/images/castro-audience-1910.jpg",
    kind: "Castro Theatre audience · 1910",
    credit: "Turrill & Miller / Academy archive",
    source: "https://commons.wikimedia.org/wiki/File:Orig_Castro_Theatre.jpg",
    note: "The original Castro Theatre opening-night audience, December 21, 1910. An archival photograph of the 479 Castro Street venue, not today’s theater.",
  },
  {
    image: "/images/the-last-train.png",
    kind: "Fictional film keyframe",
    credit: "Cutline concept artwork",
    source: "",
    note: "An original fictional train scene, animated and steered with Visko Orbis.",
  },
] as const;

/** Fit scientific images without stretching or cropping their source composition. */
export async function referenceFile(path: string): Promise<File> {
  const response = await fetch(path);
  if (!response.ok)
    throw new Error("The reference image could not be loaded. Try again.");
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot prepare reference images.");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 1600, 900);
    const scale = Math.min(1600 / bitmap.width, 900 / bitmap.height);
    const width = bitmap.width * scale,
      height = bitmap.height * scale;
    ctx.drawImage(
      bitmap,
      (1600 - width) / 2,
      (900 - height) / 2,
      width,
      height,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("Could not prepare the reference image.")),
        "image/jpeg",
        0.94,
      ),
    );
    return new File([blob], "cutline-reference.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
