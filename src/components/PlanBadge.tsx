import { memo } from 'react'
import { Crown, Zap, Sparkles } from 'lucide-react'
import { usePlan } from '../hooks/usePlan'

interface PlanBadgeProps {
  /** Size variant */
  size?: 'sm' | 'md'
  /** Show icon */
  showIcon?: boolean
  className?: string
}

const PLAN_CONFIG = {
  founding: {
    label: 'Founding',
    icon: Crown,
    style: {
      background: 'linear-gradient(135deg, #1a0533, #2d0a5e)',
      color: '#F6D860',
      border: '1px solid rgba(246,216,96,0.3)',
    },
  },
  pro: {
    label: 'Pro',
    icon: Zap,
    style: {
      background: 'linear-gradient(135deg, #7e22ce, #9333ea)',
      color: '#ffffff',
      border: '1px solid rgba(255,255,255,0.15)',
    },
  },
  free: {
    label: 'Free',
    icon: Sparkles,
    style: {
      background: '#F3F4F6',
      color: '#6B7280',
      border: '1px solid #E5E7EB',
    },
  },
}

const PlanBadge = memo(function PlanBadge({ size = 'sm', showIcon = true, className = '' }: PlanBadgeProps) {
  const { plan } = usePlan()
  const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.free
  const Icon = config.icon

  const sizeStyles =
    size === 'sm'
      ? { fontSize: 10, padding: '2px 7px', gap: 3, iconSize: 10, borderRadius: 99 }
      : { fontSize: 12, padding: '3px 10px', gap: 4, iconSize: 12, borderRadius: 99 }

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wide select-none ${className}`}
      style={{
        ...config.style,
        fontSize: sizeStyles.fontSize,
        padding: sizeStyles.padding,
        gap: sizeStyles.gap,
        borderRadius: sizeStyles.borderRadius,
      }}
    >
      {showIcon && <Icon style={{ width: sizeStyles.iconSize, height: sizeStyles.iconSize, flexShrink: 0 }} />}
      {config.label}
    </span>
  )
})

export default PlanBadge
