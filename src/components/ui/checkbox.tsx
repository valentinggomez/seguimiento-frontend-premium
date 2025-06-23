import { InputHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
}

export function Checkbox({ className, checked = false, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      className={cn(
        "h-4 w-4 rounded border-gray-300 text-[#003466] focus:ring-[#003466]",
        className
      )}
      {...props}
    />
  )
}
