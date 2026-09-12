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
  "rolex-perpetual-moment": {
    product: {
      name: "Rolex",
      aliases: ["the watch", "the Rolex", "the Submariner", "the Datejust", "the boutique", "the store", "the shop"],
      competitors: ["Omega", "Patek Philippe", "Audemars Piguet", "Cartier", "TAG Heuer", "Tudor", "Breitling", "IWC", "Seiko", "Apple Watch"],
      appearance:
        "A Rolex Oyster Perpetual wristwatch in Oystersteel, worn flat on the wrist with the bracelet closed: the Submariner Date has a black dial with luminous round markers, a black Cerachrom rotating bezel and a three-link Oyster bracelet; the Datejust 41 has a slate dial, a fluted white-gold bezel, a Cyclops date window at three o'clock and a five-link Jubilee bracelet. Every dial reads ROLEX under a small five-point crown at twelve o'clock.",
    },
    visualNotes: [
      "A Rolex boutique storefront has a dark green facade, a gold five-point crown emblem and the word ROLEX in gold capitals above the window.",
      "Inside a Rolex boutique the walls are cream and beige with dark green accents, the display cases are illuminated glass, and the back wall shows the word ROLEX in green serif capitals under a gold crown.",
      "Every display case in the boutique holds only Rolex watches on green leather cushions.",
      "A sales associate in a dark suit presents a watch on a green leather tray, handling it calmly with clean hands.",
      "The watch is worn on the left wrist with the winding crown facing outward and the bracelet closed and sitting flat.",
      "Turning the watch over shows a plain, polished, unmarked screw-down case back and a folding clasp with a small raised crown.",
      "Opening the clasp lets the bracelet unfold flat around the case so the case back is fully exposed.",
      "The dial always reads ROLEX with the crown at twelve o'clock; hands and hour markers glow softly in low light.",
      "Soft, directional light lets the polished bezel and case catch one clean highlight without glare.",
      "Walking through the city, the cuff rides up as the arm swings and the watch catches the light for a moment.",
    ],
    facts: [
      "Rolex was founded in 1905 by Hans Wilsdorf and has been based in Geneva since 1919.",
      "The Rolex Oyster case, introduced in 1926, was the first waterproof wristwatch case.",
      "The Submariner was introduced in 1953 and the Submariner Date is waterproof to 300 metres.",
      "The Datejust, launched in 1945, was the first self-winding wristwatch to show the date in a window on the dial.",
      "The Cyclops lens over the date window magnifies the date about two and a half times.",
      "Rolex watches are assembled in Switzerland and every movement is a certified Superlative Chronometer.",
    ],
    forbiddenClaims: ["discount", "sale price", "cheap", "fake", "replica", "counterfeit", "knockoff", "gold-plated", "investment", "guaranteed", "display case back", "exhibition case back", "engraved case back"],
    protectedChanges: [
      "the Rolex crown and the word ROLEX appear exactly as on the real watch and boutique, never redrawn or misspelled",
      "every Rolex boutique interior shows the word ROLEX with the gold crown on the back wall and only Rolex watches in its cases",
      "the watch dial keeps its real markings and the case back stays plain polished steel with no engraving or window",
      "no other watch brand or logo appears anywhere in the scene",
    ],
  },
};

export function seedKnowledge(campaignId: string): CampaignKnowledge | null {
  const seed = seeds[campaignId];
  return seed ? { campaignId, ...seed } : null;
}

export const seededCampaignIds = Object.keys(seeds);
