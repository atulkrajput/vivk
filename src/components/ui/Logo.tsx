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
        width={177}
        height={61}
        className="h-[61px] w-auto"
        priority
      />
    </div>
  )
}
