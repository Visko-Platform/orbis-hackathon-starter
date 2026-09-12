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
  timecode: string;
  genre: string;
  palette: string;
  continuity: {
    setting: string;
    camera: string;
    lighting: string;
    objective: string;
    protected: string[];
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

export type StoryBeat = {
  id: string;
  label: string;
  detail: string;
  instruction: string;
};

export const filmTitles: FilmTitle[] = [
  {
    id: "odyssey-harbor",
    title: "The Odyssey",
    moment: "Harbor departure",
    timecode: "00:42:18",
    genre: "Epic adventure",
    palette: "#d8a15b",
    continuity: {
      setting: "A monumental ancient harbor opening onto a restless sea",
      camera: "A low, steady tracking shot that continues forward without a cut",
      lighting: "Late-afternoon amber sun with salt haze in the air",
      objective: "The traveler moves through the harbor toward the departing ship",
      protected: ["the traveler's face", "weathered wardrobe", "harbor geography"],
    },
  },
  {
    id: "spider-midtown",
    title: "Spider-Man",
    moment: "Midtown pursuit",
    timecode: "01:08:44",
    genre: "Superhero action",
    palette: "#cf5148",
    continuity: {
      setting: "A crowded Midtown avenue immediately after a fast street pursuit",
      camera: "Dynamic street-level tracking with the same forward momentum",
      lighting: "Clear afternoon light reflected from glass and wet pavement",
      objective: "The hero crosses the avenue while the city continues around him",
      protected: ["hero silhouette", "suit continuity", "direction of travel"],
    },
  },
  {
    id: "midnight-metro",
    title: "Midnight Protocol",
    moment: "Metro exchange",
    timecode: "00:27:06",
    genre: "Espionage thriller",
    palette: "#7d8fb4",
    continuity: {
      setting: "A rain-darkened European metro entrance at night",
      camera: "Controlled handheld follow shot over the protagonist's shoulder",
      lighting: "Cool station light with warm reflections from nearby storefronts",
      objective: "The protagonist reaches the street and searches for a waiting contact",
      protected: ["protagonist wardrobe", "rain level", "screen direction"],
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
    campaign: "Thirsty for More",
    category: "beverage",
    accent: "#2456d8",
    ink: "#ffffff",
    priority: 92,
    segments: ["beverage", "travel", "music"],
    allowedTitles: ["odyssey-harbor", "spider-midtown", "midnight-metro"],
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
    campaign: "A Shared Moment",
    category: "food",
    accent: "#d31d26",
    ink: "#ffcf23",
    priority: 90,
    segments: ["food", "family", "delivery"],
    allowedTitles: ["spider-midtown", "midnight-metro", "odyssey-harbor"],
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
    campaign: "Move Through It",
    category: "apparel",
    accent: "#151515",
    ink: "#ffffff",
    priority: 88,
    segments: ["apparel", "sport", "music"],
    allowedTitles: ["spider-midtown", "midnight-metro", "odyssey-harbor"],
    placement: {
      surface: "street poster",
      label: "Background poster",
      instruction:
        "Add one restrained Nike campaign poster to an existing background wall. Preserve the approved artwork and keep it secondary to the character and action.",
      zone: { x: 0.75, y: 0.2, width: 0.14, height: 0.28 },
    },
  },
];

export const storyBeats: StoryBeat[] = [
  {
    id: "crowd-parts",
    label: "The crowd parts",
    detail: "Reveal a clear route ahead",
    instruction:
      "The same scene continues as the crowd naturally parts, revealing a clear route ahead. Maintain the same subject, camera, lighting, sponsor, and placement.",
  },
  {
    id: "weather-turns",
    label: "The weather turns",
    detail: "Add atmosphere, preserve action",
    instruction:
      "The same unbroken shot continues as a light rain begins and reflections deepen. Maintain the same subject, movement, sponsor, and placement.",
  },
  {
    id: "camera-follows",
    label: "Follow the movement",
    detail: "Track into the next location",
    instruction:
      "The camera follows the same subject forward into the next part of the location without a cut. Preserve identity, wardrobe, sponsor, and placement continuity.",
  },
];

export function selectEligibleCampaign(profileId: string, titleId: string) {
  const profile = audienceProfiles.find((item) => item.id === profileId);
  if (!profile) return null;

  return (
    campaigns
      .filter(
        (campaign) =>
          campaign.allowedTitles.includes(titleId) &&
          campaign.segments.some((segment) => profile.affinities.includes(segment)),
      )
      .sort(
        (left, right) =>
          right.priority - left.priority || left.id.localeCompare(right.id),
      )[0] ?? null
  );
}
