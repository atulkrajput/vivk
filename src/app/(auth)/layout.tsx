import { Suspense } from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-vivk-bg relative overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-vivk-cyan/[0.05] rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-vivk-violet/[0.05] rounded-full blur-[150px] translate-x-1/3 translate-y-1/3"></div>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-vivk-gradient flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        </div>
      }>
        {children}
      </Suspense>
    </div>
  )
}
