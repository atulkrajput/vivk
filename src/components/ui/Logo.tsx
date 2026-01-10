import Image from 'next/image'

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
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto', 
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto'
  }

  const logoSrc = {
    default: '/logo.svg',
    white: '/logo_white.svg',
    icon: '/favicon.svg'
  }

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={logoSrc[variant]}
        alt="VIVK Logo"
        width={32}
        height={32}
        className={sizeClasses[size]}
        priority
      />
      {showText && (
        <>
          <span className="text-2xl font-bold gradient-text ml-2">VIVK</span>
          <span className="ml-2 text-sm text-gray-600 hidden sm:inline">
            Virtual Intelligent Versatile Knowledge
          </span>
        </>
      )}
    </div>
  )
}