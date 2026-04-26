import { NextResponse } from "next/server";
import { z } from "zod";
import { PlanIR } from "@/lib/schema/plan";
import { generatePlan } from "@/lib/llm/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  plan: PlanIR,
  instruction: z.string().min(3).max(2000),
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
    const result = await generatePlan({
      prompt: body.instruction,
      meta: body.plan.meta,
      currentPlan: body.plan,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: "Refine failed: " + (e as Error).message },
      { status: 500 },
    );
  }
}
