import { type Point, type Wall } from "@/lib/schema/plan";
import { distancePointToSegment } from "./geometry";

export const GRID_MM = 100;

export type Snap = {
  point: Point;
  kind: "grid" | "endpoint" | "midpoint" | "ortho" | "none";
};

export function snapToGrid(p: Point): Point {
  return {
    x: Math.round(p.x / GRID_MM) * GRID_MM,
    y: Math.round(p.y / GRID_MM) * GRID_MM,
  };
}

/**
 * @param scale  pixels per mm — used to convert screen-space tolerances
 *               (80px endpoint, 60px midpoint) to mm.
 */
export function snapToContext(args: {
  point: Point;
  walls: Wall[];
  scale: number;
  ortho?: { from: Point };
  enableGrid?: boolean;
}): Snap {
  const { point, walls, scale, ortho } = args;
  const enableGrid = args.enableGrid ?? true;

  const endpointTolMm = 80 / Math.max(0.001, scale);
  const midpointTolMm = 60 / Math.max(0.001, scale);

  // Endpoint snap
  for (const w of walls) {
    if (Math.hypot(w.start.x - point.x, w.start.y - point.y) < endpointTolMm) {
      return { point: w.start, kind: "endpoint" };
    }
    if (Math.hypot(w.end.x - point.x, w.end.y - point.y) < endpointTolMm) {
      return { point: w.end, kind: "endpoint" };
    }
  }

  // Midpoint snap
  for (const w of walls) {
    const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
    if (Math.hypot(mid.x - point.x, mid.y - point.y) < midpointTolMm) {
      return { point: mid, kind: "midpoint" };
    }
  }

  // Ortho snap (45° increments) when shift is held while drawing
  if (ortho) {
    const dx = point.x - ortho.from.x;
    const dy = point.y - ortho.from.y;
    const ang = Math.atan2(dy, dx);
    const snapAng = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.hypot(dx, dy);
    const snapped = {
      x: ortho.from.x + Math.cos(snapAng) * len,
      y: ortho.from.y + Math.sin(snapAng) * len,
    };
    return { point: enableGrid ? snapToGrid(snapped) : snapped, kind: "ortho" };
  }

  // Grid snap (default)
  if (enableGrid) {
    return { point: snapToGrid(point), kind: "grid" };
  }
  return { point, kind: "none" };
}

export function nearestWallForOpening(
  p: Point,
  walls: Wall[],
  maxScreenPx: number,
  scale: number,
): Wall | undefined {
  const tol = maxScreenPx / Math.max(0.001, scale);
  let best: Wall | undefined;
  let bestD = Infinity;
  for (const w of walls) {
    const d = distancePointToSegment(p, w.start, w.end);
    if (d < bestD && d <= tol) {
      best = w;
      bestD = d;
    }
  }
  return best;
}
