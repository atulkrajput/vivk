import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'default' | 'white' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showText?: boolean
}

export function Logo({ 
  variant = 'default', 
  size = 'md', 
  className = '',
  showText = true 
}: LogoProps) {
  const sizeMap = {
    sm: { img: 24, text: 'text-lg' },
    md: { img: 32, text: 'text-xl' },
    lg: { img: 40, text: 'text-2xl' },
    xl: { img: 48, text: 'text-3xl' },
  }

  const { img, text } = sizeMap[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Image
        src="/vivk_logo.png"
        alt="VIVK"
        width={img}
        height={img}
        className="object-contain"
        priority
      />
      {showText && (
        <span className={cn(
          text,
          'font-bold tracking-tight',
          variant === 'white' ? 'text-white' : 'vivk-gradient-text'
        )}>
          VIVK
        </span>
      )}
    </div>
  )
}
