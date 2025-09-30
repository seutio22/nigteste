import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface FloatingCardProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: 'fast' | 'normal' | 'slow'
}

export function FloatingCard({ 
  children, 
  className = '', 
  delay = 0, 
  duration = 'normal' 
}: FloatingCardProps) {
  const durationClass = {
    fast: 'animate-float-fast',
    normal: 'animate-float',
    slow: 'animate-float-slow'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`glass-card p-6 ${durationClass[duration]} ${className}`}
    >
      {children}
    </motion.div>
  )
}
