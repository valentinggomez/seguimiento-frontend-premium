'use client'
import { AnimatedSpinner } from './AnimatedSpinner'

export default function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <AnimatedSpinner />
    </div>
  )
}
