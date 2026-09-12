import type { CampaignKnowledge } from "@/lib/knowledge/types";

// Starting knowledge for the demo campaigns. Editable in the studio; the
// facts are demo copy for the operator to check, not brand-approved claims.
const seeds: Record<string, Omit<CampaignKnowledge, "campaignId">> = {
  "pepsi-thirsty-for-more": {
    product: {
      name: "Pepsi",
      aliases: ["the can", "the soda", "the cola"],
      competitors: ["Coca-Cola", "Coke", "Dr Pepper", "RC Cola"],
      appearance:
        "A blue Pepsi can with the red, white and blue Pepsi globe and the white PEPSI wordmark, silver top.",
    },
    visualNotes: [
      "Served ice cold, often poured over ice in a tall glass.",
      "When chilled, beads of condensation form on the blue can.",
      "Sold at refreshment kiosks and street vendors with the Pepsi globe on the signage.",
      "The Pepsi globe faces the camera in product shots.",
    ],
    facts: [
      "Pepsi-Cola was first sold in New Bern, North Carolina, in the 1890s.",
      "A 12 oz can of Pepsi contains 150 calories.",
      "Pepsi Zero Sugar has zero sugar and zero calories.",
    ],
    forbiddenClaims: ["healthy", "hydrating", "better than"],
    protectedChanges: ["the Pepsi can keeps its blue colour and globe logo"],
  },
  "mcdonalds-shared-moment": {
    product: {
      name: "McDonald's",
      aliases: ["the restaurant", "the burger", "the Big Mac", "the arches"],
      competitors: ["Burger King", "Wendy's", "KFC", "Five Guys"],
      appearance:
        "A McDonald's storefront with the yellow golden arches on a red sign; the Big Mac is a sesame-seed bun with two beef patties, lettuce, cheese, pickles and onions in a cardboard Big Mac box.",
    },
    visualNotes: [
      "The golden arches sign glows at night and reads clearly from the street.",
      "A Big Mac is served in a cardboard box, often with fries and a drink.",
      "Storefronts have red and yellow signage with the arches above the entrance.",
      "People carry McDonald's paper bags and cups with the arches printed on them.",
    ],
    facts: [
      "The Big Mac was introduced in 1967.",
      "McDonald's serves customers in more than 100 countries.",
    ],
    forbiddenClaims: ["healthy", "low calorie", "nutritious"],
    protectedChanges: ["the McDonald's sign keeps its yellow arches on red"],
  },
  "nike-move-through-it": {
    product: {
      name: "Nike",
      aliases: ["the sneakers", "the shoes", "the swoosh", "the poster"],
      competitors: ["Adidas", "Puma", "New Balance", "Reebok"],
      appearance:
        "Nike Air Max 90 sneakers with the visible Air unit in the heel and the black Swoosh on the side; the campaign poster shows the shoe on a plain background with the Swoosh.",
    },
    visualNotes: [
      "Worn while running, walking or moving through the city.",
      "The Swoosh is visible on the side of each shoe.",
      "The Air Max campaign artwork appears as a street poster on an existing wall.",
      "Runners in Nike gear move with a steady stride.",
    ],
    facts: [
      "The Air Max 90 was introduced in 1990.",
      "The Air unit in the heel is visible through a window in the midsole.",
    ],
    forbiddenClaims: ["medical", "cures", "prevents injury"],
    protectedChanges: ["the Nike poster keeps its approved artwork and Swoosh"],
  },
};

export function seedKnowledge(campaignId: string): CampaignKnowledge | null {
  const seed = seeds[campaignId];
  return seed ? { campaignId, ...seed } : null;
}

export const seededCampaignIds = Object.keys(seeds);
