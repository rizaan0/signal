"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LiquidGlass, SKY_BG, SKY_BG_DARK } from "@/components/ui/liquid-glass";

const glassButtonVariants = cva(
          "relative z-[1] inline-flex cursor-pointer items-center justify-center border-0 bg-transparent hover:bg-transparent active:bg-transparent text-primary outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--accent)]",
  {
    variants: {
      size: {
        default: "px-6 py-3.5 text-base font-medium",
        sm: "min-h-10 px-4 text-sm font-medium",
        lg: "px-8 py-4 text-lg font-medium",
        icon: "size-10 shrink-0",
        nav: "min-h-10 w-full justify-start gap-3 px-3 text-sm",
        sidebar: "min-h-11 w-full justify-start gap-3 px-4 text-sm font-semibold",
        pill: "min-h-10 gap-1.5 px-2.5 text-xs",
        profile: "min-h-14 w-full justify-start gap-3 px-2 py-2 text-start text-sm",
      },
      tone: {
        glass: "text-primary",
        inverse: "!text-white font-semibold",
        danger: "text-danger",
      },
    },
    defaultVariants: {
      size: "default",
      tone: "glass",
    },
  },
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean;
  wrapperClassName?: string;
  radius?: string;
  scale?: number;
  tapScale?: number;
  magnetic?: boolean;
  dark?: boolean;
  background?: string;
  contentClassName?: string;
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      children,
      size,
      tone,
      asChild = false,
      wrapperClassName,
      radius = "9999px",
      scale = 0.4,
      tapScale = 1.04,
      magnetic = true,
      dark = tone === "inverse",
      background,
      contentClassName,
      disabled,
      ...props
    },
    ref,
  ) => {
    const interactive = !disabled && magnetic;
    const fill =
      background ??
      (tone === "inverse" ? SKY_BG_DARK : SKY_BG);
    const innerClassName = cn(glassButtonVariants({ size, tone }), contentClassName, className);
    const control =
      asChild && React.isValidElement<{ className?: string }>(children)
        ? React.cloneElement(children, {
            className: cn(innerClassName, children.props.className),
          } as never)
        : (
            <button
              ref={ref}
              type={props.type ?? "button"}
              disabled={disabled}
              className={innerClassName}
              {...props}
            >
              {children}
            </button>
          );

    return (
      <LiquidGlass
        scale={scale}
        radius={radius}
        hoverable={!disabled}
        dark={dark}
        static={!interactive}
        background={disabled ? "var(--surface)" : fill}
        whileTap={interactive ? { scale: tapScale } : undefined}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className={cn(
          "inline-flex",
          size === "nav" || size === "sidebar" || size === "profile" ? "w-full" : undefined,
          disabled && "opacity-40",
          !disabled && "cursor-pointer",
          wrapperClassName,
        )}
      >
        {control}
      </LiquidGlass>
    );
  },
);
GlassButton.displayName = "GlassButton";

export const LiquidGlassButton = GlassButton;
export { GlassButton, glassButtonVariants };
