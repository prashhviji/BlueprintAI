import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { type PlanSpec } from "@/lib/solver/solver";
import { buildDemoSpec } from "./demo";
import { isOverBudget, recordTokenUsage } from "@/lib/security/budget";
import { logEvent } from "@/lib/security/logger";

/** Hard cap on output tokens per LLM call — second line of defence after the
 *  daily-budget kill switch. Pick a value that fits the largest valid spec
 *  comfortably (≈ 800 tokens for a luxury 4BHK example). */
const MAX_OUTPUT_TOKENS = 1500;

// ──────────────────────────────────────────────────────────────────────────
// System prompt — generous detail + few-shot examples so the LLM produces
// faithful output for unusual prompts ("4BHK with home theatre, 50x60 ft").
// ──────────────────────────────────────────────────────────────────────────

const SPEC_SYSTEM_PROMPT = `You are an architectural layout assistant for Indian residential projects.

Your one job: turn a free-text brief into a JSON object describing the rooms the user asked for.

# Output schema (return ONLY this JSON — no prose, no markdown fences)

{
  "plot": { "w": <number, mm>, "h": <number, mm> },
  "rooms": [
    { "id": "<short-slug>", "name": "<Display Name>", "area": <sqm>, "zone": "public" | "private" | "service", "entry": <true if main entry, optional> }
  ],
  "budget": <integer rupees, optional>
}

# Hard rules

- Plot in mm. Convert: meters × 1000, feet × 304.8, square-feet × 0.0929 → sqm, infer aspect ratio (use ≈ 2:3 unless given).
- Areas in sqm. Total room area should be 60–75% of plot area.
- "public" = living, dining, kitchen, foyer, family
- "private" = bedrooms, bathrooms, toilets, study, walk-in closet
- "service" = utility, store, servant, garage
- Exactly ONE room must have entry: true (the entry room — usually the living/foyer).
- Each room "id" must be a short unique slug like "living", "mbr", "br2", "bath", "kitchen", "puja".
- Sensible Indian residential sizes: living 18–30, master bedroom 12–16, bedroom 9–12, bath 3–5, kitchen 8–12, balcony 4–7, store 4–6, puja 3–5.

# Faithfulness

Build EXACTLY what the user asked for. Don't add rooms they didn't ask for. Don't drop rooms they did ask for.
Honor counts: "3BHK" = 3 bedrooms; "with study and store" = include both; "no balcony" = omit balcony.
Honor styles: "luxury", "spacious", "compact" → scale areas accordingly (×1.2, ×1.0, ×0.85).

# Few-shot examples

Brief: "2BHK in Anand, 8x11m plot, north-facing entry, ₹24L budget"
{"plot":{"w":11460,"h":8460},"rooms":[
 {"id":"living","name":"Living / Dining","area":24.75,"zone":"public","entry":true},
 {"id":"kitchen","name":"Kitchen","area":9,"zone":"public"},
 {"id":"utility","name":"Utility","area":6.8,"zone":"service"},
 {"id":"mbr","name":"Master Bedroom","area":13.7,"zone":"private"},
 {"id":"bath","name":"Bath","area":4.2,"zone":"private"},
 {"id":"br2","name":"Bedroom 2","area":9.8,"zone":"private"},
 {"id":"balcony","name":"Balcony","area":5.7,"zone":"private"}
],"budget":2400000}

Brief: "compact 1BHK studio, 6x8m, balcony"
{"plot":{"w":6000,"h":8000},"rooms":[
 {"id":"studio","name":"Studio","area":18,"zone":"public","entry":true},
 {"id":"kitchenette","name":"Kitchenette","area":5,"zone":"service"},
 {"id":"bath","name":"Bath","area":3.5,"zone":"private"},
 {"id":"balcony","name":"Balcony","area":4.5,"zone":"private"}
]}

Brief: "luxury 4BHK villa 14x16m with study, puja room, store"
{"plot":{"w":14000,"h":16000},"rooms":[
 {"id":"living","name":"Living / Dining","area":36,"zone":"public","entry":true},
 {"id":"kitchen","name":"Kitchen","area":13,"zone":"public"},
 {"id":"utility","name":"Utility","area":7,"zone":"service"},
 {"id":"store","name":"Store","area":5,"zone":"service"},
 {"id":"mbr","name":"Master Bedroom","area":18,"zone":"private"},
 {"id":"mbath","name":"Master Bath","area":6,"zone":"private"},
 {"id":"br2","name":"Bedroom 2","area":13,"zone":"private"},
 {"id":"br3","name":"Bedroom 3","area":12,"zone":"private"},
 {"id":"br4","name":"Bedroom 4","area":12,"zone":"private"},
 {"id":"bath","name":"Common Bath","area":4.5,"zone":"private"},
 {"id":"powder","name":"Powder Room","area":2.5,"zone":"private"},
 {"id":"study","name":"Study","area":10,"zone":"private"},
 {"id":"puja","name":"Puja Room","area":4,"zone":"private"},
 {"id":"balcony","name":"Balcony","area":7,"zone":"private"}
]}

Now generate JSON for the user's brief. Return ONLY the JSON object.`;

// ──────────────────────────────────────────────────────────────────────────
// Schemas
// ──────────────────────────────────────────────────────────────────────────

const RoomSpecSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  area: z.number().min(1).max(80),
  zone: z.enum(["public", "private", "service"]),
  entry: z.boolean().optional(),
});

const PlanSpecSchema = z.object({
  plot: z.object({
    w: z.number().min(2000).max(60000),
    h: z.number().min(2000).max(60000),
  }),
  rooms: z.array(RoomSpecSchema).min(1).max(20),
  budget: z.number().min(0).optional(),
});

// ──────────────────────────────────────────────────────────────────────────
// Provider availability + public types
// ──────────────────────────────────────────────────────────────────────────

export type ProviderId = "gemini" | "claude" | "openai" | "demo";

export function aiProviders(): { id: ProviderId; available: boolean; label: string }[] {
  return [
    { id: "gemini", available: !!process.env.GEMINI_API_KEY,    label: "Gemini 2.0 Flash" },
    { id: "claude", available: !!process.env.ANTHROPIC_API_KEY, label: "Claude Sonnet 4.6" },
    { id: "openai", available: !!process.env.OPENAI_API_KEY,    label: "GPT-4o-mini" },
    { id: "demo",   available: true,                            label: "Heuristic parser" },
  ];
}

export type SpecGenerateResult = {
  spec: PlanSpec;
  source: ProviderId;
  warnings: string[];
};

// ──────────────────────────────────────────────────────────────────────────
// Main entrypoint
// ──────────────────────────────────────────────────────────────────────────

export async function generateSpec(args: {
  prompt: string;
  fallbackPlot?: { w: number; h: number };
}): Promise<SpecGenerateResult> {
  const warnings: string[] = [];
  const userMsg = args.prompt;

  const order: { id: Exclude<ProviderId, "demo">; fn: (m: string) => Promise<unknown>; }[] = [];
  if (process.env.GEMINI_API_KEY)    order.push({ id: "gemini", fn: callGemini });
  if (process.env.ANTHROPIC_API_KEY) order.push({ id: "claude", fn: callClaude });
  if (process.env.OPENAI_API_KEY)    order.push({ id: "openai", fn: callOpenAI });

  for (const provider of order) {
    // Daily-spend kill switch — refuse calls if today's budget is exhausted.
    if (isOverBudget(provider.id, MAX_OUTPUT_TOKENS)) {
      warnings.push(`${provider.id}: daily token budget exhausted — skipping`);
      logEvent({
        level: "warn", route: "llm.budget", provider: provider.id,
        event: "daily_budget_exhausted",
      });
      continue;
    }
    // 2 attempts per provider — first vanilla, second with explicit error feedback.
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const msg =
          attempt === 0
            ? userMsg
            : `${userMsg}\n\nThe previous response was invalid (${lastError}). Return ONLY a valid JSON object matching the schema.`;
        const raw = await provider.fn(msg);
        const parsed = parseAndValidateSpec(raw);
        // Charge a defensive estimate when the SDK doesn't return real usage.
        recordTokenUsage(provider.id, MAX_OUTPUT_TOKENS);
        return { spec: { ...parsed, prompt: args.prompt }, source: provider.id, warnings };
      } catch (e) {
        lastError = (e as Error).message.slice(0, 200);
        warnings.push(`${provider.id} attempt ${attempt + 1} failed`);
        logEvent({
          level: "warn", route: "llm.attempt", provider: provider.id,
          event: "attempt_failed", error: lastError,
        });
      }
    }
  }

  // Final fallback — heuristic parser. Always works.
  const fallback = buildDemoSpec({ prompt: args.prompt });
  return {
    spec: { ...fallback, plot: args.fallbackPlot ?? fallback.plot },
    source: "demo",
    warnings: warnings.length
      ? warnings
      : ["LLM keys not configured — used heuristic parser. Set GEMINI_API_KEY or ANTHROPIC_API_KEY in apps/web/.env.local for full AI."],
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Provider implementations
// ──────────────────────────────────────────────────────────────────────────

async function callGemini(userMsg: string): Promise<unknown> {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = ai.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    systemInstruction: SPEC_SYSTEM_PROMPT,
  });
  const r = await model.generateContent(userMsg);
  return JSON.parse(r.response.text());
}

async function callClaude(userMsg: string): Promise<unknown> {
  const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const r = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SPEC_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });
  const text = r.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(extractJsonObject(text));
}

async function callOpenAI(userMsg: string): Promise<unknown> {
  const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const r = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: SPEC_SYSTEM_PROMPT },
      { role: "user",   content: userMsg },
    ],
  });
  const text = r.choices[0]?.message.content ?? "{}";
  return JSON.parse(extractJsonObject(text));
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function extractJsonObject(text: string): string {
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const fb = cleaned.indexOf("{");
  const lb = cleaned.lastIndexOf("}");
  if (fb >= 0 && lb >= 0) cleaned = cleaned.slice(fb, lb + 1);
  return cleaned;
}

function parseAndValidateSpec(raw: unknown): z.infer<typeof PlanSpecSchema> {
  const parsed = PlanSpecSchema.parse(raw);
  if (!parsed.rooms.some((r) => r.entry)) {
    parsed.rooms[0]!.entry = true; // self-heal one common LLM omission
  }
  return parsed;
}

// ──────────────────────────────────────────────────────────────────────────
// Per-room AI edit
// ──────────────────────────────────────────────────────────────────────────

const ROOM_EDIT_SYSTEM = `You are editing ONE room in a residential floor plan.

Input: a JSON object describing the current room and the user's instruction.
Output: ONLY a JSON object: { "id": "<same id>", "name": "<New Name>", "area": <new sqm>, "zone": "public"|"private"|"service" }. No prose. Sensible Indian residential sizes only.

Examples:
- "make this a study with desk" → { "id": "...", "name": "Study", "area": 9, "zone": "private" }
- "double the size" → keep name + zone, double the area (cap at 30 sqm)
- "convert to puja room" → { "id": "...", "name": "Puja Room", "area": 4, "zone": "private" }
- "make it a guest bedroom" → { "id": "...", "name": "Guest Bedroom", "area": 11, "zone": "private" }
- "shrink it" → keep name + zone, halve the area (floor at 3 sqm)

Return ONLY the JSON.`;

const RoomEditSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.number().min(1).max(80),
  zone: z.enum(["public", "private", "service"]),
});

export async function generateRoomEdit(args: {
  room: { id: string; name: string; area: number; zone: string };
  instruction: string;
}): Promise<{
  id: string;
  name: string;
  area: number;
  zone: "public" | "private" | "service";
  source: ProviderId;
}> {
  const userMsg = `Current room: ${JSON.stringify(args.room)}\nInstruction: "${args.instruction}"`;

  const ROOM_EDIT_TOKENS = 400;

  const tryProvider = async (id: Exclude<ProviderId, "demo">) => {
    if (id === "gemini") {
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: ROOM_EDIT_TOKENS,
        },
        systemInstruction: ROOM_EDIT_SYSTEM,
      });
      const r = await model.generateContent(userMsg);
      return JSON.parse(r.response.text());
    }
    if (id === "claude") {
      const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const r = await ai.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: ROOM_EDIT_TOKENS,
        system: ROOM_EDIT_SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      });
      const text = r.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return JSON.parse(extractJsonObject(text));
    }
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const r = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: ROOM_EDIT_TOKENS,
      messages: [
        { role: "system", content: ROOM_EDIT_SYSTEM },
        { role: "user",   content: userMsg },
      ],
    });
    return JSON.parse(extractJsonObject(r.choices[0]?.message.content ?? "{}"));
  };

  const order: ("gemini" | "claude" | "openai")[] = [];
  if (process.env.GEMINI_API_KEY)    order.push("gemini");
  if (process.env.ANTHROPIC_API_KEY) order.push("claude");
  if (process.env.OPENAI_API_KEY)    order.push("openai");

  for (const id of order) {
    if (isOverBudget(id, ROOM_EDIT_TOKENS)) continue;
    try {
      const raw = await tryProvider(id);
      const parsed = RoomEditSchema.parse(raw);
      recordTokenUsage(id, ROOM_EDIT_TOKENS);
      return { ...parsed, source: id };
    } catch {
      // try next
    }
  }
  return demoRoomEdit(args);
}

function demoRoomEdit(args: {
  room: { id: string; name: string; area: number; zone: string };
  instruction: string;
}): { id: string; name: string; area: number; zone: "public" | "private" | "service"; source: "demo" } {
  const ins = args.instruction.toLowerCase();
  let { name, area } = args.room;
  let zone = (args.room.zone as "public" | "private" | "service") || "private";

  if (/double|larger|bigger|expand/.test(ins)) area = Math.min(60, area * 2);
  if (/half|smaller|shrink/.test(ins)) area = Math.max(3, area / 2);
  if (/study/.test(ins))                   { name = "Study";           zone = "private"; area = Math.max(area, 8); }
  if (/walk.?in.*closet|closet/.test(ins)) { name = "Walk-in Closet";  zone = "private"; }
  if (/puja|pooja|prayer/.test(ins))       { name = "Puja Room";       zone = "private"; area = 4; }
  if (/kitchen/.test(ins))                 { name = "Kitchen";         zone = "public"; }
  if (/utility/.test(ins))                 { name = "Utility";         zone = "service"; }
  if (/guest/.test(ins))                   { name = "Guest Bedroom";   zone = "private"; area = Math.max(area, 11); }
  if (/store/.test(ins))                   { name = "Store";           zone = "service"; area = 5; }

  return { id: args.room.id, name, area, zone, source: "demo" };
}
