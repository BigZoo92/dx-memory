import { Fragment, type ReactNode } from 'react'
import styles from './Layout.module.css'

export type Crumb = { label: string; href?: string }

export type BreadcrumbProps = {
  items: Crumb[]
  /** Optional router link renderer for non-final crumbs. */
  renderLink?: (crumb: Crumb, content: ReactNode) => ReactNode
}

/** Route breadcrumb trail; the final crumb is emphasized (current page). */
export function Breadcrumb({ items, renderLink }: BreadcrumbProps) {
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      {items.map((crumb, index) => {
        const isLast = index === items.length - 1
        const label = (
          <span
            className={isLast ? styles.crumbCurrent : styles.crumb}
            aria-current={isLast ? 'page' : undefined}
          >
            {crumb.label}
          </span>
        )
        return (
          <Fragment key={`${crumb.label}-${index}`}>
            {index > 0 ? (
              <span className={styles.crumbSep} aria-hidden="true">
                /
              </span>
            ) : null}
            {!isLast && crumb.href && renderLink ? renderLink(crumb, label) : label}
          </Fragment>
        )
      })}
    </nav>
  )
}
