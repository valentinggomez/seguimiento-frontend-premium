import { InputHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003466]",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"