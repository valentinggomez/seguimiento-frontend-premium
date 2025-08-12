import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  /** Nuevo callback booleano */
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      indeterminate = false,
      onCheckedChange,
      disabled,
      onChange,          // <- mantenemos compatibilidad
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = Boolean(indeterminate) && !checked
      }
    }, [indeterminate, checked])

    return (
      <input
        ref={innerRef}
        type="checkbox"
        role="checkbox"
        aria-checked={
          indeterminate ? "mixed" : checked !== undefined ? checked : undefined
        }
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(e) => {
          const v = e.currentTarget.checked
          onCheckedChange?.(v) // nuevo
          onChange?.(e)        // viejo
        }}
        className={cn(
          "h-4 w-4 appearance-none rounded border",
          "border-gray-300 outline-none",
          "checked:border-transparent checked:bg-[#003466]",
          "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#003466]/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"