import { createFileRoute } from '@tanstack/react-router'
import { CompareScreen } from '../features/compare/CompareScreen'

export const Route = createFileRoute('/compare')({
  component: CompareScreen
})
