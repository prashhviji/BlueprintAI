import {
  type FinishSpec,
  type Fixture,
  type Opening,
  type OpeningType,
  type PlanIR,
  type Point,
  type Wall,
  type WallType,
} from "@/lib/schema/plan";

export type Command =
  | { kind: "wall.add"; floor: number; wall: Wall }
  | { kind: "wall.move"; floor: number; id: string; start: Point; end: Point }
  | { kind: "wall.delete"; floor: number; id: string }
  | { kind: "wall.changeType"; floor: number; id: string; type: WallType }
  | { kind: "opening.add"; floor: number; opening: Opening }
  | { kind: "opening.move"; floor: number; id: string; position_along_wall: number }
  | { kind: "opening.changeType"; floor: number; id: string; type: OpeningType }
  | { kind: "opening.changeMaterial"; floor: number; id: string; material: string | undefined }
  | { kind: "opening.delete"; floor: number; id: string }
  | { kind: "room.upsertPolygon"; floor: number; id: string; polygon: Point[] }
  | { kind: "room.changeName"; floor: number; id: string; name: string }
  | { kind: "room.changeFinishes"; floor: number; id: string; finishes: FinishSpec }
  | { kind: "fixture.add"; floor: number; roomId: string; fixture: Fixture }
  | { kind: "fixture.move"; floor: number; roomId: string; idx: number; position: Point; rotation_deg: number }
  | { kind: "fixture.delete"; floor: number; roomId: string; idx: number };

export function apply(plan: PlanIR, cmd: Command): PlanIR {
  // Deep clone via JSON. Plan IR is small enough that this is fine.
  const next = JSON.parse(JSON.stringify(plan)) as PlanIR;
  const f = next.floors[cmd.floor];
  if (!f) throw new Error(`apply: floor ${cmd.floor} not found`);

  switch (cmd.kind) {
    case "wall.add":
      f.walls.push(cmd.wall);
      break;
    case "wall.move": {
      const w = f.walls.find((x) => x.id === cmd.id);
      if (!w) throw new Error(`wall ${cmd.id} not found`);
      w.start = cmd.start;
      w.end = cmd.end;
      break;
    }
    case "wall.delete":
      f.walls = f.walls.filter((w) => w.id !== cmd.id);
      f.openings = f.openings.filter((o) => o.wall_id !== cmd.id);
      break;
    case "wall.changeType": {
      const w = f.walls.find((x) => x.id === cmd.id);
      if (!w) throw new Error(`wall ${cmd.id} not found`);
      w.type = cmd.type;
      break;
    }
    case "opening.add":
      f.openings.push(cmd.opening);
      break;
    case "opening.move": {
      const o = f.openings.find((x) => x.id === cmd.id);
      if (!o) throw new Error(`opening ${cmd.id} not found`);
      o.position_along_wall = cmd.position_along_wall;
      break;
    }
    case "opening.changeType": {
      const o = f.openings.find((x) => x.id === cmd.id);
      if (!o) throw new Error(`opening ${cmd.id} not found`);
      o.type = cmd.type;
      break;
    }
    case "opening.changeMaterial": {
      const o = f.openings.find((x) => x.id === cmd.id);
      if (!o) throw new Error(`opening ${cmd.id} not found`);
      o.material = cmd.material;
      break;
    }
    case "opening.delete":
      f.openings = f.openings.filter((o) => o.id !== cmd.id);
      break;
    case "room.upsertPolygon": {
      const r = f.rooms.find((x) => x.id === cmd.id);
      if (!r) throw new Error(`room ${cmd.id} not found`);
      r.polygon = cmd.polygon;
      break;
    }
    case "room.changeName": {
      const r = f.rooms.find((x) => x.id === cmd.id);
      if (!r) throw new Error(`room ${cmd.id} not found`);
      r.name = cmd.name;
      break;
    }
    case "room.changeFinishes": {
      const r = f.rooms.find((x) => x.id === cmd.id);
      if (!r) throw new Error(`room ${cmd.id} not found`);
      r.finishes = cmd.finishes;
      break;
    }
    case "fixture.add": {
      const r = f.rooms.find((x) => x.id === cmd.roomId);
      if (!r) throw new Error(`room ${cmd.roomId} not found`);
      r.fixtures.push(cmd.fixture);
      break;
    }
    case "fixture.move": {
      const r = f.rooms.find((x) => x.id === cmd.roomId);
      if (!r) throw new Error(`room ${cmd.roomId} not found`);
      const fx = r.fixtures[cmd.idx];
      if (!fx) throw new Error(`fixture ${cmd.idx} not found`);
      fx.position = cmd.position;
      fx.rotation_deg = cmd.rotation_deg;
      break;
    }
    case "fixture.delete": {
      const r = f.rooms.find((x) => x.id === cmd.roomId);
      if (!r) throw new Error(`room ${cmd.roomId} not found`);
      r.fixtures = r.fixtures.filter((_, i) => i !== cmd.idx);
      break;
    }
  }
  return next;
}

export function invert(prev: PlanIR, cmd: Command): Command | undefined {
  const f = prev.floors[cmd.floor];
  if (!f) return undefined;

  switch (cmd.kind) {
    case "wall.add":
      return { kind: "wall.delete", floor: cmd.floor, id: cmd.wall.id };
    case "wall.delete": {
      const w = f.walls.find((x) => x.id === cmd.id);
      if (!w) return undefined;
      return { kind: "wall.add", floor: cmd.floor, wall: w };
    }
    case "wall.move": {
      const w = f.walls.find((x) => x.id === cmd.id);
      if (!w) return undefined;
      return { kind: "wall.move", floor: cmd.floor, id: cmd.id, start: w.start, end: w.end };
    }
    case "wall.changeType": {
      const w = f.walls.find((x) => x.id === cmd.id);
      if (!w) return undefined;
      return { kind: "wall.changeType", floor: cmd.floor, id: cmd.id, type: w.type };
    }
    case "opening.add":
      return { kind: "opening.delete", floor: cmd.floor, id: cmd.opening.id };
    case "opening.delete": {
      const o = f.openings.find((x) => x.id === cmd.id);
      if (!o) return undefined;
      return { kind: "opening.add", floor: cmd.floor, opening: o };
    }
    case "opening.move": {
      const o = f.openings.find((x) => x.id === cmd.id);
      if (!o) return undefined;
      return { kind: "opening.move", floor: cmd.floor, id: cmd.id, position_along_wall: o.position_along_wall };
    }
    case "opening.changeType": {
      const o = f.openings.find((x) => x.id === cmd.id);
      if (!o) return undefined;
      return { kind: "opening.changeType", floor: cmd.floor, id: cmd.id, type: o.type };
    }
    case "opening.changeMaterial": {
      const o = f.openings.find((x) => x.id === cmd.id);
      if (!o) return undefined;
      return { kind: "opening.changeMaterial", floor: cmd.floor, id: cmd.id, material: o.material };
    }
    case "room.upsertPolygon": {
      const r = f.rooms.find((x) => x.id === cmd.id);
      if (!r) return undefined;
      return { kind: "room.upsertPolygon", floor: cmd.floor, id: cmd.id, polygon: r.polygon };
    }
    case "room.changeName": {
      const r = f.rooms.find((x) => x.id === cmd.id);
      if (!r) return undefined;
      return { kind: "room.changeName", floor: cmd.floor, id: cmd.id, name: r.name };
    }
    case "room.changeFinishes": {
      const r = f.rooms.find((x) => x.id === cmd.id);
      if (!r) return undefined;
      return { kind: "room.changeFinishes", floor: cmd.floor, id: cmd.id, finishes: r.finishes };
    }
    case "fixture.add": {
      const r = f.rooms.find((x) => x.id === cmd.roomId);
      if (!r) return undefined;
      return { kind: "fixture.delete", floor: cmd.floor, roomId: cmd.roomId, idx: r.fixtures.length };
    }
    case "fixture.delete": {
      const r = f.rooms.find((x) => x.id === cmd.roomId);
      if (!r) return undefined;
      const fx = r.fixtures[cmd.idx];
      if (!fx) return undefined;
      return { kind: "fixture.add", floor: cmd.floor, roomId: cmd.roomId, fixture: fx };
    }
    case "fixture.move": {
      const r = f.rooms.find((x) => x.id === cmd.roomId);
      if (!r) return undefined;
      const fx = r.fixtures[cmd.idx];
      if (!fx) return undefined;
      return {
        kind: "fixture.move",
        floor: cmd.floor,
        roomId: cmd.roomId,
        idx: cmd.idx,
        position: fx.position,
        rotation_deg: fx.rotation_deg,
      };
    }
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
