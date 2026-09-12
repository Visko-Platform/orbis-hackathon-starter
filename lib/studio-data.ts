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
    id: "bunny-meadow",
    title: "Big Buck Bunny",
    moment: "Meadow encounter",
    genre: "Animated short",
    palette: "#b6b06f",
    media: {
      video: "/scenes/bunny-meadow.mp4",
      poster: "/scenes/bunny-poster.png",
      sourceUrl: "https://studio.blender.org/films/big-buck-bunny/",
      sourceLabel: "Blender Foundation open movie",
      license: "CC BY 3.0",
    },
    continuity: {
      setting: "A sunlit meadow at the edge of a lively woodland",
      camera: "A gentle wide shot that can drift toward the character without cutting",
      lighting: "Soft natural daylight with saturated greens and warm highlights",
      objective: "Hold the calm pastoral rhythm while introducing a new point of interest in the clearing",
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
];

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
    allowedTitles: ["sintel-mountain", "bunny-forest", "bunny-meadow"],
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
    allowedTitles: ["bunny-forest", "bunny-meadow", "sintel-mountain"],
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
    allowedTitles: ["bunny-forest", "bunny-meadow", "sintel-mountain"],
    placement: {
      surface: "street poster",
      label: "Background poster",
      instruction:
        "Add one restrained Nike campaign poster to an existing background wall. Preserve the approved artwork and keep it secondary to the character and action.",
      zone: { x: 0.75, y: 0.2, width: 0.14, height: 0.28 },
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
