import { SignalDetailPage } from '@signalops/overfit-feature-signal-detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SignalDetailPage id={id} />
}
