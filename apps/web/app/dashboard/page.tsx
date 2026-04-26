"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FilePlus2, Trash2, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listProjects, deleteProject, type StoredProject } from "@/lib/firebase/projects";
import { formatINR } from "@/lib/utils";
import { computeBoq } from "@/lib/boq/engine";

export default function DashboardPage() {
  const [projects, setProjects] = React.useState<StoredProject[]>([]);
  const [costs, setCosts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const list = listProjects();
    setProjects(list);
    void Promise.all(
      list.map(async (p) => {
        try {
          const boq = await computeBoq(p.plan);
          return [p.id, boq.grand_total_inr] as const;
        } catch {
          return [p.id, 0] as const;
        }
      }),
    ).then((entries) => {
      const map: Record<string, number> = {};
      for (const [id, n] of entries) map[id] = n;
      setCosts(map);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/40 backdrop-blur sticky top-0 z-30 bg-background/70">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <LogoMark /> <span>BluePrintAI</span>
          </Link>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/project/new"><FilePlus2 className="size-4" /> New project</Link>
          </Button>
        </div>
      </header>

      <main className="container py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {projects.length === 0
                ? "Nothing here yet. Start your first project."
                : `${projects.length} project${projects.length === 1 ? "" : "s"} stored locally.`}
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-to-br from-primary/10 to-transparent">
            <div className="size-16 rounded-2xl bg-primary/15 grid place-items-center mx-auto mb-4">
              <Building2 className="size-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Generate your first plan</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              Describe the building you want. We&apos;ll generate the floor plan, the 3D, and the BOQ.
            </p>
            <Button asChild size="lg" className="mt-6 gap-1.5">
              <Link href="/project/new">Start a project <ArrowRight className="size-4" /></Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <Link href={`/project/${p.id}`} className="block">
                  <div className="aspect-video bg-muted/40 grid place-items-center text-xs text-muted-foreground">
                    <ProjectThumb plan={p.plan} />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold leading-tight truncate">{p.name}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="size-3" />
                      <span>{new Date(p.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Estimated total</span>
                      <span className="text-sm font-medium tabular-nums">
                        {costs[p.id] != null ? formatINR(costs[p.id]!) : "—"}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="px-4 pb-3 flex items-center justify-between">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/project/${p.id}`} className="gap-1">Open <ArrowRight className="size-3.5" /></Link>
                  </Button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"?`)) {
                        deleteProject(p.id);
                        setProjects(listProjects());
                      }
                    }}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectThumb({ plan }: { plan: StoredProject["plan"] }) {
  const w = plan.meta.plot_width_mm;
  const h = plan.meta.plot_depth_mm;
  const max = Math.max(w, h);
  const sw = (w / max) * 200;
  const sh = (h / max) * 130;
  const sx = (w / max) * 200 / w;
  const sy = (h / max) * 130 / h;
  return (
    <svg viewBox="0 0 200 130" className="w-full h-full">
      <rect x={(200 - sw) / 2} y={(130 - sh) / 2} width={sw} height={sh} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" />
      {plan.floors[0]?.rooms.map((r, i) => {
        const points = r.polygon.map((p) => `${(200 - sw) / 2 + p.x * sx},${(130 - sh) / 2 + p.y * sy}`).join(" ");
        const colors = ["#6366f1", "#22c55e", "#f97316", "#0ea5e9", "#a855f7", "#facc15"];
        return <polygon key={r.id} points={points} fill={colors[i % colors.length]!} fillOpacity="0.18" stroke={colors[i % colors.length]!} strokeOpacity="0.5" strokeWidth="0.6" />;
      })}
      {plan.floors[0]?.walls.map((w2) => (
        <line
          key={w2.id}
          x1={(200 - sw) / 2 + w2.start.x * sx}
          y1={(130 - sh) / 2 + w2.start.y * sy}
          x2={(200 - sw) / 2 + w2.end.x * sx}
          y2={(130 - sh) / 2 + w2.end.y * sy}
          stroke="hsl(var(--foreground))"
          strokeWidth="1.2"
        />
      ))}
    </svg>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className="text-primary">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M7 7 L17 7 L17 12 L12 12 L12 17 L7 17 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}
