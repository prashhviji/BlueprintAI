"use client";

import * as React from "react";
import { Sparkle } from "@/components/icons";
import { useEditor } from "@/lib/store/editor";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import type { PlanIR } from "@/lib/schema/plan";
import type { PlanSpec, SolvedPlan } from "@/lib/solver/solver";
import type { BoqResult } from "@/lib/boq/engine";

const EXAMPLES = [
  "2BHK in Anand, 8×11m plot, north-facing entry, ₹24L budget",
  "3BHK on 12×10m plot, east-facing, ₹35L",
  "1BHK studio, 6×8m, balcony",
  "Compact 2BHK on 30×35 ft plot",
  "Luxury 4BHK villa, 14×16m, with study and store",
  "3BHK on 1500 sqft, north-facing, with puja room",
];

export function HeroPrompt() {
  const setLoading      = useEditor((s) => s.setLoading);
  const setLoadPhase    = useEditor((s) => s.setLoadPhase);
  const setStatus       = useEditor((s) => s.setStatus);
  const setError        = useEditor((s) => s.setError);
  const setActiveFloor  = useEditor((s) => s.setActiveFloorPlan);
  const loading         = useEditor((s) => s.loading);
  const { toast } = useToast();
  const [text, setText] = React.useState("");
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    taRef.current?.focus();
  }, []);

  const generate = async () => {
    const t = text.trim() || EXAMPLES[0]!;
    if (loading) return;
    setLoading(true);
    setError(null);
    setStatus({ kind: "gen", text: "Generating plan…" });
    setLoadPhase(0);
    const phaseT = [
      setTimeout(() => setLoadPhase(1), 1200),
      setTimeout(() => setLoadPhase(2), 2400),
      setTimeout(() => setLoadPhase(3), 3300),
      setTimeout(() => setLoadPhase(4), 4000),
    ];
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: t }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as {
        spec: PlanSpec;
        plan: SolvedPlan;
        planIR: PlanIR;
        boq: BoqResult | null;
        source?: string;
      };
      setActiveFloor({ spec: data.spec, plan: data.plan, planIR: data.planIR, boq: data.boq });
      setStatus({ kind: "ok", text: `Plan generated · ${data.source ?? "ok"}` });
    } catch (e) {
      setError((e as Error).message);
      setStatus({ kind: "err", text: "Generation failed" });
      toast("Generation failed", { kind: "error", body: (e as Error).message });
    } finally {
      phaseT.forEach(clearTimeout);
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 surface-canvas overflow-auto animate-fade-in">
      {/* Soft accent ambient — single radial, low alpha */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 30%, var(--accent-soft) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-2xl mx-auto px-6 pt-20 pb-12 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 mono text-xs text-accent border border-[var(--accent-edge)] surface-2 rounded mb-6">
          <Sparkle size={12} /> AI floor-plan generator
        </div>

        <h1 className="display text-2xl md:text-3xl font-semibold tracking-tight text-balance leading-[1.1] text-primary">
          Describe the home you want to build.
        </h1>
        <p className="mt-3 text-sm text-secondary max-w-md">
          BHK count, plot dimensions, facing, budget, special rooms — anything goes.
          We&apos;ll lay it out, render it in 3D, and price it in INR.
        </p>

        <div className="mt-10 w-full surface-1 border border-border-default rounded-lg shadow-lg overflow-hidden">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void generate();
            }}
            disabled={loading}
            placeholder='e.g. "3BHK on 1500 sqft, north-facing, with puja room and store"'
            className="w-full h-32 resize-none px-4 py-3 text-md text-primary placeholder:text-tertiary bg-transparent outline-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2 surface-2">
            <span className="mono text-2xs text-tertiary">⌘ ↵ to generate</span>
            <Button variant="primary" size="md" onClick={generate} disabled={loading}>
              {loading ? "Generating…" : "Generate plan"}
            </Button>
          </div>
        </div>

        <div className="mt-6 w-full">
          <div className="micro-label mb-2 text-left">Try one of these</div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                disabled={loading}
                className="px-2.5 py-1 text-xs surface-2 border border-border-subtle rounded text-secondary hover:text-primary hover:border-border-default mono"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-2 w-full text-left">
          <Step n="1" title="Editable 2D">Click any room to rename, resize, change zone.</Step>
          <Step n="2" title="Walk-through 3D">Toggle to 3D or split — orbit or first-person.</Step>
          <Step n="3" title="Live BOQ">INR estimate updates the moment you edit.</Step>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="surface-1 border border-border-subtle rounded p-3">
      <div className="mono text-2xs text-tertiary mb-1">STEP {n}</div>
      <div className="text-sm font-medium text-primary">{title}</div>
      <div className="text-xs text-secondary mt-1">{children}</div>
    </div>
  );
}
