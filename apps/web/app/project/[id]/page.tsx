"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  CloudOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toolbar } from "@/components/editor/Toolbar";
import { PromptPanel } from "@/components/editor/PromptPanel";
import { BoqPanel } from "@/components/editor/BoqPanel";
import { PropertyInspector } from "@/components/editor/PropertyInspector";
import { useProjectStore } from "@/lib/store/project";
import { getProject, saveProject } from "@/lib/firebase/projects";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { type PlanIR } from "@/lib/schema/plan";

// Konva and R3F are client-only — disable SSR.
const Canvas2D = dynamic(() => import("@/components/editor/Canvas2D").then((m) => m.Canvas2D), {
  ssr: false,
  loading: () => <CanvasSkeleton label="Loading 2D canvas…" />,
});
const View3D = dynamic(() => import("@/components/editor/View3D").then((m) => m.View3D), {
  ssr: false,
  loading: () => <CanvasSkeleton label="Loading 3D view…" />,
});

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const id = params.id;

  const plan = useProjectStore((s) => s.plan);
  const setPlan = useProjectStore((s) => s.setPlan);
  const projectName = useProjectStore((s) => s.projectName);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const setProjectId = useProjectStore((s) => s.setProjectId);
  const view = useProjectStore((s) => s.view);
  const saveStatus = useProjectStore((s) => s.saveStatus);
  const setSaveStatus = useProjectStore((s) => s.setSaveStatus);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    setProjectId(id);
    const existing = getProject(id);
    if (existing) {
      setPlan(existing.plan);
      setProjectName(existing.name);
    } else {
      setPlan(null);
      setProjectName("Untitled Project");
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  React.useEffect(() => {
    if (!hydrated || !plan || !id) return;
    setSaveStatus("idle");
    const handle = setTimeout(() => {
      try {
        setSaveStatus("saving");
        saveProject({ id, name: projectName, plan });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 1500);
    return () => clearTimeout(handle);
  }, [plan, projectName, id, hydrated, setSaveStatus]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        useProjectStore.getState().setView(useProjectStore.getState().view === "2d" ? "3d" : "2d");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  function exportData(kind: "csv" | "json") {
    if (!plan) {
      toast("Nothing to export — generate a plan first.", "warning");
      return;
    }
    if (kind === "json") {
      const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName || "plan"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Exported JSON", "success");
    } else {
      void fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("Export failed");
          const blob = await r.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${projectName || "plan"}-BOQ.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast("Exported CSV", "success");
        })
        .catch((e) => toast("Export failed: " + (e as Error).message, "error"));
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Topbar
        name={projectName}
        onName={setProjectName}
        saveStatus={saveStatus}
        plan={plan}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <aside className="w-[280px] border-r border-border/40 bg-card/30 flex flex-col">
          <div className="p-3 border-b">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Floors</p>
            <div className="flex items-center justify-between p-2 rounded-md bg-accent/40">
              <span className="text-sm">Ground Floor</span>
              <span className="text-xs text-muted-foreground">
                {plan?.floors[0]?.rooms.length ?? 0} rooms
              </span>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Rooms</p>
              <RoomList />
            </div>
          </ScrollArea>
        </aside>

        {/* Center canvas */}
        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            {view === "2d" ? <Canvas2D /> : <View3D />}
          </div>

          {/* Toolbar floats top-center */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <Toolbar onExport={exportData} />
          </div>

          {/* Empty-state hero (only when no plan) */}
          {hydrated && !plan && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none px-6">
              <div className="text-center max-w-md animate-fade-in">
                <div className="size-16 rounded-2xl bg-primary/15 grid place-items-center mx-auto mb-4">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Describe your home</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use the prompt below to generate a starter floor plan. You can edit
                  everything afterwards in 2D and 3D.
                </p>
              </div>
            </div>
          )}

          {/* Prompt panel always at bottom */}
          <div className="absolute inset-x-0 bottom-3 px-4 flex justify-center pointer-events-none z-10">
            <div className="pointer-events-auto w-full max-w-3xl">
              <PromptPanel />
            </div>
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="w-[360px] border-l border-border/40 bg-card/30 flex flex-col">
          <Tabs defaultValue="boq" className="flex-1 flex flex-col min-h-0">
            <div className="p-2 border-b">
              <TabsList className="w-full">
                <TabsTrigger value="boq"       className="flex-1 text-xs">BOQ</TabsTrigger>
                <TabsTrigger value="inspector" className="flex-1 text-xs">Inspector</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="boq"       className="flex-1 mt-0 min-h-0 overflow-hidden">
              <BoqPanel />
            </TabsContent>
            <TabsContent value="inspector" className="flex-1 mt-0 min-h-0 overflow-y-auto">
              <PropertyInspector />
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

function Topbar({
  name,
  onName,
  saveStatus,
  plan,
}: {
  name: string;
  onName: (n: string) => void;
  saveStatus: "idle" | "saving" | "saved" | "error";
  plan: PlanIR | null;
}) {
  return (
    <header className="h-12 border-b border-border/40 bg-card/40 backdrop-blur flex items-center px-3 gap-3 shrink-0">
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link href="/dashboard"><ArrowLeft className="size-4" /> Dashboard</Link>
      </Button>
      <div className="h-6 w-px bg-border" />
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        className="bg-transparent text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring px-2 py-1 rounded min-w-[200px]"
      />
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        {plan && <PlanStats plan={plan} />}
        <SaveBadge status={saveStatus} />
      </div>
    </header>
  );
}

function PlanStats({ plan }: { plan: PlanIR }) {
  const f = plan.floors[0]!;
  return (
    <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-full bg-muted">
      <span>{f.rooms.length} rooms</span>
      <span>·</span>
      <span>{f.walls.length} walls</span>
      <span>·</span>
      <span>{f.openings.length} openings</span>
    </div>
  );
}

function SaveBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", {
      "bg-emerald-500/10 text-emerald-500": status === "saved",
      "bg-amber-500/10 text-amber-500": status === "idle",
      "bg-blue-500/10 text-blue-500": status === "saving",
      "bg-destructive/10 text-destructive": status === "error",
    })}>
      {status === "saving" && <><Loader2 className="size-3 animate-spin" /> Saving</>}
      {status === "saved"  && <><CheckCircle2 className="size-3" /> Saved</>}
      {status === "idle"   && <><Save className="size-3" /> Unsaved</>}
      {status === "error"  && <><CloudOff className="size-3" /> Error</>}
    </div>
  );
}

function RoomList() {
  const plan = useProjectStore((s) => s.plan);
  const selection = useProjectStore((s) => s.selection);
  const setSelection = useProjectStore((s) => s.setSelection);
  if (!plan) return <p className="text-xs text-muted-foreground">No plan yet.</p>;
  const f = plan.floors[0]!;
  if (f.rooms.length === 0) return <p className="text-xs text-muted-foreground">No rooms yet.</p>;
  return (
    <div className="space-y-1">
      {f.rooms.map((r) => {
        const isSel = selection?.kind === "room" && selection.id === r.id;
        return (
          <button
            key={r.id}
            onClick={() => setSelection({ kind: "room", id: r.id })}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors text-left",
              isSel ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <span className="truncate">{r.name}</span>
            <span className="text-[10px] uppercase opacity-70">{r.type.replace(/_/g, " ")}</span>
          </button>
        );
      })}
    </div>
  );
}

function CanvasSkeleton({ label }: { label: string }) {
  return (
    <div className="w-full h-full grid place-items-center bg-muted/20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {label}
      </div>
    </div>
  );
}
