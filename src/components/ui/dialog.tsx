// src/components/ui/dialog.tsx
"use client"

import * as RadixDialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogTitle = RadixDialog.Title
export const DialogDescription = RadixDialog.Description

export function DialogContent({
  children,
  className,
  ...props
}: {
  children: React.ReactNode
  className?: string
} & React.ComponentPropsWithoutRef<typeof RadixDialog.Content>) {
  return (
    <RadixDialog.Portal>
      {/* Fondo desenfocado */}
      <RadixDialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

      {/* Contenido más arriba */}
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl",
          className
        )}
        {...props}
      >
        {children}

        {/* Botón cerrar tipo flotante */}
        <RadixDialog.Close className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow hover:bg-gray-100 transition">
          <X className="h-5 w-5 text-gray-700" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}
// Encabezado institucional
export function DialogHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-4 text-center sm:text-left", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Footer institucional (opcional)
export function DialogFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}