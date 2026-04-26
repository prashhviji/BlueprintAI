"use client";

import { type PlanIR } from "@/lib/schema/plan";

/**
 * Project store. Uses localStorage as the default backend so the app
 * works out of the box without Firebase configured. When Firebase env
 * vars are present, this can be swapped for a Firestore-backed impl
 * (kept as a TODO for v1.1).
 */
export type StoredProject = {
  id: string;
  name: string;
  plan: PlanIR;
  created_at: string;
  updated_at: string;
};

const KEY = "blueprintai.projects.v1";

function read(): StoredProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredProject[];
  } catch {
    return [];
  }
}

function write(items: StoredProject[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listProjects(): StoredProject[] {
  return read().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getProject(id: string): StoredProject | undefined {
  return read().find((p) => p.id === id);
}

export function saveProject(args: {
  id?: string;
  name: string;
  plan: PlanIR;
}): StoredProject {
  const items = read();
  const now = new Date().toISOString();
  const id = args.id ?? `prj_${Math.random().toString(36).slice(2, 11)}`;
  const existingIdx = items.findIndex((p) => p.id === id);
  const project: StoredProject = {
    id,
    name: args.name,
    plan: args.plan,
    created_at: existingIdx >= 0 ? items[existingIdx]!.created_at : now,
    updated_at: now,
  };
  if (existingIdx >= 0) items[existingIdx] = project;
  else items.unshift(project);
  write(items);
  return project;
}

export function deleteProject(id: string): void {
  write(read().filter((p) => p.id !== id));
}

export function newProjectId(): string {
  return `prj_${Math.random().toString(36).slice(2, 11)}`;
}
