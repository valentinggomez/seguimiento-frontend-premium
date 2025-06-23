import { motion } from 'framer-motion'

export function AnimatedSpinner() {
  return (
    <motion.div
      className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"
      initial={{ scale: 0.8 }}
      animate={{ scale: [0.8, 1, 0.8] }}
      transition={{ duration: 1.2, repeat: Infinity }}
    />
  )
}
