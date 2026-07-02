import '@signalops/overfit-ui/styles.css'
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { AppShell } from './components/AppShell'

export const metadata: Metadata = {
  title: 'SignalOps — Variant C (Overfit)',
  description: 'Operational signals dashboard. Overfit variant: over-engineered internals, identical product.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
