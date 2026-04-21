import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold font-['Nunito'] ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] active:translate-y-0.5 active:shadow-[1px_1px_0_0_#0F172A]",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] active:translate-y-0.5",
        outline:
          "border-2 border-[#0F172A] bg-background shadow-[3px_3px_0_0_#0F172A] hover:bg-accent hover:text-accent-foreground hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#0F172A] active:translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-[#0F172A]/30 shadow-[2px_2px_0_0_rgba(15,23,42,0.2)] hover:-translate-y-0.5",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
