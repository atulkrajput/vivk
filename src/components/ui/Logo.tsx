import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <Image
        src="/vivk_logo.png"
        alt="VIVK"
        width={247}
        height={85}
        className="h-[85px] w-auto"
        priority
      />
    </div>
  )
}
