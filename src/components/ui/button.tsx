// src/components/ui/button.tsx
import { cva, VariantProps } from "class-variance-authority"
import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[#003466] text-white hover:bg-[#002244]",
        outline: "border border-gray-300 text-gray-800 hover:bg-gray-100",
        ghost: "bg-transparent hover:bg-gray-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"
