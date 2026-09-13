/**
 * Provider abstraction for the lab's three model-backed routes.
 *
 * The lab needs exactly two capabilities — make an image, and answer a question
 * about an image as JSON — and both OpenAI and Gemini can do them. Routes call
 * `visionProvider()` and never name a vendor, so adding a key to `.env` is the
 * only thing needed to switch.
 *
 * Selection: `LAB_PROVIDER` if set, else OpenAI if `OPENAI_API_KEY` is present,
 * else Gemini. Within a provider, model ids are tried newest-first because ids
 * move faster than this app does.
 */

import { GoogleGenAI } from "@google/genai";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type ImageInput = { mimeType: string; base64: string };

export type ImageResult = { bytes: Buffer; mimeType: string; model: string };

export type JsonRequest = {
  system: string;
  text: string;
  image?: ImageInput;
  /** JSON Schema describing the expected object. */
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * OpenAI reasoning models bill thinking against `max_completion_tokens`, so a
   * perception call with a small cap can burn the whole budget before emitting
   * any JSON. "low" turns reasoning off for calls that are pure looking.
   */
  reasoningEffort?: "low" | "medium" | "high";
};

export type VisionProvider = {
  name: "openai" | "gemini";
  generateImage(prompt: string, source?: ImageInput): Promise<ImageResult>;
  completeJson<T>(request: JsonRequest): Promise<T>;
};

const OPENAI_IMAGE_MODELS = [
  process.env.LAB_IMAGE_MODEL,
  "gpt-image-1.5",
  "gpt-image-1-mini",
  "gpt-image-1",
].filter(Boolean) as string[];

const OPENAI_TEXT_MODELS = [
  process.env.LAB_TEXT_MODEL,
  "gpt-5-mini",
  "gpt-5",
  "gpt-4.1-mini",
].filter(Boolean) as string[];

const GEMINI_IMAGE_MODELS = [
  process.env.LAB_IMAGE_MODEL,
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
].filter(Boolean) as string[];

const GEMINI_TEXT_MODELS = [
  process.env.LAB_TEXT_MODEL,
  "gemini-3.5-flash",
  "gemini-3-flash",
  "gemini-2.5-flash",
].filter(Boolean) as string[];

/** Closest landscape size the OpenAI image models offer to Orbis's 16:9. */
const OPENAI_IMAGE_SIZE = "1536x1024";

function looksLikeMissingModel(error: unknown): boolean {
  const text = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    text.includes("not found") ||
    text.includes("not_found") ||
    text.includes("404") ||
    text.includes("does not exist") ||
    text.includes("is not supported") ||
    text.includes("unsupported") ||
    text.includes("model_not_found") ||
    text.includes("do not have access")
  );
}

async function withModelFallback<T>(
  models: string[],
  run: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown = new Error("No model configured");
  for (const model of models) {
    try {
      return await run(model);
    } catch (caught) {
      lastError = caught;
      if (!looksLikeMissingModel(caught)) throw caught;
    }
  }
  throw lastError;
}

/* -------------------------------------------------------------------------- */
/* OpenAI                                                                      */
/* -------------------------------------------------------------------------- */

async function openaiFetch(path: string, apiKey: string, init: RequestInit) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, ...(init.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text.slice(0, 400);
    try {
      message = (JSON.parse(text) as { error?: { message?: string } }).error?.message || message;
    } catch {
      // Non-JSON error body; the raw text is the best we have.
    }
    throw new Error(message);
  }
  return JSON.parse(text) as Record<string, never>;
}

/**
 * Strict structured outputs require `additionalProperties: false` and every
 * property listed in `required`, at every level. The catalog schemas are
 * written once and adapted here rather than duplicated per provider.
 */
function toStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema.type === "object" && schema.properties) {
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    return {
      ...schema,
      additionalProperties: false,
      required: Object.keys(properties),
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, toStrictSchema(value)]),
      ),
    };
  }
  if (schema.type === "array" && schema.items) {
    return { ...schema, items: toStrictSchema(schema.items as Record<string, unknown>) };
  }
  return schema;
}

function openaiProvider(apiKey: string): VisionProvider {
  return {
    name: "openai",

    async generateImage(prompt, source) {
      return withModelFallback(OPENAI_IMAGE_MODELS, async (model) => {
        let result: { data?: { b64_json?: string }[] };

        if (source) {
          const form = new FormData();
          form.append("model", model);
          form.append("prompt", prompt);
          form.append("size", OPENAI_IMAGE_SIZE);
          form.append(
            "image",
            new Blob([Buffer.from(source.base64, "base64")], { type: source.mimeType }),
            "source.png",
          );
          result = (await openaiFetch("/images/edits", apiKey, {
            method: "POST",
            body: form,
          })) as never;
        } else {
          result = (await openaiFetch("/images/generations", apiKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, prompt, size: OPENAI_IMAGE_SIZE, n: 1 }),
          })) as never;
        }

        const b64 = result.data?.[0]?.b64_json;
        if (!b64) throw new Error("The image model returned no image");
        return { bytes: Buffer.from(b64, "base64"), mimeType: "image/png", model };
      });
    },

    async completeJson<T>(request: JsonRequest): Promise<T> {
      return withModelFallback(OPENAI_TEXT_MODELS, async (model) => {
        const content: unknown[] = [{ type: "text", text: request.text }];
        if (request.image) {
          content.push({
            type: "image_url",
            image_url: {
              url: `data:${request.image.mimeType};base64,${request.image.base64}`,
            },
          });
        }

        const result = (await openaiFetch("/chat/completions", apiKey, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: request.system },
              { role: "user", content },
            ],
            max_completion_tokens: request.maxTokens ?? 4096,
            ...(request.reasoningEffort
              ? { reasoning_effort: request.reasoningEffort }
              : {}),
            response_format: {
              type: "json_schema",
              json_schema: {
                name: request.schemaName,
                strict: true,
                schema: toStrictSchema(request.schema),
              },
            },
          }),
        })) as unknown as {
          choices?: { message?: { content?: string }; finish_reason?: string }[];
        };

        const choice = result.choices?.[0];
        if (choice?.finish_reason === "length") {
          throw new Error("The model ran out of output tokens");
        }
        const text = choice?.message?.content?.trim();
        if (!text) throw new Error("The model returned no content");
        return JSON.parse(text) as T;
      });
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Gemini                                                                      */
/* -------------------------------------------------------------------------- */

function geminiProvider(apiKey: string): VisionProvider {
  const ai = new GoogleGenAI({ apiKey });

  return {
    name: "gemini",

    async generateImage(prompt, source) {
      return withModelFallback(GEMINI_IMAGE_MODELS, async (model) => {
        const contents: unknown[] = [{ text: prompt }];
        if (source) {
          contents.push({
            inlineData: { mimeType: source.mimeType, data: source.base64 },
          });
        }
        const response = await ai.models.generateContent({
          model,
          contents: contents as never,
        });
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        const output = parts.find((part) => part.inlineData?.data)?.inlineData;
        if (!output?.data) throw new Error("The image model returned no image");
        return {
          bytes: Buffer.from(output.data, "base64"),
          mimeType: output.mimeType || "image/png",
          model,
        };
      });
    },

    async completeJson<T>(request: JsonRequest): Promise<T> {
      return withModelFallback(GEMINI_TEXT_MODELS, async (model) => {
        const contents: unknown[] = [{ text: request.text }];
        if (request.image) {
          contents.push({
            inlineData: {
              mimeType: request.image.mimeType,
              data: request.image.base64,
            },
          });
        }
        const response = await ai.models.generateContent({
          model,
          contents: contents as never,
          config: {
            systemInstruction: request.system,
            temperature: request.temperature ?? 0.3,
            maxOutputTokens: request.maxTokens ?? 4096,
            responseMimeType: "application/json",
            responseSchema: request.schema as never,
          },
        });

        if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
          throw new Error("The model ran out of output tokens");
        }

        let text = "";
        try {
          text = response.text?.trim() || "";
        } catch {
          // The SDK throws on .text when there is no usable candidate.
        }
        const parsed = text ? parseJsonLoosely<T>(text) : null;
        if (!parsed) throw new Error("The model returned no usable JSON");
        return parsed;
      });
    },
  };
}

/* -------------------------------------------------------------------------- */

/** Returns the configured provider, or null when no key is present. */
export function visionProvider(): VisionProvider | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const preferred = process.env.LAB_PROVIDER?.toLowerCase();

  if (preferred === "openai") return openaiKey ? openaiProvider(openaiKey) : null;
  if (preferred === "gemini") return geminiKey ? geminiProvider(geminiKey) : null;
  if (openaiKey) return openaiProvider(openaiKey);
  if (geminiKey) return geminiProvider(geminiKey);
  return null;
}

export const NO_PROVIDER_ERROR =
  "No model provider is configured. Set OPENAI_API_KEY or GEMINI_API_KEY.";

/* -------------------------------------------------------------------------- */
/* Shared request helpers                                                      */
/* -------------------------------------------------------------------------- */

export async function fileToImageInput(file: File): Promise<ImageInput> {
  return {
    mimeType: file.type || "image/png",
    base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
  };
}

export function validateImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || !value.type.startsWith("image/")) {
    return { error: "A valid image file is required", status: 400 as const };
  }
  if (value.size > MAX_IMAGE_BYTES) {
    return { error: "The image must be 10 MB or smaller", status: 413 as const };
  }
  return { image: value };
}

/** Strips the code fences and stray prose models sometimes wrap JSON in. */
export function parseJsonLoosely<T>(text: string): T | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}
