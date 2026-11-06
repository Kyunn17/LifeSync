import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-label-lg text-label-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(13,122,83,0.18)] hover:bg-primary",
        secondary:
          "bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed",
        outline:
          "border border-outline-variant/40 bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
        ghost:
          "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
        destructive:
          "bg-error text-on-error hover:opacity-90",
      },
      size: {
        default: "px-4 py-2.5",
        sm: "px-3 py-1.5 text-label-md rounded-lg",
        lg: "px-6 py-3.5 text-label-lg rounded-xl",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

