'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-vivk-blue text-white text-sm font-medium hover:opacity-90"
    >
      <Printer className="w-4 h-4" />
      Print / Save as PDF
    </button>
  )
}
