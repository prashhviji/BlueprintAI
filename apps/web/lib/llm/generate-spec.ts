import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { type PlanSpec } from "@/lib/solver/solver";
import { buildDemoSpec } from "./demo";

const SPEC_SYSTEM_PROMPT = `You are an architectural layout assistant for Indian residential projects. Return ONLY a JSON object (no prose, no markdown) shaped like:
{
  "plot": { "w": <number, mm>, "h": <number, mm> },
  "rooms": [
    { "id": "<short-slug>", "name": "<Display Name>", "area": <sqm>, "zone": "public" | "private" | "service", "entry": <true if main entry, optional> }
  ],
  "budget": <integer rupees, optional>
}
Rules:
- Plot in mm (multiply meters by 1000). If user gives plot in feet, convert (1 ft = 304.8 mm).
- Areas in sqm. Total room area should be roughly 60-75% of plot area.
- "public" = living/dining/kitchen/foyer, "private" = bedrooms/bathrooms/study, "service" = utility/store.
- Exactly ONE room must have entry:true (the entry room, usually the living/foyer).
- Typical sizes: living 18-30 sqm, master bedroom 12-16, bedroom2 9-12, bath 3-5, kitchen 8-12, balcony 4-7.
- Use sensible Indian residential proportions.
- Return JSON ONLY, no prose, no markdown fences.`;

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

export type SpecGenerateResult = {
  spec: PlanSpec;
  source: "gemini" | "claude" | "demo";
  warnings: string[];
};

export async function generateSpec(args: {
  prompt: string;
  fallbackPlot?: { w: number; h: number };
}): Promise<SpecGenerateResult> {
  const warnings: string[] = [];
  const userMsg = args.prompt;

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  if (!hasGemini && !hasClaude) {
    return {
      spec: buildDemoSpec({ prompt: args.prompt }),
      source: "demo",
      warnings: ["LLM keys not configured — used heuristic parser"],
    };
  }

  if (hasGemini) {
    for (let i = 0; i < 2; i++) {
      try {
        const spec = await callGeminiForSpec(userMsg);
        return { spec: { ...spec, prompt: args.prompt }, source: "gemini", warnings };
      } catch (e) {
        warnings.push(`Gemini attempt ${i + 1} failed: ${(e as Error).message}`);
      }
    }
  }

  if (hasClaude) {
    try {
      const spec = await callClaudeForSpec(userMsg);
      return { spec: { ...spec, prompt: args.prompt }, source: "claude", warnings };
    } catch (e) {
      warnings.push(`Claude failed: ${(e as Error).message}`);
    }
  }

  const fallback = buildDemoSpec({ prompt: args.prompt });
  return {
    spec: { ...fallback, plot: args.fallbackPlot ?? fallback.plot },
    source: "demo",
    warnings: [...warnings, "All LLM attempts failed — falling back to heuristic parser"],
  };
}

async function callGeminiForSpec(userMsg: string): Promise<PlanSpec> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    systemInstruction: SPEC_SYSTEM_PROMPT,
  });
  const r = await model.generateContent(userMsg);
  const text = r.response.text();
  return PlanSpecSchema.parse(JSON.parse(text)) as PlanSpec;
}

async function callClaudeForSpec(userMsg: string): Promise<PlanSpec> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const ai = new Anthropic({ apiKey });
  const r = await ai.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SPEC_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });
  const text = r.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const fb = cleaned.indexOf("{");
  const lb = cleaned.lastIndexOf("}");
  if (fb >= 0 && lb >= 0) cleaned = cleaned.slice(fb, lb + 1);
  return PlanSpecSchema.parse(JSON.parse(cleaned)) as PlanSpec;
}

/**
 * Per-room edit — given an existing room and an instruction, return the
 * updated single-room spec (id stays, name/area/zone may change).
 */
const ROOM_EDIT_SYSTEM = `You are editing ONE room in a residential floor plan. Return ONLY a JSON object: { "id": "<same id>", "name": "<New Name>", "area": <new sqm>, "zone": "public"|"private"|"service" }. No prose. Sensible Indian residential sizes only.`;

const RoomEditSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.number().min(1).max(80),
  zone: z.enum(["public", "private", "service"]),
});

export async function generateRoomEdit(args: {
  room: { id: string; name: string; area: number; zone: string };
  instruction: string;
}): Promise<{ id: string; name: string; area: number; zone: "public" | "private" | "service"; source: "gemini" | "claude" | "demo" }> {
  const userMsg = `Current room: ${JSON.stringify(args.room)}\nInstruction: "${args.instruction}"`;

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  if (!hasGemini && !hasClaude) {
    return demoRoomEdit(args);
  }

  if (hasGemini) {
    try {
      const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
        systemInstruction: ROOM_EDIT_SYSTEM,
      });
      const r = await model.generateContent(userMsg);
      const parsed = RoomEditSchema.parse(JSON.parse(r.response.text()));
      return { ...parsed, source: "gemini" };
    } catch {
      // fall through to Claude
    }
  }

  if (hasClaude) {
    try {
      const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      const r = await ai.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: ROOM_EDIT_SYSTEM,
        messages: [{ role: "user", content: userMsg }],
      });
      const text = r.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const fb = cleaned.indexOf("{");
      const lb = cleaned.lastIndexOf("}");
      if (fb >= 0 && lb >= 0) cleaned = cleaned.slice(fb, lb + 1);
      const parsed = RoomEditSchema.parse(JSON.parse(cleaned));
      return { ...parsed, source: "claude" };
    } catch {
      // fall through
    }
  }

  return demoRoomEdit(args);
}

function demoRoomEdit(args: {
  room: { id: string; name: string; area: number; zone: string };
  instruction: string;
}): {
  id: string;
  name: string;
  area: number;
  zone: "public" | "private" | "service";
  source: "demo";
} {
  // Simple keyword-based heuristics for demo mode
  const ins = args.instruction.toLowerCase();
  let { name, area } = args.room;
  let zone = (args.room.zone as "public" | "private" | "service") || "private";

  if (/double|larger|bigger|expand/i.test(ins)) area = Math.min(60, area * 2);
  if (/half|smaller|shrink/i.test(ins)) area = Math.max(3, area / 2);
  if (/study/i.test(ins)) { name = "Study"; zone = "private"; area = Math.max(area, 8); }
  if (/walk.?in.*closet|closet/i.test(ins)) { name = "Walk-in Closet"; zone = "private"; }
  if (/puja|pooja|prayer/i.test(ins)) { name = "Puja Room"; zone = "private"; area = 4; }
  if (/kitchen/i.test(ins)) { name = "Kitchen"; zone = "public"; }
  if (/utility/i.test(ins)) { name = "Utility"; zone = "service"; }

  return { id: args.room.id, name, area, zone, source: "demo" };
}
