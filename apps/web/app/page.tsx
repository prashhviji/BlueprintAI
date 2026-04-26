import Link from "next/link";
import { ArrowRight, Sparkles, MousePointer2, Box, FileSpreadsheet, MessageSquareText, Ruler, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Hero />
      <HowItWorks />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle backdrop-blur bg-base/80">
      <div className="container flex h-12 items-center justify-between">
        <Link href="/" className="display font-semibold inline-flex items-baseline" style={{ letterSpacing: "-0.02em" }}>
          BluePrint<span className="text-accent font-bold ml-px" style={{ fontSize: "60%" }}>AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-secondary">
          <a href="#how"      className="hover:text-primary transition-colors">How it works</a>
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#pricing"  className="hover:text-primary transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost"   size="sm" asChild><Link href="/dashboard">Dashboard</Link></Button>
          <Button variant="primary" size="sm" asChild><Link href="/project/new" className="gap-1.5">Start free <ArrowRight className="size-3.5" /></Link></Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mkt-ambient overflow-hidden">
      <div className="container relative pt-24 pb-28 max-w-5xl">
        <div className="inline-flex items-center gap-1.5 px-2 py-1 mono text-xs text-accent border border-[var(--accent-edge)] surface-2 rounded">
          <Sparkles className="size-3" />
          For Indian architects, civil engineers, and builders
        </div>
        <h1 className="display mt-6 text-3xl md:text-4xl font-semibold tracking-tight text-balance leading-[1.05]">
          Draw houses from a sentence.<br />
          <span className="text-accent">Quote them in rupees.</span>
        </h1>
        <p className="mt-6 text-md text-secondary max-w-2xl">
          BluePrintAI generates an editable 2D floor plan, an immersive 3D walk-through,
          and a fully detailed Bill of Quantities — in seconds. Built for the way Indian
          architects actually work.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Button size="lg" variant="primary" asChild className="gap-2">
            <Link href="/project/new">Generate a plan free <ArrowRight className="size-4" /></Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/dashboard">See how it works</Link>
          </Button>
        </div>
        <p className="mt-4 mono text-xs text-tertiary">No sign-up required. Demo mode runs entirely in your browser.</p>

        {/* Annotated mock */}
        <div className="mt-16 max-w-4xl">
          <Card surface={2} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 text-left space-y-3 border-r border-border-subtle">
                <div className="micro-label flex items-center gap-1.5">
                  <MessageSquareText className="size-3" /> You write
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  &ldquo;1200 sqft 3BHK on a 30×40 plot in Chennai, north-facing.
                  Master bedroom with attached bath, open kitchen, and a small puja room.&rdquo;
                </p>
                <div className="micro-label pt-2 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-accent" /> BluePrintAI delivers
                </div>
                <ul className="text-sm space-y-1.5 text-secondary">
                  <li className="flex items-center gap-2"><MousePointer2 className="size-3.5 text-accent" /> Editable 2D floor plan</li>
                  <li className="flex items-center gap-2"><Box className="size-3.5 text-accent" /> Walk-through 3D model</li>
                  <li className="flex items-center gap-2"><FileSpreadsheet className="size-3.5 text-accent" /> Itemised BOQ in ₹</li>
                  <li className="flex items-center gap-2"><Ruler className="size-3.5 text-accent" /> Live recompute on every edit</li>
                </ul>
              </div>
              <div className="p-6 surface-canvas grid place-items-center min-h-[280px]">
                <FakePlan />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function FakePlan() {
  return (
    <svg viewBox="0 0 240 180" className="w-full max-w-sm" aria-hidden="true">
      <defs>
        <pattern id="lp-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgb(var(--border-default))" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="240" height="180" fill="url(#lp-grid)" opacity="0.6" />
      <rect x="20" y="20" width="200" height="140" stroke="rgb(var(--canvas-wall))" strokeWidth="2.5" fill="none" />
      <line x1="120" y1="20" x2="120" y2="100" stroke="rgb(var(--canvas-wall))" strokeWidth="1.5" />
      <line x1="20"  y1="100" x2="220" y2="100" stroke="rgb(var(--canvas-wall))" strokeWidth="1.5" />
      <line x1="160" y1="100" x2="160" y2="160" stroke="rgb(var(--canvas-wall))" strokeWidth="1.5" />
      <rect x="20"  y="20"  width="100" height="80" fill="var(--accent-soft)" />
      <rect x="120" y="20"  width="100" height="80" fill="var(--accent-soft)" opacity="0.6" />
      <rect x="20"  y="100" width="140" height="60" fill="var(--accent-soft)" opacity="0.4" />
      <rect x="160" y="100" width="60"  height="60" fill="var(--accent-soft)" opacity="0.7" />
      <text x="70"  y="65" textAnchor="middle" fontFamily="var(--font-display)" fill="rgb(var(--fg-secondary))" fontSize="9">MASTER BR</text>
      <text x="170" y="65" textAnchor="middle" fontFamily="var(--font-display)" fill="rgb(var(--fg-secondary))" fontSize="9">BEDROOM 2</text>
      <text x="90"  y="135" textAnchor="middle" fontFamily="var(--font-display)" fill="rgb(var(--fg-secondary))" fontSize="9">LIVING / DINING</text>
      <text x="190" y="135" textAnchor="middle" fontFamily="var(--font-display)" fill="rgb(var(--fg-secondary))" fontSize="9">KITCHEN</text>
    </svg>
  );
}

function HowItWorks() {
  const steps = [
    { n: "1", title: "Describe it", body: "Type a brief in plain English. Plot size, BHK count, facing, city — anything.", icon: <MessageSquareText className="size-4" /> },
    { n: "2", title: "Edit live",   body: "Drag walls, swap doors, change finishes — in 2D. The BOQ re-derives instantly.", icon: <MousePointer2 className="size-4" /> },
    { n: "3", title: "Walk through",body: "Toggle to 3D for an immersive view before a single brick is laid.", icon: <Box className="size-4" /> },
    { n: "4", title: "Cost it out", body: "Itemised BOQ in INR — by category, by room, by line. Export to CSV, PDF, DXF.", icon: <FileSpreadsheet className="size-4" /> },
  ];
  return (
    <section id="how" className="container py-20 border-t border-border-subtle">
      <h2 className="display text-2xl font-semibold tracking-tight">From idea to estimate, in four steps.</h2>
      <p className="mt-3 text-secondary max-w-xl">No CAD experience needed. The hardest part is deciding what you want.</p>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s) => (
          <Card key={s.n} className="p-5">
            <div className="size-9 rounded grid place-items-center mb-3" style={{ background: "var(--accent-soft)" }}>
              <span className="text-accent">{s.icon}</span>
            </div>
            <div className="mono text-2xs text-tertiary mb-1">STEP {s.n}</div>
            <h3 className="text-base font-medium text-primary">{s.title}</h3>
            <p className="mt-2 text-sm text-secondary">{s.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { title: "Editable 2D canvas",     body: "Click anything, change anything. Walls, doors, windows, finishes, fixtures." },
    { title: "Real-time 3D",           body: "Konva-fast 2D paired with a Three.js extruded 3D view that updates as you edit." },
    { title: "Deterministic BOQ",      body: "Bricks, cement, sand, doors, windows, finishes, electrical, plumbing — all in INR." },
    { title: "Multi-floor",            body: "Layered floors with their own walls, openings, and rooms. Ready for G+1, G+2." },
    { title: "Plan IR exports",        body: "JSON for re-import, CSV for spreadsheets, PDF for clients, DXF for AutoCAD." },
    { title: "Built for India",        body: "Indian residential proportions, Vastu hints, INR pricing for South-metro markets." },
  ];
  return (
    <section id="features" className="container py-20 border-t border-border-subtle">
      <h2 className="display text-2xl font-semibold tracking-tight">Everything an architect needs.</h2>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {features.map((f) => (
          <Card key={f.title} className="p-5">
            <h3 className="text-sm font-medium text-primary inline-flex items-center gap-2"><Zap className="size-3.5 text-accent" /> {f.title}</h3>
            <p className="mt-2 text-sm text-secondary">{f.body}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="pricing" className="container py-20 border-t border-border-subtle">
      <Card className="p-12 md:p-16 text-center" surface={2}>
        <h2 className="display text-2xl md:text-3xl font-semibold tracking-tight">Start drafting in 30 seconds.</h2>
        <p className="mt-3 text-secondary max-w-xl mx-auto">No credit card. No CAD installs. Demo mode works without an LLM key.</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" variant="primary" asChild className="gap-2"><Link href="/project/new">Generate a plan <ArrowRight className="size-4" /></Link></Button>
          <Button size="lg" variant="secondary" asChild><Link href="/pricing">View pricing</Link></Button>
        </div>
      </Card>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border-subtle py-8 mt-auto">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-secondary">
          <span className="display font-semibold inline-flex items-baseline" style={{ letterSpacing: "-0.02em" }}>
            BluePrint<span className="text-accent font-bold ml-px" style={{ fontSize: "60%" }}>AI</span>
          </span>
          <span>·</span>
          <span className="mono text-xs text-tertiary">© {new Date().getFullYear()}</span>
        </div>
        <div className="mono text-xs text-tertiary">Made for the Indian construction industry.</div>
      </div>
    </footer>
  );
}
