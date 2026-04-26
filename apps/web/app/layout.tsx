import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPaletteProvider } from "@/components/ui/command-palette";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "BluePrintAI — Draw faster. Quote sharper.",
  description:
    "Describe your project in plain English. Get an editable 2D floor plan, a 3D walk-through, and a fully detailed Bill of Quantities in INR.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${mono.variable} ${display.variable}`}>
      <body className="bg-base text-primary antialiased">
        <ToastProvider>
          <CommandPaletteProvider>{children}</CommandPaletteProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
