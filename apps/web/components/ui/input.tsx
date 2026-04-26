import * as React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Per spec §6.2:
 *  - 32px height
 *  - 1px border, focus → accent
 *  - Background: --bg-surface-3
 *  - Padding: 0 var(--space-3)
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Right-side suffix (mm, °, ₹) rendered in mono tertiary */
  suffix?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, suffix, ...props }, ref) => {
    if (suffix) {
      return (
        <div className={cn(
          "flex h-8 items-center rounded bg-surface-3 border border-border-default",
          "focus-within:border-accent focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]",
          "transition-colors duration-fast ease-out",
          className,
        )}>
          <input
            type={type}
            ref={ref}
            className="flex-1 bg-transparent px-3 text-sm text-primary placeholder:text-tertiary placeholder:opacity-70 focus:outline-none disabled:opacity-50 tabular-nums"
            {...props}
          />
          <span className="mono text-xs text-tertiary px-2 select-none">{suffix}</span>
        </div>
      );
    }
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-8 w-full rounded bg-surface-3 border border-border-default",
          "px-3 text-sm text-primary placeholder:text-tertiary placeholder:opacity-70",
          "focus:outline-none focus:border-accent focus:[box-shadow:0_0_0_3px_var(--accent-soft)]",
          "transition-colors duration-fast ease-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

/**
 * Numeric input with arrow steppers — non-negotiable for an architect tool (§6.2).
 */
export type NumericInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
};
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, step = 1, min, max, suffix, className, ...props }, ref) => {
    const clamp = (n: number) => {
      if (min != null && n < min) return min;
      if (max != null && n > max) return max;
      return n;
    };
    return (
      <div className={cn(
        "flex h-8 items-center rounded bg-surface-3 border border-border-default",
        "focus-within:border-accent focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]",
        "transition-colors duration-fast ease-out",
        className,
      )}>
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(clamp(v));
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp")   { e.preventDefault(); onChange(clamp(value + step)); }
            if (e.key === "ArrowDown") { e.preventDefault(); onChange(clamp(value - step)); }
          }}
          step={step}
          className="flex-1 min-w-0 bg-transparent px-3 text-sm text-primary placeholder:text-tertiary focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          {...props}
        />
        {suffix && <span className="mono text-xs text-tertiary px-1 select-none">{suffix}</span>}
        <div className="flex flex-col h-full justify-center pr-1 gap-px">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange(clamp(value + step))}
            className="h-3 w-3 grid place-items-center text-tertiary hover:text-primary"
          ><ChevronUp className="size-3" /></button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange(clamp(value - step))}
            className="h-3 w-3 grid place-items-center text-tertiary hover:text-primary"
          ><ChevronDown className="size-3" /></button>
        </div>
      </div>
    );
  },
);
NumericInput.displayName = "NumericInput";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[64px] w-full rounded bg-surface-3 border border-border-default",
      "px-3 py-2 text-sm text-primary placeholder:text-tertiary placeholder:opacity-70",
      "focus:outline-none focus:border-accent focus:[box-shadow:0_0_0_3px_var(--accent-soft)]",
      "transition-colors duration-fast ease-out",
      "disabled:cursor-not-allowed disabled:opacity-50 resize-none leading-snug",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
