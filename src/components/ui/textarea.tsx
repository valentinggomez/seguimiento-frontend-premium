// src/components/ui/textarea.tsx

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helper?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helper, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium">{label}</label>}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            className
          )}
          ref={ref}
          {...props}
        />
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
