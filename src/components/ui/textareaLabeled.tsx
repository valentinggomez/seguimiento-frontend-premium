import { TextareaHTMLAttributes } from "react"

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helper?: string
}

export function TextareaLabeled({ label, helper, ...props }: Props) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <textarea
        {...props}
        className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring focus:border-blue-500"
      />
      {helper && <p className="text-xs text-muted-foreground italic">{helper}</p>}
    </div>
  )
}
