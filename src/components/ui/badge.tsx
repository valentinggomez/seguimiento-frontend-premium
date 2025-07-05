// src/components/ui/badge.tsx

import React from 'react'
import clsx from 'clsx'

export function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-block px-2 py-1 text-xs font-semibold text-white rounded-full',
        className
      )}
    >
      {children}
    </span>
  )
}
