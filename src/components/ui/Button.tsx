import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vivk-blue/30 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-vivk-blue text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-vivk-blue/20 active:translate-y-px rounded-[12px]': variant === 'primary',
            'bg-white text-vivk-navy border border-slate-200 hover:bg-vivk-bg hover:border-slate-300 active:translate-y-px rounded-[12px]': variant === 'secondary',
            'border border-slate-200 bg-transparent text-vivk-navy hover:bg-vivk-bg rounded-[12px]': variant === 'outline',
            'text-vivk-navy hover:bg-slate-100 rounded-[12px]': variant === 'ghost',
            'bg-vivk-gradient text-white hover:opacity-90 hover:shadow-lg hover:shadow-vivk-blue/25 hover:-translate-y-0.5 active:translate-y-0 rounded-[12px]': variant === 'gradient',
            'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20 active:translate-y-px rounded-[12px]': variant === 'destructive',
          },
          {
            'h-8 px-3 text-xs gap-1.5': size === 'sm',
            'h-10 px-5 text-sm gap-2': size === 'md',
            'h-12 px-7 text-base gap-2.5': size === 'lg',
          },
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
