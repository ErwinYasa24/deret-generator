import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}

export function Card({ title, children, className = '', actions }: CardProps) {
  const showHeader = Boolean(title) || Boolean(actions)

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        ${className}
      `}
    >
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
          {title ? <h3 className="font-semibold text-gray-900">{title}</h3> : <span />}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
