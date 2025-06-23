import { cn } from "@/lib/utils"
import { HTMLAttributes } from "react"

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-white shadow-sm", className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />
}