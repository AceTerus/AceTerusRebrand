import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 px-3 py-0.5 text-xs font-bold font-['Nunito'] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[#0F172A]/30 bg-primary text-primary-foreground shadow-[2px_2px_0_0_rgba(15,23,42,0.2)]",
        secondary:
          "border-[#0F172A]/20 bg-secondary text-secondary-foreground",
        destructive:
          "border-[#0F172A]/30 bg-destructive text-destructive-foreground shadow-[2px_2px_0_0_rgba(15,23,42,0.2)]",
        outline: "border-[#0F172A]/20 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
