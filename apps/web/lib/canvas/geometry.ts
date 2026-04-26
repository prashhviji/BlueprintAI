import { type Opening, type Point, type Wall } from "@/lib/schema/plan";

export function wallVector(w: Wall): { ux: number; uy: number; len: number } {
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { ux: 1, uy: 0, len: 0 };
  return { ux: dx / len, uy: dy / len, len };
}

export function wallAngleRad(w: Wall): number {
  return Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);
}

export function openingCenter(o: Opening, w: Wall): Point {
  const { ux, uy, len } = wallVector(w);
  return {
    x: w.start.x + ux * o.position_along_wall * len,
    y: w.start.y + uy * o.position_along_wall * len,
  };
}

export function projectPointOntoWall(
  p: Point,
  w: Wall,
): { positionAlongWall: number; perpendicularDistance: number } {
  const { ux, uy, len } = wallVector(w);
  if (len === 0) return { positionAlongWall: 0, perpendicularDistance: 0 };
  const dx = p.x - w.start.x;
  const dy = p.y - w.start.y;
  const t = (dx * ux + dy * uy) / len;
  const perp = Math.abs(dx * -uy + dy * ux);
  return {
    positionAlongWall: Math.max(0, Math.min(1, t)),
    perpendicularDistance: perp,
  };
}

export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
  const t = c1 / c2;
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

export function nearestWall(
  p: Point,
  walls: Wall[],
  maxDist: number,
): Wall | undefined {
  let best: Wall | undefined;
  let bestDist = Infinity;
  for (const w of walls) {
    const d = distancePointToSegment(p, w.start, w.end);
    if (d < bestDist && d <= maxDist) {
      bestDist = d;
      best = w;
    }
  }
  return best;
}

export function polygonCentroid(poly: Point[]): Point {
  let cx = 0;
  let cy = 0;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const f = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * f;
    cy += (a.y + b.y) * f;
    area += f;
  }
  area /= 2;
  if (Math.abs(area) < 1e-6) {
    // Fallback to mean.
    return {
      x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
      y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
    };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function polygonArea(poly: Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function mmToFeet(mm: number): string {
  const totalIn = mm / 25.4;
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  return `${ft}'-${inch.toFixed(1)}"`;
}

export function mmToMeters(mm: number, dp = 2): string {
  return (mm / 1000).toFixed(dp) + " m";
}

export function sqmFromSqMm(sqMm: number, dp = 1): string {
  return (sqMm / 1e6).toFixed(dp) + " m²";
}

export function sqftFromSqMm(sqMm: number, dp = 0): string {
  return (sqMm / 92903).toFixed(dp) + " sqft";
}
