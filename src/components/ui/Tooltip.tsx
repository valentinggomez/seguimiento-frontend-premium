// src/components/ui/tooltip.tsx
"use client"

import * as RadixTooltip from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

export const TooltipProvider = RadixTooltip.Provider
export const TooltipTrigger = RadixTooltip.Trigger
export const TooltipContent = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>) => (
  <RadixTooltip.Portal>
    <RadixTooltip.Content
      className={cn(
        "z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-fade-in",
        className
      )}
      sideOffset={8}
      {...props}
    />
  </RadixTooltip.Portal>
)

export const Tooltip = RadixTooltip.Root
