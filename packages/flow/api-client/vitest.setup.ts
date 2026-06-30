import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { resetDemoControls } from './src/demo-controls'

// Unmount React trees and clear demo-control state between tests.
afterEach(() => {
  cleanup()
  resetDemoControls()
})
