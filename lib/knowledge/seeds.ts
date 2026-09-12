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
        "A Rolex Oyster Perpetual wristwatch: one solid stainless steel (Oystersteel) object with brushed lugs and a polished bezel. On the dial, the word ROLEX in small printed capitals sits beneath a gold five-point crown at twelve; both are fixed printed marks that keep their exact shape, spelling and position. A metal bracelet is attached at the lugs and closes in a folding clasp with a small raised crown. The back is a flat, mirror-polished stainless steel screw-down case back with a finely fluted edge and no window, engraving or text. The exact model (dial colour, bezel type, bracelet style) is the one in the reference view for this take, and it never changes within a scene unless someone visibly takes the watch off and picks up a different one.",
    },
    visualNotes: [
      "A Rolex boutique storefront has a dark green facade, a gold five-point crown emblem and the word ROLEX in gold capitals above the window.",
      "Inside a Rolex boutique the walls are cream and beige with dark green accents, the display cases are illuminated glass, and the back wall shows the word ROLEX in green serif capitals under a gold crown.",
      "Every display case in the boutique holds only Rolex watches on green leather cushions.",
      "A sales associate in a dark suit presents a watch on a green leather tray, handling it calmly with clean hands.",
      "The watch is worn on the left wrist with the winding crown facing outward and the bracelet closed and sitting flat.",
      "Seen from behind, the watch is one solid stainless steel piece: a flat, mirror-polished screw-down case back with a finely fluted edge, no window, engraving or text, brushed lugs, and the bracelet attached at the lugs with a folding clasp that carries a small raised crown.",
      "When the watch is turned over it rotates as a single rigid object; the case, bracelet and clasp keep their shapes and proportions and the bracelet drapes by gravity.",
      "Opening the clasp lets the bracelet unfold flat around the case so the stainless steel case back is fully exposed.",
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
    forbiddenClaims: ["discount", "sale price", "cheap", "fake", "replica", "counterfeit", "knockoff", "gold-plated", "investment", "guaranteed", "display case back", "exhibition case back", "engraved case back", "glass case back", "sapphire case back", "transparent case back", "skeleton dial", "see-through back"],
    protectedChanges: [
      "the Rolex crown and the word ROLEX appear exactly as on the real watch and boutique, never redrawn or misspelled",
      "the crown and the word ROLEX are fixed printed graphics that keep their exact shape, spelling and position and never animate, morph or multiply",
      "a watch keeps its own model, dial, bezel and bracelet for the whole scene unless someone visibly takes it off and picks up a different one",
      "every Rolex boutique interior shows the word ROLEX with the gold crown on the back wall and only Rolex watches in its cases",
      "the watch dial keeps its real markings and the case back stays a flat, mirror-polished stainless steel disc with a fluted edge and no window, engraving or text",
      "the watch is one solid stainless steel object that keeps its exact shape and proportions when worn, handled, or turned over",
      "no other watch brand or logo appears anywhere in the scene",
    ],
  },
  "bmw-the-drive-home": {
    product: {
      name: "BMW 3 Series",
      aliases: ["the car", "the sedan", "the BMW"],
      competitors: ["Mercedes-Benz", "Mercedes", "Audi", "Lexus", "Tesla", "Jaguar"],
      appearance:
        "A dark navy BMW 3 Series sedan with twin chrome-outlined kidney grilles, slim swept-back headlights, black alloy wheels and the blue-and-white BMW roundel on the bonnet.",
    },
    visualNotes: [
      "The kidney grille is two tall rounded rectangles side by side, outlined in chrome.",
      "The roundel sits flat on the bonnet above the grille and at the centre of each wheel.",
      "Paint is a deep metallic navy that reads almost black in overcast light and picks up reflections of the street.",
      "Parked at a kerb the car sits low, with the front wheels turned slightly toward the pavement.",
    ],
    facts: [
      "The 3 Series has been BMW's compact executive saloon since 1975.",
      "The blue and white roundel comes from the colours of the Bavarian flag.",
      "BMW is headquartered in Munich, Germany.",
    ],
    forbiddenClaims: ["safest", "fastest", "cheapest", "better than"],
    protectedChanges: [
      "the BMW roundel keeps its blue and white quarters inside a black ring with BMW in white capitals, never redrawn or misspelled",
      "the car keeps its twin kidney grille, its dark navy paint and its four doors for the whole scene",
      "no other car brand or badge appears on the car",
    ],
  },
  "ray-ban-long-light": {
    product: {
      name: "Ray-Ban Clubmaster",
      aliases: ["the sunglasses", "the glasses", "the shades", "the frames"],
      competitors: ["Oakley", "Persol", "Warby Parker", "Gentle Monster", "Maui Jim"],
      appearance:
        "Browline sunglasses with thick glossy black upper rims and temple tips, a thin gold lower rim and bridge, and dark green G-15 lenses, with the white Ray-Ban signature on the left lens.",
    },
    visualNotes: [
      "The heavy black brow sits across the top of the frame while the lower half of each lens is rimmed only in thin gold.",
      "The lenses are a deep green that reads near-black straight on and green at an angle.",
      "Worn, the frame sits level and the gold bridge catches a highlight between the eyes.",
      "Folded, the temple arms cross and the Ray-Ban name on the arm faces up.",
    ],
    facts: [
      "Ray-Ban was founded in 1936, originally making glasses for United States Army Air Corps pilots.",
      "The Clubmaster's browline shape dates from the 1950s and was reissued by Ray-Ban in the 1980s.",
      "G-15 is Ray-Ban's original green lens tint, developed for the first Aviator.",
    ],
    forbiddenClaims: ["medical", "prescription", "protects your eyes", "better than"],
    protectedChanges: [
      "the Ray-Ban signature stays a small white script on the left lens and is never redrawn or misspelled",
      "the frame keeps its black browline, gold lower rim and green lenses for the whole scene",
      "no other eyewear brand or logo appears in the scene",
    ],
  },
};

export function seedKnowledge(campaignId: string): CampaignKnowledge | null {
  const seed = seeds[campaignId];
  return seed ? { campaignId, ...seed } : null;
}

export const seededCampaignIds = Object.keys(seeds);
