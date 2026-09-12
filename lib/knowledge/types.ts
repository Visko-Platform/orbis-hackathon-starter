// Per-campaign product knowledge the operator maintains. Everything the
// prompt engineer is allowed to say about the product comes from here.
export type CampaignKnowledge = {
  campaignId: string;
  product: {
    name: string;
    aliases: string[];
    competitors: string[];
    // Approved visual identity, one or two sentences. Goes into every prompt.
    appearance: string;
  };
  // Retrieved into a prompt when the operator's text touches them.
  visualNotes: string[];
  // Answered on the player when the director asks a question; never sent to the model.
  facts: string[];
  // Never allowed in a prompt.
  forbiddenClaims: string[];
  // Positive statements that stay true across directions.
  protectedChanges: string[];
  updatedAt?: string;
};

// Generous: a product rule or an appearance can be as long as it needs to be exact.
const MAX_ITEMS = 40;
export const MAX_ITEM_CHARS = 1_000;
export const MAX_APPEARANCE_CHARS = 2_000;
const MAX_NAME_CHARS = 80;

function stringList(value: unknown, field: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be a list of strings`);
  if (value.length > MAX_ITEMS) throw new Error(`${field} has more than ${MAX_ITEMS} entries`);
  return value.map((item, index) => {
    if (typeof item !== "string") throw new Error(`${field}[${index}] must be a string`);
    const trimmed = item.trim().replace(/\s+/g, " ");
    if (!trimmed) throw new Error(`${field}[${index}] is empty`);
    if (trimmed.length > MAX_ITEM_CHARS) throw new Error(`${field}[${index}] is longer than ${MAX_ITEM_CHARS} characters`);
    return trimmed;
  });
}

function text(value: unknown, field: string, max: number, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (required && !trimmed) throw new Error(`${field} is required`);
  if (trimmed.length > max) throw new Error(`${field} is longer than ${max} characters`);
  return trimmed;
}

// Validates untrusted input (a PUT body or a file on disk). Throws with a
// message that names the field, so the UI can show it.
export function parseKnowledge(raw: unknown, campaignId: string): CampaignKnowledge {
  if (!raw || typeof raw !== "object") throw new Error("Knowledge must be an object");
  const body = raw as Record<string, unknown>;
  const product = body.product && typeof body.product === "object" ? (body.product as Record<string, unknown>) : {};
  const updatedAt = typeof body.updatedAt === "string" ? { updatedAt: body.updatedAt } : {};
  return {
    ...updatedAt,
    campaignId,
    product: {
      name: text(product.name, "product.name", MAX_NAME_CHARS, true),
      aliases: stringList(product.aliases, "product.aliases"),
      competitors: stringList(product.competitors, "product.competitors"),
      appearance: text(product.appearance, "product.appearance", MAX_APPEARANCE_CHARS),
    },
    visualNotes: stringList(body.visualNotes, "visualNotes"),
    facts: stringList(body.facts, "facts"),
    forbiddenClaims: stringList(body.forbiddenClaims, "forbiddenClaims"),
    protectedChanges: stringList(body.protectedChanges, "protectedChanges"),
  };
}
