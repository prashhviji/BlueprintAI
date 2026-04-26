import { type Floor, type Opening, type PlanIR, type Wall, WALL_THICKNESS_MM } from "@/lib/schema/plan";

// Plan IR uses X-right, Y-down, units mm. Three.js scene uses meters,
// X-right, Y-up, Z-toward-camera. We map Plan X → 3D X, Plan Y → 3D Z,
// height → 3D Y. Result: looking straight down from +Y matches the 2D plan.

const MM_TO_M = 1 / 1000;

export type WallSegment = {
  /** Centerline midpoint in meters (in 3D world coords). */
  cx: number;
  cz: number;
  /** Length along the wall direction. */
  length: number;
  /** Thickness perpendicular to the wall. */
  thickness: number;
  /** Height of this segment. */
  height: number;
  /** Vertical offset (bottom of segment from floor). */
  baseY: number;
  /** Rotation around Y axis (radians). */
  rotY: number;
  /** Wall id this came from. */
  wallId: string;
  /** Kind for material/color. */
  kind: "wall" | "lintel" | "sill";
};

export type OpeningFrame = {
  cx: number;
  cz: number;
  width: number;
  height: number;
  thickness: number;
  baseY: number;
  rotY: number;
  type: Opening["type"];
  openingId: string;
};

export type RoomMesh = {
  id: string;
  name: string;
  type: string;
  /** Polygon points in 3D (xz plane), meters. */
  polygon: Array<{ x: number; z: number }>;
  floorTexture: string;
  ceilingTexture: string;
  floorY: number;
  ceilingY: number;
};

export type Extruded = {
  floors: Array<{
    level: number;
    floorY: number;
    ceilingY: number;
    walls: WallSegment[];
    openings: OpeningFrame[];
    rooms: RoomMesh[];
  }>;
  plotWidth: number;
  plotDepth: number;
};

export function extrudePlan(plan: PlanIR): Extruded {
  const out: Extruded = {
    floors: [],
    plotWidth: plan.meta.plot_width_mm * MM_TO_M,
    plotDepth: plan.meta.plot_depth_mm * MM_TO_M,
  };

  for (const f of plan.floors) {
    const floorY = f.level * (f.height_mm * MM_TO_M);
    const ceilingY = floorY + f.height_mm * MM_TO_M;
    const walls: WallSegment[] = [];
    const openings: OpeningFrame[] = [];

    // Index openings by wall.
    const openingsByWall = new Map<string, Opening[]>();
    for (const o of f.openings) {
      const list = openingsByWall.get(o.wall_id) ?? [];
      list.push(o);
      openingsByWall.set(o.wall_id, list);
    }

    for (const w of f.walls) {
      const ops = (openingsByWall.get(w.id) ?? []).sort(
        (a, b) => a.position_along_wall - b.position_along_wall,
      );
      const segs = segmentWall(w, ops, f.height_mm);
      walls.push(...segs.wallSegments);
      openings.push(...segs.openings);
    }

    const rooms: RoomMesh[] = f.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      polygon: r.polygon.map((p) => ({ x: p.x * MM_TO_M, z: p.y * MM_TO_M })),
      floorTexture: r.finishes.floor,
      ceilingTexture: r.finishes.ceiling,
      floorY,
      ceilingY,
    }));

    out.floors.push({ level: f.level, floorY, ceilingY, walls, openings, rooms });
  }

  return out;
}

/**
 * Split a wall into segments around its openings, producing:
 *   - full-height wall segments between openings,
 *   - lintels above each opening,
 *   - sills below each window opening,
 *   - opening frames (for door/window meshes).
 */
function segmentWall(
  w: Wall,
  ops: Opening[],
  floorHeightMm: number,
): { wallSegments: WallSegment[]; openings: OpeningFrame[] } {
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const wallLenMm = Math.hypot(dx, dy);
  const wallLenM = wallLenMm * MM_TO_M;
  const ux = dx / wallLenMm;
  const uy = dy / wallLenMm;
  const rotY = -Math.atan2(uy, ux); // negate because plan Y maps to -Z (Y-down → +Z)
  const thickness = WALL_THICKNESS_MM[w.type] * MM_TO_M;
  const heightM = floorHeightMm * MM_TO_M;

  const sx = w.start.x * MM_TO_M;
  const sz = w.start.y * MM_TO_M;

  const segs: WallSegment[] = [];
  const frames: OpeningFrame[] = [];

  // Build sorted intervals along the wall length: each opening spans
  // [pos*len - width/2, pos*len + width/2].
  type Span = { start: number; end: number; o: Opening };
  const spans: Span[] = ops.map((o) => {
    const center = o.position_along_wall * wallLenM;
    const half = (o.width_mm * MM_TO_M) / 2;
    return { start: Math.max(0, center - half), end: Math.min(wallLenM, center + half), o };
  });

  // Add full-height segments between spans.
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor + 1e-4) {
      pushWall(segs, w.id, sx, sz, ux, uy, cursor, s.start, thickness, heightM, 0, rotY);
    }

    // Lintel above the opening
    const opH = s.o.height_mm * MM_TO_M;
    const sill = s.o.sill_mm * MM_TO_M;
    const lintelHeight = heightM - sill - opH;
    if (lintelHeight > 0.01) {
      pushSegment(segs, w.id, "lintel", sx, sz, ux, uy, s.start, s.end, thickness, lintelHeight, sill + opH, rotY);
    }
    // Sill below windows (but not below doors which start at floor)
    if (sill > 0.01) {
      pushSegment(segs, w.id, "sill", sx, sz, ux, uy, s.start, s.end, thickness, sill, 0, rotY);
    }

    // Frame for the opening itself
    const cMm = s.o.position_along_wall * wallLenMm;
    const cx = (w.start.x + ux * cMm) * MM_TO_M;
    const cz = (w.start.y + uy * cMm) * MM_TO_M;
    frames.push({
      cx,
      cz,
      width: s.o.width_mm * MM_TO_M,
      height: opH,
      thickness,
      baseY: sill,
      rotY,
      type: s.o.type,
      openingId: s.o.id,
    });

    cursor = s.end;
  }

  if (cursor < wallLenM - 1e-4) {
    pushWall(segs, w.id, sx, sz, ux, uy, cursor, wallLenM, thickness, heightM, 0, rotY);
  }

  // Wall with no openings: emit one full segment.
  if (spans.length === 0) {
    pushWall(segs, w.id, sx, sz, ux, uy, 0, wallLenM, thickness, heightM, 0, rotY);
  }

  return { wallSegments: segs, openings: frames };
}

function pushWall(
  segs: WallSegment[],
  wallId: string,
  sx: number,
  sz: number,
  ux: number,
  uy: number,
  fromM: number,
  toM: number,
  thickness: number,
  height: number,
  baseY: number,
  rotY: number,
) {
  pushSegment(segs, wallId, "wall", sx, sz, ux, uy, fromM, toM, thickness, height, baseY, rotY);
}

function pushSegment(
  segs: WallSegment[],
  wallId: string,
  kind: WallSegment["kind"],
  sx: number,
  sz: number,
  ux: number,
  uy: number,
  fromM: number,
  toM: number,
  thickness: number,
  height: number,
  baseY: number,
  rotY: number,
) {
  const length = toM - fromM;
  if (length <= 1e-4) return;
  const midM = (fromM + toM) / 2;
  segs.push({
    cx: sx + ux * midM,
    cz: sz + uy * midM,
    length,
    thickness,
    height,
    baseY,
    rotY,
    wallId,
    kind,
  });
}
