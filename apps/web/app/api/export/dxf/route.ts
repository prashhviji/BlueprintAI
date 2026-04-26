import { NextResponse } from "next/server";
import { z } from "zod";
import Drawing from "dxf-writer";
import { PlanIR } from "@/lib/schema/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ plan: PlanIR });

type DrawingApi = {
  setActiveLayer: (name: string) => void;
  drawLine: (x1: number, y1: number, x2: number, y2: number) => DrawingApi;
  drawText: (x: number, y: number, h: number, rot: number, value: string) => DrawingApi;
  addLayer: (name: string, color: number, lineType: string) => DrawingApi;
  toDxfString: () => string;
};

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

  // dxf-writer's types are loose; cast to a structural alias above.
  const d = new (Drawing as unknown as { new (): DrawingApi })();
  d.addLayer("WALLS", Drawing.ACI.WHITE, "CONTINUOUS");
  d.addLayer("OPENINGS", Drawing.ACI.CYAN, "CONTINUOUS");
  d.addLayer("ROOMS", Drawing.ACI.GREEN, "CONTINUOUS");
  d.addLayer("DIMENSIONS", Drawing.ACI.YELLOW, "CONTINUOUS");

  const f = body.plan.floors[0]!;

  // Walls
  d.setActiveLayer("WALLS");
  for (const w of f.walls) {
    d.drawLine(w.start.x, -w.start.y, w.end.x, -w.end.y);
  }

  // Rooms (polygon as line loop)
  d.setActiveLayer("ROOMS");
  for (const r of f.rooms) {
    for (let i = 0; i < r.polygon.length; i++) {
      const a = r.polygon[i]!;
      const b = r.polygon[(i + 1) % r.polygon.length]!;
      d.drawLine(a.x, -a.y, b.x, -b.y);
    }
    // Center label
    let cx = 0;
    let cy = 0;
    for (const p of r.polygon) {
      cx += p.x;
      cy += p.y;
    }
    cx /= r.polygon.length;
    cy /= r.polygon.length;
    d.drawText(cx, -cy, 250, 0, r.name);
  }

  // Openings as short polylines on a separate layer
  d.setActiveLayer("OPENINGS");
  for (const o of f.openings) {
    const wall = f.walls.find((w) => w.id === o.wall_id);
    if (!wall) continue;
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len;
    const uy = dy / len;
    const cx = wall.start.x + ux * o.position_along_wall * len;
    const cy = wall.start.y + uy * o.position_along_wall * len;
    const halfW = o.width_mm / 2;
    const ax = cx - ux * halfW;
    const ay = cy - uy * halfW;
    const bx = cx + ux * halfW;
    const by = cy + uy * halfW;
    d.drawLine(ax, -ay, bx, -by);
  }

  const dxf = d.toDxfString();
  return new NextResponse(dxf, {
    headers: {
      "Content-Type": "application/dxf",
      "Content-Disposition": `attachment; filename="${body.plan.meta.name || "plan"}.dxf"`,
    },
  });
}
