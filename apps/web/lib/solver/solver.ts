/**
 * Layout solver — packs a list of rooms with target areas into a plot rectangle
 * using zone-based bisection (public/service strip on top, private strip below).
 *
 * Ported from the design bundle's solver.js. Pure function; deterministic.
 */

export type Zone = "public" | "private" | "service";

export type RoomSpec = {
  id: string;
  name: string;
  area: number; // sqm
  zone: Zone;
  entry?: boolean;
};

export type PlanSpec = {
  prompt?: string;
  plot: { w: number; h: number }; // mm
  rooms: RoomSpec[];
  budget?: number;
};

export type SolvedRoom = RoomSpec & {
  x: number;
  y: number;
  w: number;
  h: number;
  actualArea: number; // sqm
};

export type Opening = {
  id: string;
  type: "door" | "window";
  x: number;
  y: number;
  w: number;
  h: number;
  dir: "h" | "v";
  swing?: "in-right" | "in-down";
};

export type SolvedPlan = {
  plot: { w: number; h: number };
  rooms: SolvedRoom[];
  openings: Opening[];
  TE: number; // exterior wall thickness (mm)
  TI: number; // interior wall thickness (mm)
};

const TE = 230;
const TI = 115;

export function solveLayout(spec: PlanSpec): SolvedPlan {
  const W = spec.plot.w;
  const H = spec.plot.h;

  const innerW = W - TE * 2;
  const innerH = H - TE * 2;

  // Normalize areas to fit inside the plot
  const totalArea = spec.rooms.reduce((s, r) => s + (r.area || 10), 0);
  const scale = (innerW * innerH) / (totalArea * 1e6); // sqm → mm² scale factor

  // Annotate each room with the scaled area for packing
  const rooms = spec.rooms.map((r) => ({
    ...r,
    _area: (r.area || 10) * 1e6 * scale,
  }));

  const pub = rooms.filter((r) => r.zone === "public" || r.zone === "service");
  const priv = rooms.filter((r) => r.zone === "private");

  const pubArea = pub.reduce((s, r) => s + r._area, 0);
  const privArea = priv.reduce((s, r) => s + r._area, 0);
  const total = pubArea + privArea;
  const pubH = total ? (innerH * pubArea) / total : innerH / 2;
  const dividerThickness = pub.length && priv.length ? TI : 0;
  const privH = innerH - pubH - dividerThickness;

  const placed: SolvedRoom[] = [];

  function packStrip(rs: typeof rooms, x: number, y: number, w: number, h: number) {
    if (!rs.length) return;
    const totalA = rs.reduce((s, r) => s + r._area, 0);
    let cx = x;
    rs.forEach((r, i) => {
      const ww =
        i === rs.length - 1
          ? x + w - cx
          : Math.max(2000, w * (r._area / totalA) - (i < rs.length - 1 ? TI / 2 : 0));
      const finalW = ww - (i < rs.length - 1 ? TI : 0);
      placed.push({
        id: r.id,
        name: r.name,
        area: r.area,
        zone: r.zone,
        entry: r.entry,
        x: cx,
        y,
        w: finalW,
        h,
        actualArea: (finalW * h) / 1e6,
      });
      cx += ww;
    });
  }

  const sortRooms = <T extends { _area: number }>(rs: T[]) =>
    [...rs].sort((a, b) => b._area - a._area);

  packStrip(sortRooms(pub), TE, TE, innerW, pubH);
  packStrip(sortRooms(priv), TE, TE + pubH + dividerThickness, innerW, privH);

  // ------- Openings -------
  const openings: Opening[] = [];

  // Entry door — first public room with entry, else first public
  const entryRoom = pub.find((r) => r.entry) || pub[0];
  if (entryRoom) {
    const ep = placed.find((r) => r.id === entryRoom.id);
    if (ep) {
      openings.push({
        id: "entry",
        type: "door",
        x: 0,
        y: ep.y + ep.h * 0.4,
        w: TE,
        h: 1000,
        dir: "v",
        swing: "in-right",
      });
    }
  }

  // Doors between adjacent rooms within the same strip
  const stripRooms = (zone: "pub" | "priv") =>
    placed.filter((p) =>
      zone === "pub"
        ? pub.find((r) => r.id === p.id)
        : priv.find((r) => r.id === p.id),
    );

  for (const zone of ["pub", "priv"] as const) {
    const rs = stripRooms(zone);
    for (let i = 0; i < rs.length - 1; i++) {
      const a = rs[i]!;
      openings.push({
        id: `d-${a.id}-${rs[i + 1]!.id}`,
        type: "door",
        x: a.x + a.w,
        y: a.y + a.h * 0.5 - 450,
        w: TI,
        h: 900,
        dir: "v",
        swing: "in-right",
      });
    }
  }

  // Door between zones — connect the largest room across the divider
  if (pub.length && priv.length) {
    const pubRoom = stripRooms("pub").reduce<SolvedRoom | null>(
      (m, r) => (r.w > (m?.w || 0) ? r : m),
      null,
    );
    const privRoom = stripRooms("priv").reduce<SolvedRoom | null>(
      (m, r) => (r.w > (m?.w || 0) ? r : m),
      null,
    );
    if (pubRoom && privRoom) {
      const ox = Math.max(pubRoom.x, privRoom.x) + 400;
      openings.push({
        id: "d-zone",
        type: "door",
        x: ox,
        y: TE + pubH,
        w: 900,
        h: TI,
        dir: "h",
        swing: "in-down",
      });
    }
  }

  // Windows — one per room on each exterior wall it touches
  for (const r of placed) {
    if (r.y === TE) {
      const ww = Math.min(2000, r.w * 0.4);
      openings.push({
        id: `w-${r.id}-N`,
        type: "window",
        x: r.x + (r.w - ww) / 2,
        y: 0,
        w: ww,
        h: TE,
        dir: "h",
      });
    }
    if (r.y + r.h === TE + innerH) {
      const ww = Math.min(2000, r.w * 0.4);
      openings.push({
        id: `w-${r.id}-S`,
        type: "window",
        x: r.x + (r.w - ww) / 2,
        y: TE + innerH,
        w: ww,
        h: TE,
        dir: "h",
      });
    }
    if (r.x + r.w === TE + innerW) {
      const wh = Math.min(1800, r.h * 0.4);
      openings.push({
        id: `w-${r.id}-E`,
        type: "window",
        x: TE + innerW,
        y: r.y + (r.h - wh) / 2,
        w: TE,
        h: wh,
        dir: "v",
      });
    }
  }

  return { plot: { w: W, h: H }, rooms: placed, openings, TE, TI };
}

/** Helper to seed a fresh floor with a default 2BHK spec. */
export const SEED_SPEC: PlanSpec = {
  prompt: "2BHK in Anand, 8m × 11m plot, north-facing entry, ₹24L budget",
  plot: { w: 11460, h: 8460 },
  rooms: [
    { id: "living",  name: "Living / Dining", area: 24.75, zone: "public", entry: true },
    { id: "kitchen", name: "Kitchen",         area: 9,     zone: "public" },
    { id: "utility", name: "Utility",         area: 6.8,   zone: "service" },
    { id: "mbr",     name: "Master Bedroom",  area: 13.7,  zone: "private" },
    { id: "bath",    name: "Bath",            area: 4.2,   zone: "private" },
    { id: "br2",     name: "Bedroom 2",       area: 9.8,   zone: "private" },
    { id: "balcony", name: "Balcony",         area: 5.7,   zone: "private" },
  ],
  budget: 2400000,
};
