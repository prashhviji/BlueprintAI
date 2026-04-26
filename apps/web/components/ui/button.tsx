"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Per spec §6.1:
 *  - Sizing: xs(24)/sm(28)/md(32)/lg(36) only — no xl
 *  - Three variants: primary, secondary, ghost — plus destructive + icon-only
 *  - Pressed state: translateY(0.5px), no scale
 *  - Focus: 2px outline accent at 50% alpha, offset 2px
 *  - Radius: --radius-md (4px)
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded",
    "font-medium select-none",
    "transition-colors duration-fast ease-out",
    "focus-visible:outline-none focus-visible:[outline:2px_solid_rgba(var(--accent),0.5)] focus-visible:[outline-offset:2px]",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:translate-y-[0.5px]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed",
        secondary:
          "bg-surface-3 text-primary border border-border-default hover:border-border-strong",
        ghost:
          "bg-transparent text-secondary hover:bg-surface-2 hover:text-primary",
        destructive:
          "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
        link:
          "text-accent underline-offset-4 hover:underline px-0",
      },
      size: {
        xs: "h-6  px-2  text-xs   [&_svg]:size-[12px]",
        sm: "h-7  px-3  text-xs   [&_svg]:size-[13px]",
        md: "h-8  px-4  text-sm   [&_svg]:size-4",
        lg: "h-9  px-5  text-sm   [&_svg]:size-[18px]",
        icon:    "h-8 w-8 [&_svg]:size-4",
        "icon-sm":"h-7 w-7 [&_svg]:size-[14px]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

/**
 * ToolButton — the toolbar's signature component (§6.1 final paragraph).
 * Active state: accent-soft fill + 2px bottom accent border.
 */
export interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}
export const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(
  ({ active, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-active={active || undefined}
      className={cn(
        "relative inline-flex items-center justify-center h-8 w-8 rounded-sm",
        "text-secondary hover:text-primary hover:bg-surface-2",
        "transition-colors duration-fast ease-out",
        "focus-visible:outline-none focus-visible:[outline:2px_solid_rgba(var(--accent),0.5)] focus-visible:[outline-offset:1px]",
        "disabled:opacity-40 disabled:pointer-events-none",
        "[&_svg]:size-4",
        active && [
          "text-accent bg-[var(--accent-soft)]",
          "after:content-[''] after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-accent",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
ToolButton.displayName = "ToolButton";

export { buttonVariants };
