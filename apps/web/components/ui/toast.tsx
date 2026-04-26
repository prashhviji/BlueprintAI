"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Per spec §6.7:
 *  - Top-right, stacked
 *  - 320px wide, --radius-md, surface-2
 *  - Accent-colored 2px LEFT border for kind
 *  - NO icons (border carries meaning)
 *  - Auto-dismiss: 4s info, 6s success, never errors
 *  - One-line title + optional one-line body
 */
export type ToastKind = "info" | "warning" | "error" | "success";
export type ToastItem = { id: string; title: string; body?: string; kind: ToastKind };

type Ctx = {
  toast: (titleOrBoth: string, kindOrBody?: ToastKind | { kind?: ToastKind; body?: string }) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const v = React.useContext(ToastCtx);
  if (!v) return { toast: () => {} };
  return v;
}

const KIND_BORDER: Record<ToastKind, string> = {
  info:    "border-l-accent",
  success: "border-l-success",
  warning: "border-l-warning",
  error:   "border-l-danger",
};

const KIND_TIMEOUT_MS: Record<ToastKind, number> = {
  info:    4000,
  success: 6000,
  warning: 8000,
  error:   0, // never
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback<Ctx["toast"]>((titleOrBoth, kindOrBody) => {
    const id = Math.random().toString(36).slice(2, 9);
    let kind: ToastKind = "info";
    let body: string | undefined;
    if (typeof kindOrBody === "string") kind = kindOrBody;
    else if (kindOrBody) {
      kind = kindOrBody.kind ?? "info";
      body = kindOrBody.body;
    }
    setItems((s) => [...s, { id, title: titleOrBoth, body, kind }]);
    const ttl = KIND_TIMEOUT_MS[kind];
    if (ttl > 0) {
      setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), ttl);
    }
  }, []);

  const dismiss = (id: string) => setItems((s) => s.filter((t) => t.id !== id));

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[120] flex flex-col gap-2 pointer-events-none w-[320px]">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto rounded bg-surface-2 border border-border-default border-l-2 shadow-md",
              "px-3 py-2 animate-fade-in-up",
              KIND_BORDER[t.kind],
            )}
            role={t.kind === "error" ? "alert" : "status"}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-primary font-medium leading-snug truncate">{t.title}</p>
                {t.body && <p className="text-xs text-secondary mt-0.5 leading-snug">{t.body}</p>}
              </div>
              {t.kind === "error" && (
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-tertiary hover:text-primary text-xs px-1 -mr-1 mono"
                  aria-label="Dismiss"
                >×</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
