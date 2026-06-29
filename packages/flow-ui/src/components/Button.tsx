import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  children: ReactNode
}

/** Button — primary / secondary / ghost / danger / dark, with an optional small size. */
export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  const classes = [styles.btn, styles[variant], size === 'sm' ? styles.sm : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  )
}
