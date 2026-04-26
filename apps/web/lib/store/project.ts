"use client";

import { create } from "zustand";
import { type PlanIR } from "@/lib/schema/plan";
import { validateInvariants } from "@/lib/schema/validate";
import { apply, type Command, invert } from "@/lib/canvas/commands";

export type Selection =
  | { kind: "wall"; id: string }
  | { kind: "opening"; id: string }
  | { kind: "room"; id: string }
  | { kind: "fixture"; roomId: string; idx: number }
  | null;

export type Tool =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "room"
  | "fixture"
  | "pan";

export type ViewMode = "2d" | "3d";

type ToastFn = (msg: string, kind?: "info" | "warning" | "error" | "success") => void;

type ProjectStore = {
  plan: PlanIR | null;
  setPlan: (p: PlanIR | null) => void;
  setPlanFromGenerate: (p: PlanIR) => void;

  // Editing
  applyCommand: (cmd: Command, toast?: ToastFn) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undoStack: Command[];
  redoStack: Command[];

  // UI state
  selection: Selection;
  setSelection: (s: Selection) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  showDimensions: boolean;
  toggleDimensions: () => void;
  snapEnabled: boolean;
  toggleSnap: () => void;

  // Project meta
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  projectName: string;
  setProjectName: (n: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  setSaveStatus: (s: ProjectStore["saveStatus"]) => void;
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  plan: null,
  setPlan: (p) => set({ plan: p, undoStack: [], redoStack: [], selection: null }),
  setPlanFromGenerate: (p) => set({ plan: p, undoStack: [], redoStack: [], selection: null, saveStatus: "idle" }),

  applyCommand: (cmd, toast) => {
    const { plan, undoStack } = get();
    if (!plan) return;
    let next: PlanIR;
    try {
      next = apply(plan, cmd);
    } catch (e) {
      toast?.("Command failed: " + (e as Error).message, "error");
      return;
    }
    const inv = validateInvariants(next);
    if (!inv.ok) {
      toast?.("Edit rejected: " + inv.errors[0], "warning");
      return;
    }
    const inverse = invert(plan, cmd);
    set({
      plan: next,
      undoStack: inverse ? [...undoStack, inverse] : undoStack,
      redoStack: [],
      saveStatus: "idle",
    });
  },

  undo: () => {
    const { plan, undoStack, redoStack } = get();
    if (!plan || undoStack.length === 0) return;
    const cmd = undoStack[undoStack.length - 1]!;
    let next: PlanIR;
    try {
      next = apply(plan, cmd);
    } catch {
      return;
    }
    const redo = invert(plan, cmd);
    set({
      plan: next,
      undoStack: undoStack.slice(0, -1),
      redoStack: redo ? [...redoStack, redo] : redoStack,
      saveStatus: "idle",
    });
  },

  redo: () => {
    const { plan, undoStack, redoStack } = get();
    if (!plan || redoStack.length === 0) return;
    const cmd = redoStack[redoStack.length - 1]!;
    let next: PlanIR;
    try {
      next = apply(plan, cmd);
    } catch {
      return;
    }
    const undo = invert(plan, cmd);
    set({
      plan: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: undo ? [...undoStack, undo] : undoStack,
      saveStatus: "idle",
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  undoStack: [],
  redoStack: [],

  selection: null,
  setSelection: (s) => set({ selection: s }),
  tool: "select",
  setTool: (t) => set({ tool: t }),
  view: "2d",
  setView: (v) => set({ view: v }),
  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  showDimensions: true,
  toggleDimensions: () => set((s) => ({ showDimensions: !s.showDimensions })),
  snapEnabled: true,
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  projectId: null,
  setProjectId: (id) => set({ projectId: id }),
  projectName: "Untitled Project",
  setProjectName: (n) => set({ projectName: n }),
  saveStatus: "idle",
  setSaveStatus: (s) => set({ saveStatus: s }),
}));
