"use client";

import { forwardRef } from "react";
import { LiquidGlass } from "./liquid-glass";
import { SKY_BG } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

interface LiquidGlassButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  /** Class on the inner <button> element — control sizing/typography here. */
  className?: string;
  /** Class on the outer LiquidGlass wrapper. */
  wrapperClassName?: string;
  radius?: string;
  scale?: number;
  tapScale?: number;
  background?: string;
  type?: "button" | "submit" | "reset";
  title?: string;
  /** Magnetic pull / hover scale / press scale. Set false for static glass surface. */
  magnetic?: boolean;
  dark?: boolean;
}

export const LiquidGlassButton = forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(function LiquidGlassButton(
  {
    onClick,
    disabled = false,
    children,
    className,
    wrapperClassName,
    radius = "9999px",
    scale = 0.4,
    tapScale = 1.04,
    background = SKY_BG,
    type = "button",
    title,
    magnetic = true,
    dark = false,
  },
  ref,
) {
  const interactive = !disabled && magnetic;
  return (
    <LiquidGlass
      scale={scale}
      radius={radius}
      hoverable={!disabled}
      dark={dark}
      static={!interactive}
      background={disabled ? "#e2e8f0" : background}
      whileTap={interactive ? { scale: tapScale } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={cn("inline-flex", !disabled && "cursor-pointer", wrapperClassName)}
    >
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          "flex items-center justify-center text-white",
          !disabled && "cursor-pointer",
          className,
        )}
      >
        {children}
      </button>
    </LiquidGlass>
  );
});
