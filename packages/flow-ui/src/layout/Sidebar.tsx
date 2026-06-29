import type { ReactNode } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { VariantBadge } from '../badges/VariantBadge'
import styles from './Layout.module.css'

export type NavItem = {
  id: string
  label: string
  icon: IconName
  href: string
  count?: string
}

export type SidebarProps = {
  variantLabel: string
  items: NavItem[]
  activeId: string
  /** The app wraps each item in its router Link; flow-ui stays router-agnostic. */
  renderLink: (item: NavItem, content: ReactNode, className: string) => ReactNode
}

/** Left sidebar: brand, variant pill and the PRODUCT nav group. */
export function Sidebar({ variantLabel, items, activeId, renderLink }: SidebarProps) {
  return (
    <nav className={styles.sidebar} aria-label="Primary">
      <div className={styles.brand}>
        <span className={styles.logoMark} aria-hidden="true">
          S
        </span>
        <span>
          <span className={styles.brandName}>SignalOps</span>
          <br />
          <span className={styles.brandSub}>Operational signals</span>
        </span>
      </div>

      <VariantBadge label={variantLabel} />

      <div>
        <div className={styles.navGroupLabel}>Product</div>
        <ul className={styles.navList}>
          {items.map((item) => {
            const active = item.id === activeId
            const content = (
              <>
                <Icon name={item.icon} size={18} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
                {item.count ? <span className={styles.navCount}>{item.count}</span> : null}
              </>
            )
            const className = `${styles.navItem} ${active ? styles.navItemActive : ''}`
            return <li key={item.id}>{renderLink(item, content, className)}</li>
          })}
        </ul>
      </div>
    </nav>
  )
}
