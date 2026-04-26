"use client";

import * as React from "react";
import { Search, Sparkle, Select, Wall, Door, Dimension } from "@/components/icons";

type Item = {
  ic: React.ReactNode;
  label: string;
  sc: string[];
  onAct?: () => void;
};

type Group = { title: string; items: Item[] };

type CommandCtx = {
  open: () => void;
  close: () => void;
  setHandler: (h: CommandHandler | null) => void;
};

export type CommandHandler = {
  onGenerate: (prompt: string) => void;
  onGenerateFloor: (prompt: string) => void;
  onSelectTool?: (id: string) => void;
};

const Ctx = React.createContext<CommandCtx | null>(null);

export function useCommand(): CommandCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useCommand must be used inside CommandPaletteProvider");
  return v;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const handlerRef = React.useRef<CommandHandler | null>(null);

  const setHandler = React.useCallback((h: CommandHandler | null) => {
    handlerRef.current = h;
  }, []);

  const value: CommandCtx = React.useMemo(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      setHandler,
    }),
    [setHandler],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && (
        <Palette
          handler={handlerRef.current}
          onClose={() => setIsOpen(false)}
        />
      )}
    </Ctx.Provider>
  );
}

function Palette({ handler, onClose }: { handler: CommandHandler | null; onClose: () => void }) {
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const isPrompt = q.trim().length > 0;

  const groups: Group[] = isPrompt
    ? [
        {
          title: "Generate",
          items: [
            {
              ic: <Sparkle />,
              label: `Replace floor: "${q}"`,
              sc: ["↵"],
              onAct: () => {
                handler?.onGenerate(q);
                onClose();
              },
            },
            {
              ic: <Sparkle />,
              label: `+ New floor: "${q}"`,
              sc: ["⌘", "↵"],
              onAct: () => {
                handler?.onGenerateFloor(q);
                onClose();
              },
            },
          ],
        },
      ]
    : [
        {
          title: "Generate",
          items: [
            {
              ic: <Sparkle />,
              label: "2BHK in Anand, 8×11m, north entry, ₹24L",
              sc: [],
              onAct: () => {
                handler?.onGenerate("2BHK in Anand, 8×11m plot, north entry, ₹24L budget");
                onClose();
              },
            },
            {
              ic: <Sparkle />,
              label: "3BHK on 12×10m plot, east-facing, ₹35L",
              sc: [],
              onAct: () => {
                handler?.onGenerate("3BHK on 12×10m plot, east-facing, ₹35L budget");
                onClose();
              },
            },
            {
              ic: <Sparkle />,
              label: "1BHK studio, 6×8m, ₹12L",
              sc: [],
              onAct: () => {
                handler?.onGenerate("1BHK studio, 6×8m, ₹12L budget");
                onClose();
              },
            },
          ],
        },
        {
          title: "Tools",
          items: [
            { ic: <Select />,    label: "Select tool",   sc: ["V"], onAct: () => handler?.onSelectTool?.("select") },
            { ic: <Wall />,      label: "Draw wall",     sc: ["W"], onAct: () => handler?.onSelectTool?.("wall") },
            { ic: <Door />,      label: "Place door",    sc: ["D"], onAct: () => handler?.onSelectTool?.("door") },
            { ic: <Dimension />, label: "Add dimension", sc: ["M"], onAct: () => handler?.onSelectTool?.("dimension") },
          ],
        },
      ];

  const allItems = groups.flatMap((g) => g.items);
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const it = allItems[sel];
      it?.onAct?.();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-start justify-center pt-[14vh] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[640px] bg-surface-2 border border-border-default rounded-xl shadow-xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border-subtle">
          <Search size={16} className="text-tertiary shrink-0" />
          <input
            autoFocus
            placeholder="Type a command, search, or describe a home to generate…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
            className="flex-1 bg-transparent border-none outline-none text-md text-primary placeholder:text-tertiary"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="max-h-[420px] overflow-auto">
          {groups.map((g, gi) => (
            <div key={gi} className="py-2 border-b border-border-subtle last:border-b-0">
              <div className="px-4 py-2 mono text-2xs uppercase tracking-wider text-tertiary font-medium">
                {g.title}
              </div>
              {g.items.map((it, ii) => {
                const idx =
                  groups.slice(0, gi).reduce((a, gg) => a + gg.items.length, 0) + ii;
                const selected = idx === sel;
                return (
                  <div
                    key={ii}
                    className={`relative flex items-center gap-3 h-9 px-4 cursor-default text-sm text-primary ${
                      selected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--accent-soft)]"
                    }`}
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => it.onAct?.()}
                  >
                    {selected && (
                      <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-accent" />
                    )}
                    <span className="text-secondary">{it.ic}</span>
                    <span className="flex-1">{it.label}</span>
                    {it.sc.length > 0 && (
                      <span className="inline-flex gap-0.5">
                        {it.sc.map((k, i) => (
                          <Kbd key={i}>{k}</Kbd>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center mono text-2xs px-[5px] py-px border border-border-default rounded-sm text-secondary bg-surface-2 min-w-[16px] h-4">
      {children}
    </span>
  );
}
