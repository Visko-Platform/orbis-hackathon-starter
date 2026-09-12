export type PlacementZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FilmTitle = {
  id: string;
  title: string;
  moment: string;
  genre: string;
  palette: string;
  media: {
    video: string;
    poster: string;
    sourceUrl: string;
    sourceLabel: string;
    license: string;
  };
  continuity: {
    setting: string;
    camera: string;
    lighting: string;
    objective: string;
  };
};

export type AudienceProfile = {
  id: string;
  name: string;
  detail: string;
  initials: string;
  affinities: string[];
};

export type Campaign = {
  id: string;
  brand: string;
  logo: string;
  assets: {
    id: string;
    label: string;
    src: string;
    kind: "logo" | "product" | "campaign";
    sourceUrl: string;
    /** How this exact asset lives in the scene; used verbatim in prompts. */
    integration?: string;
    /** Visual facts the model must keep true when this asset is in frame. */
    appearance?: string;
    /** Lower-case phrases in a live direction that call this asset's appearance up. */
    cues?: string[];
    /** Id of the asset this one is another view of (e.g. the case back of a watch). */
    variantOf?: string;
  }[];
  campaign: string;
  category: string;
  accent: string;
  ink: string;
  priority: number;
  segments: string[];
  allowedTitles: string[];
  placement: {
    surface: string;
    label: string;
    instruction: string;
    zone: PlacementZone;
  };
};

export const filmTitles: FilmTitle[] = [
  {
    id: "sintel-mountain",
    title: "Sintel",
    moment: "Frozen mountain passage",
    genre: "Fantasy adventure",
    palette: "#9bb6c8",
    media: {
      video: "/scenes/sintel-trailer.mp4",
      poster: "/scenes/sintel-poster.png",
      sourceUrl: "https://durian.blender.org/download/",
      sourceLabel: "Blender Foundation open movie",
      license: "CC BY 3.0",
    },
    continuity: {
      setting: "A lone traveler crossing an immense snow-covered mountain range",
      camera: "A measured cinematic follow shot that preserves the scale of the landscape",
      lighting: "Cold overcast daylight with blue shadows and diffuse mountain haze",
      objective: "The traveler pushes forward through the pass as the weather begins to turn",
    },
  },
  {
    id: "bunny-forest",
    title: "Big Buck Bunny",
    moment: "Forest reckoning",
    genre: "Animated comedy",
    palette: "#88a56a",
    media: {
      video: "/scenes/bunny-trailer.mp4",
      poster: "/scenes/bunny-poster.png",
      sourceUrl: "https://studio.blender.org/films/big-buck-bunny/",
      sourceLabel: "Blender Foundation open movie",
      license: "CC BY 3.0",
    },
    continuity: {
      setting: "A bright forest clearing after a chaotic encounter with three small troublemakers",
      camera: "Playful character-level tracking with clear foreground and background action",
      lighting: "Warm spring daylight filtered through dense green foliage",
      objective: "The forest settles for a beat before the next comic confrontation begins",
    },
  },
  {
    id: "tears-of-steel-bridge",
    title: "Tears of Steel",
    moment: "Canal bridge argument",
    genre: "Live-action sci-fi",
    palette: "#8aa2b4",
    media: {
      video: "/scenes/tears-of-steel-clip.webm",
      poster: "/scenes/tears-of-steel-poster.jpg",
      sourceUrl: "https://mango.blender.org/",
      sourceLabel: "Blender Foundation open movie",
      license: "CC BY 3.0",
    },
    continuity: {
      setting: "Two people facing each other on an Amsterdam canal bridge on an overcast afternoon, with bare trees, still water and brick canal houses behind them",
      camera: "A steady eye-level two-shot that can drift along the iron railing without cutting",
      lighting: "Soft diffused daylight, cool greens in the trees and muted brick tones across the water",
      objective: "The conversation holds on the bridge while the city keeps moving behind them",
    },
  },
];

export const audienceProfiles: AudienceProfile[] = [
  {
    id: "urban-explorer",
    name: "Urban explorer",
    detail: "Nightlife · travel · live events",
    initials: "UE",
    affinities: ["beverage", "travel", "music"],
  },
  {
    id: "family-night",
    name: "Family night",
    detail: "Shared meals · comedy · convenience",
    initials: "FN",
    affinities: ["food", "family", "delivery"],
  },
  {
    id: "culture-runner",
    name: "Culture runner",
    detail: "Streetwear · sport · design",
    initials: "CR",
    affinities: ["apparel", "sport", "music"],
  },
  {
    id: "collector",
    name: "Collector",
    detail: "Watches · travel · craftsmanship",
    initials: "CO",
    affinities: ["luxury", "travel", "design"],
  },
];

// The brand the studio opens on.
export const DEFAULT_CAMPAIGN_ID = "rolex-perpetual-moment";

export const campaigns: Campaign[] = [
  {
    id: "pepsi-thirsty-for-more",
    brand: "Pepsi",
    logo: "/brands/pepsi/logo.png",
    assets: [
      {
        id: "pepsi-logo",
        label: "Pepsi globe",
        src: "/brands/pepsi/logo.png",
        kind: "logo",
        sourceUrl: "https://www.pepsico.com/en/media",
      },
      {
        id: "pepsi-can",
        label: "Pepsi original can",
        src: "/brands/pepsi/pepsi-can.jpg",
        kind: "product",
        sourceUrl:
          "https://www.pepsicopartners.com/pepsico/en/USD/BEVERAGES/Soft-Drinks/Pepsi-(4-6-Packs)/p/1-HYK-24769",
      },
    ],
    campaign: "Thirsty for More",
    category: "beverage",
    accent: "#2456d8",
    ink: "#ffffff",
    priority: 92,
    segments: ["beverage", "travel", "music"],
    allowedTitles: ["sintel-mountain", "bunny-forest", "tears-of-steel-bridge"],
    placement: {
      surface: "refreshment kiosk",
      label: "Environmental kiosk",
      instruction:
        "Integrate one authentic Pepsi refreshment kiosk into the middle distance. The branding belongs to the environment and is never presented to camera as an endorsement.",
      zone: { x: 0.72, y: 0.3, width: 0.18, height: 0.2 },
    },
  },
  {
    id: "mcdonalds-shared-moment",
    brand: "McDonald's",
    logo: "/brands/mcdonalds/logo.svg",
    assets: [
      {
        id: "mcdonalds-logo",
        label: "Golden arches",
        src: "/brands/mcdonalds/logo.svg",
        kind: "logo",
        sourceUrl: "https://www.mcdonalds.co.jp/",
      },
      {
        id: "mcdonalds-big-mac",
        label: "Big Mac",
        src: "/brands/mcdonalds/big-mac.png",
        kind: "product",
        sourceUrl: "https://www.mcdonalds.co.jp/products/1210/",
      },
    ],
    campaign: "A Shared Moment",
    category: "food",
    accent: "#d31d26",
    ink: "#ffcf23",
    priority: 90,
    segments: ["food", "family", "delivery"],
    allowedTitles: ["bunny-forest", "tears-of-steel-bridge", "sintel-mountain"],
    placement: {
      surface: "street-side restaurant sign",
      label: "Storefront integration",
      instruction:
        "Place one naturally lit McDonald's storefront sign in the established background architecture. It remains incidental to the action and receives no dialogue or direct camera emphasis.",
      zone: { x: 0.68, y: 0.22, width: 0.2, height: 0.18 },
    },
  },
  {
    id: "nike-move-through-it",
    brand: "Nike",
    logo: "/brands/nike/logo.jpg",
    assets: [
      {
        id: "nike-logo",
        label: "Nike Swoosh",
        src: "/brands/nike/logo.jpg",
        kind: "logo",
        sourceUrl: "https://about.nike.com/en/newsroom/collections/nike-inc-logos",
      },
      {
        id: "nike-air-max-campaign",
        label: "Air Max 90 Tiempo campaign",
        src: "/brands/nike/air-max-campaign.jpg",
        kind: "campaign",
        sourceUrl: "https://www.nike.com/air-max/",
      },
    ],
    campaign: "Move Through It",
    category: "apparel",
    accent: "#151515",
    ink: "#ffffff",
    priority: 88,
    segments: ["apparel", "sport", "music"],
    allowedTitles: ["bunny-forest", "tears-of-steel-bridge", "sintel-mountain"],
    placement: {
      surface: "street poster",
      label: "Background poster",
      instruction:
        "Add one restrained Nike campaign poster to an existing background wall. Preserve the approved artwork and keep it secondary to the character and action.",
      zone: { x: 0.75, y: 0.2, width: 0.14, height: 0.28 },
    },
  },
  {
    id: "rolex-perpetual-moment",
    brand: "Rolex",
    logo: "/brands/rolex/logo.svg",
    assets: [
      {
        id: "rolex-crown",
        label: "Rolex crown",
        src: "/brands/rolex/logo.svg",
        kind: "logo",
        sourceUrl: "https://www.rolex.com/",
        integration:
          "The Rolex crown emblem appears once, in gold, on an existing architectural surface such as a boutique window or a discreet wall clock.",
        appearance: "A five-point gold crown above the word ROLEX in green serif capitals.",
      },
      {
        id: "rolex-submariner",
        label: "Submariner Date",
        src: "/brands/rolex/submariner.png",
        kind: "product",
        sourceUrl: "https://www.rolex.com/watches/submariner/m126610ln-0001",
        cues: ["submariner", "dial", "bezel"],
        integration:
          "The Submariner is worn on the protagonist's wrist. As the hand moves, the black dial, luminous markers, and unidirectional rotating bezel catch the light. The watch stays exactly as shown in the reference.",
        appearance:
          "Oystersteel case, black dial with round luminous hour markers and Mercedes-style hands, black Cerachrom bezel with a 60-minute scale, three-link Oyster bracelet.",
      },
      {
        id: "rolex-datejust",
        label: "Datejust 41",
        src: "/brands/rolex/datejust.png",
        kind: "product",
        sourceUrl: "https://www.rolex.com/watches/datejust/m126334-0014",
        cues: ["datejust", "dial", "fluted bezel"],
        integration:
          "The Datejust is worn on the protagonist's wrist, cuff pulled back just enough to reveal the fluted bezel and the date window under its Cyclops lens.",
        appearance:
          "Oystersteel and white gold case, fluted white gold bezel, slate grey dial with baton hour markers, date window with Cyclops lens at three o'clock, five-link Jubilee bracelet.",
      },
      {
        id: "rolex-submariner-back",
        label: "Submariner Date, case back",
        src: "/brands/rolex/submariner-back.png",
        kind: "product",
        sourceUrl: "https://www.rolex.com/watches/submariner/m126610ln-0001",
        variantOf: "rolex-submariner",
        cues: ["back", "caseback", "turn it over", "turn the watch over", "flip", "underside", "clasp", "behind"],
        integration:
          "The Submariner is turned over so its case back faces the camera, resting in the protagonist's palm, exactly as shown in the reference.",
        appearance:
          "Seen from behind, one solid stainless steel (Oystersteel) object: a flat, mirror-polished screw-down case back with a finely fluted edge and no engraving, window, or text; brushed steel lugs; the three-link Oyster bracelet attached at the lugs; a folding Oysterlock clasp with a small raised Rolex crown at its centre.",
      },
      {
        id: "rolex-datejust-back",
        label: "Datejust 41, case back",
        src: "/brands/rolex/datejust-back.png",
        kind: "product",
        sourceUrl: "https://www.rolex.com/watches/datejust/m126334-0014",
        variantOf: "rolex-datejust",
        cues: ["back", "caseback", "turn it over", "turn the watch over", "flip", "underside", "clasp", "behind"],
        integration:
          "The Datejust is turned over so its case back faces the camera, resting in the protagonist's palm, exactly as shown in the reference.",
        appearance:
          "Seen from behind, one solid stainless steel (Oystersteel) object: a flat, mirror-polished screw-down case back with a finely fluted edge and no engraving, window, or text, the fluted white-gold bezel edge just visible around it; brushed steel lugs; the five-link Jubilee bracelet attached at the lugs; a folding clasp with a small raised Rolex crown at its centre.",
      },
      {
        id: "rolex-submariner-open",
        label: "Submariner Date, bracelet open",
        src: "/brands/rolex/submariner-clasp-open.jpg",
        kind: "product",
        sourceUrl: "https://www.rolex.com/watchmaking/features/bracelets/glidelock",
        variantOf: "rolex-submariner",
        cues: ["open the strap", "strap open", "open the bracelet", "bracelet open", "unclasp", "open the clasp", "clasp open", "undo the clasp", "take it off", "unbuckle"],
        integration:
          "The Submariner lies turned over with its Oyster bracelet unfolded flat, the Glidelock clasp open exactly as in the reference, so the plain polished case back is fully exposed.",
        appearance:
          "Stainless steel Oyster bracelet opened out flat: the folding Oysterlock safety clasp unfolded, its polished cover and the Glidelock extension blade visible, brushed three-piece links either side; at the centre the flat, mirror-polished stainless steel screw-down case back with a fluted edge and no engraving, window, or text. Every part stays a solid metal piece.",
      },
      {
        id: "rolex-datejust-open",
        label: "Datejust 41, Oysterclasp open",
        src: "/brands/rolex/datejust-clasp-open.jpg",
        kind: "product",
        sourceUrl: "https://www.rolex.com/watchmaking/features/bracelets/oysterclasp",
        variantOf: "rolex-datejust",
        cues: ["open the strap", "strap open", "open the bracelet", "bracelet open", "unclasp", "open the clasp", "clasp open", "undo the clasp", "take it off", "unbuckle"],
        integration:
          "The Datejust lies turned over with its Jubilee bracelet unfolded flat and the Oysterclasp open as in the reference, so the plain polished case back is fully exposed. On this watch the whole bracelet is Oystersteel.",
        appearance:
          "Five-link Jubilee bracelet opened out flat with the folding Oysterclasp unfolded, polished clasp cover with a small raised Rolex crown; all stainless steel on this reference, never two-tone; at the centre the flat, mirror-polished stainless steel screw-down case back with a fluted edge and no engraving, window, or text, the fluted bezel edge just visible. Every part stays a solid metal piece.",
      },
      {
        id: "rolex-submariner-campaign",
        label: "Submariner campaign visual",
        src: "/brands/rolex/submariner-campaign.jpg",
        kind: "campaign",
        sourceUrl: "https://www.rolex.com/watches/submariner",
        integration:
          "The Submariner campaign visual hangs as a backlit poster inside the Rolex boutique window: a blue-dial, two-tone Submariner floating against sky and cloud. It stays secondary to the action.",
      },
    ],
    campaign: "A Perpetual Moment",
    category: "luxury",
    accent: "#127749",
    ink: "#c9a53e",
    priority: 95,
    segments: ["luxury", "travel", "design"],
    allowedTitles: ["sintel-mountain", "bunny-forest", "tears-of-steel-bridge"],
    placement: {
      surface: "boutique window",
      label: "Boutique window",
      instruction:
        "Integrate one Rolex boutique window into the established street architecture, its green facade and gold crown emblem lit from within. It belongs to the environment and is never presented to camera as an endorsement.",
      zone: { x: 0.7, y: 0.24, width: 0.19, height: 0.24 },
    },
  },
];

export function selectEligibleCampaign(profileId: string, titleId: string) {
  const profile = audienceProfiles.find((item) => item.id === profileId);
  if (!profile) return null;
  const affinityScore = (campaign: Campaign) =>
    campaign.segments.filter((segment) => profile.affinities.includes(segment)).length;

  return (
    campaigns
      .filter(
        (campaign) =>
          campaign.allowedTitles.includes(titleId) &&
          campaign.segments.some((segment) => profile.affinities.includes(segment)),
      )
      .sort(
        (left, right) =>
          affinityScore(right) - affinityScore(left) ||
          right.priority - left.priority ||
          left.id.localeCompare(right.id),
      )[0] ?? null
  );
}
