import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectMeta } from "@/lib/schema/plan";
import { generatePlan } from "@/lib/llm/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  prompt: z.string().min(3).max(2000),
  meta: ProjectMeta,
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request: " + (e as Error).message },
      { status: 400 },
    );
  }

  try {
    const result = await generatePlan({ prompt: body.prompt, meta: body.meta });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: "Generation failed: " + (e as Error).message },
      { status: 500 },
    );
  }
}
