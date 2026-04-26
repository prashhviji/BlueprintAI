import { NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import * as React from "react";
import { PlanIR } from "@/lib/schema/plan";
import { computeBoq } from "@/lib/boq/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ plan: PlanIR });

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#18181B" },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 8 },
  meta: { fontSize: 9, color: "#52525B", marginBottom: 12 },
  th: { fontSize: 9, fontWeight: 700, color: "#52525B", textTransform: "uppercase" },
  td: { fontSize: 9 },
  row: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: "#E4E4E7" },
  rowH: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#A1A1AA" },
  total: { fontSize: 14, fontWeight: 700, marginTop: 12 },
  cellName: { width: "55%" },
  cellQty:  { width: "20%", textAlign: "right" },
  cellAmt:  { width: "25%", textAlign: "right" },
  hr: { borderBottomWidth: 0.5, borderBottomColor: "#A1A1AA", marginVertical: 8 },
});

const fmt = (n: number) => "₹ " + Math.round(n).toLocaleString("en-IN");

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request: " + (e as Error).message },
      { status: 400 },
    );
  }

  const boq = await computeBoq(body.plan);
  const f = body.plan.floors[0]!;
  const built = f.rooms.reduce((s, r) => {
    const xs = r.polygon.map((p) => p.x);
    const ys = r.polygon.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    return s + (w * h) / 1e6;
  }, 0);

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, body.plan.meta.name || "BluePrintAI Project"),
      React.createElement(Text, { style: styles.meta },
        `Plot: ${body.plan.meta.plot_width_mm}×${body.plan.meta.plot_depth_mm} mm  ·  Facing: ${body.plan.meta.facing}  ·  ${body.plan.meta.city}  ·  Built-up: ${built.toFixed(1)} sqm`,
      ),

      React.createElement(Text, { style: styles.h2 }, "Bill of Quantities — totals"),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: { ...styles.td, ...styles.cellName } }, "Subtotal"),
        React.createElement(Text, { style: { ...styles.td, ...styles.cellAmt } }, fmt(boq.subtotal_inr)),
      ),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: { ...styles.td, ...styles.cellName } }, `Contingency · ${boq.contingency_pct}%`),
        React.createElement(Text, { style: { ...styles.td, ...styles.cellAmt } }, fmt(boq.contingency_inr)),
      ),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: { ...styles.td, ...styles.cellName } }, `GST · ${boq.gst_pct}%`),
        React.createElement(Text, { style: { ...styles.td, ...styles.cellAmt } }, fmt(boq.gst_inr)),
      ),
      React.createElement(Text, { style: styles.total }, `Grand total: ${fmt(boq.grand_total_inr)}`),

      React.createElement(Text, { style: styles.h2 }, "By category"),
      ...Object.entries(boq.byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) =>
          React.createElement(View, { style: styles.row, key: k },
            React.createElement(Text, { style: { ...styles.td, ...styles.cellName } }, k.replace(/_/g, " ")),
            React.createElement(Text, { style: { ...styles.td, ...styles.cellAmt } }, fmt(v)),
          )
        ),

      React.createElement(Text, { style: styles.h2 }, "Line items"),
      React.createElement(View, { style: styles.rowH },
        React.createElement(Text, { style: { ...styles.th, ...styles.cellName } }, "Item"),
        React.createElement(Text, { style: { ...styles.th, ...styles.cellQty } }, "Qty"),
        React.createElement(Text, { style: { ...styles.th, ...styles.cellAmt } }, "Amount"),
      ),
      ...boq.lines.slice(0, 80).map((l, i) =>
        React.createElement(View, { style: styles.row, key: i },
          React.createElement(Text, { style: { ...styles.td, ...styles.cellName } }, l.display_name),
          React.createElement(Text, { style: { ...styles.td, ...styles.cellQty } }, `${l.quantity.toFixed(2)} ${l.unit}`),
          React.createElement(Text, { style: { ...styles.td, ...styles.cellAmt } }, fmt(l.amount_inr)),
        )
      ),
    ),
  );

  const buffer = await renderToBuffer(doc as unknown as Parameters<typeof renderToBuffer>[0]);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${body.plan.meta.name || "plan"}-BOQ.pdf"`,
    },
  });
}
