'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignalsPage } from '@signalops/overfit-feature-signals'

function SignalsRoute() {
  const params = useSearchParams()
  return <SignalsPage initialSearch={params.get('search') ?? ''} />
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignalsRoute />
    </Suspense>
  )
}
