"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listProjects, deleteProject, type StoredProject } from "@/lib/firebase/projects";
import { computeBoq } from "@/lib/boq/engine";
import { formatINR } from "@/lib/utils";

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
      <header className="border-b border-border-subtle backdrop-blur sticky top-0 z-30 bg-base/80">
        <div className="container flex h-12 items-center justify-between">
          <Link href="/" className="display font-semibold inline-flex items-baseline" style={{ letterSpacing: "-0.02em" }}>
            BluePrint<span className="text-accent font-bold ml-px" style={{ fontSize: "60%" }}>AI</span>
          </Link>
          <Button asChild variant="primary" size="sm" className="gap-1.5">
            <Link href="/project/new"><Plus size={14} /> New project</Link>
          </Button>
        </div>
      </header>

      <main className="container py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="display text-xl font-semibold tracking-tight">Your projects</h1>
            <p className="text-sm text-secondary mt-1">
              {projects.length === 0
                ? "Nothing here yet. Start your first project."
                : `${projects.length} project${projects.length === 1 ? "" : "s"} stored locally.`}
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card surface={2} className="p-12 text-center">
            <div className="size-14 rounded grid place-items-center mx-auto mb-4" style={{ background: "var(--accent-soft)" }}>
              <Plus size={20} className="text-accent" />
            </div>
            <h2 className="display text-lg font-semibold">Generate your first plan</h2>
            <p className="mt-1 text-sm text-secondary max-w-md mx-auto">
              Describe the building you want. We&apos;ll generate the floor plan, the 3D, and the BOQ.
            </p>
            <Button asChild variant="primary" size="lg" className="mt-6 gap-1.5">
              <Link href="/project/new">Start a project <ArrowRight className="size-4" /></Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((p) => (
              <Card key={p.id} surface={2} className="overflow-hidden">
                <Link href={`/project/${p.id}`} className="block">
                  <div className="aspect-video surface-canvas border-b border-border-subtle grid place-items-center">
                    <ProjectThumb plan={p.plan} />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-primary truncate">{p.name}</h3>
                    <div className="mt-1.5 mono text-2xs text-tertiary">
                      {new Date(p.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="mt-3 flex items-baseline justify-between">
                      <span className="text-xs text-tertiary">Estimated total</span>
                      <span className="mono text-sm tabular-nums text-primary">
                        {costs[p.id] != null ? formatINR(costs[p.id]!) : "—"}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="px-4 pb-3 flex items-center justify-between border-t border-border-subtle pt-3">
                  <Button asChild size="xs" variant="ghost" className="gap-1">
                    <Link href={`/project/${p.id}`}>Open <ArrowRight className="size-3" /></Link>
                  </Button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"?`)) {
                        deleteProject(p.id);
                        setProjects(listProjects());
                      }
                    }}
                    className="text-tertiary hover:text-danger size-6 grid place-items-center rounded"
                  >
                    <X size={14} />
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
  const sx = sw / w;
  const sy = sh / h;
  return (
    <svg viewBox="0 0 200 130" className="w-full h-full">
      <rect x={(200 - sw) / 2} y={(130 - sh) / 2} width={sw} height={sh} fill="var(--bg-canvas)" stroke="rgb(var(--border-default))" strokeWidth="1" />
      {plan.floors[0]?.rooms.map((r) => {
        const points = r.polygon.map((p) => `${(200 - sw) / 2 + p.x * sx},${(130 - sh) / 2 + p.y * sy}`).join(" ");
        return <polygon key={r.id} points={points} fill="var(--accent-soft)" stroke="var(--accent-edge)" strokeWidth="0.6" />;
      })}
      {plan.floors[0]?.walls.map((w2) => (
        <line
          key={w2.id}
          x1={(200 - sw) / 2 + w2.start.x * sx}
          y1={(130 - sh) / 2 + w2.start.y * sy}
          x2={(200 - sw) / 2 + w2.end.x * sx}
          y2={(130 - sh) / 2 + w2.end.y * sy}
          stroke="rgb(var(--canvas-wall))"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
