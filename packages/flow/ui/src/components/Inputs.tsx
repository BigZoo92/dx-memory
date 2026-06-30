import { useEffect, useId, useRef, type ChangeEvent } from 'react'
import { Icon } from './Icon'
import styles from './Inputs.module.css'

export type SelectOption = { value: string; label: string }

export type FilterSelectProps = {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

/** Labeled filter dropdown. The label is a real `<label>` tied to the select. */
export function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export type SearchInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Keep the label for screen readers but hide it visually (e.g. the compact topbar search). */
  hideLabel?: boolean
}

/** Search field with an icon and a "/" keyboard hint; the label is associated for a11y. */
export function SearchInput({ label, value, onChange, placeholder, hideLabel }: SearchInputProps) {
  const id = useId()
  return (
    <div className={styles.field}>
      <label className={hideLabel ? styles.srOnly : styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.searchBox}>
        <Icon name="search" size={15} className={styles.icon} />
        <input
          id={id}
          className={styles.searchInput}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={styles.kbd} aria-hidden="true">
          /
        </span>
      </div>
    </div>
  )
}

export type ToggleProps = {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** Feature-flag switch using `role="switch"` + `aria-checked`. */
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  const labelId = useId()
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleText}>
        <span className={styles.toggleLabel} id={labelId}>
          {label}
        </span>
        {description ? <span className={styles.toggleDesc}>{description}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.knob} aria-hidden="true" />
      </button>
    </div>
  )
}

export type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
  indeterminate?: boolean
}

/** Row / select-all checkbox with a required aria-label. */
export function Checkbox({ checked, onChange, ariaLabel, indeterminate = false }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.checkbox}
      checked={checked}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.checked)}
    />
  )
}
