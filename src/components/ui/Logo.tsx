import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Logo({ 
  size = 'md', 
  className = ''
}: LogoProps) {
  const sizeMap = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
  }

  const imgSize = sizeMap[size]

  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src="/vivk_logo.png"
        alt="VIVK"
        width={imgSize}
        height={imgSize}
        className="object-contain"
        priority
      />
    </div>
  )
}
