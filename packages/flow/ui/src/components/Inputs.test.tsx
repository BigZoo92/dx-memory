import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SearchInput } from './Inputs'

describe('SearchInput', () => {
  it('keeps the label associated with the input when visually hidden', () => {
    render(<SearchInput label="Global search" value="" onChange={() => {}} hideLabel />)
    // getByLabelText resolves via the <label for> association — proves the topbar search
    // stays accessible even though the label is visually hidden (sr-only).
    expect(screen.getByLabelText('Global search')).toBeTruthy()
  })

  it('emits the typed value', () => {
    const onChange = vi.fn()
    render(<SearchInput label="Search" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'latency' } })
    expect(onChange).toHaveBeenCalledWith('latency')
  })
})
