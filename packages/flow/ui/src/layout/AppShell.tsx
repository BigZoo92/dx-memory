import type { ReactNode } from 'react'
import styles from './Layout.module.css'

export type HeaderProps = {
  breadcrumb: ReactNode
  search?: ReactNode
  actions?: ReactNode
}

/** Top bar: breadcrumb on the left, search + actions on the right. */
export function Header({ breadcrumb, search, actions }: HeaderProps) {
  return (
    <header className={styles.header}>
      {breadcrumb}
      <div className={styles.headerRight}>
        {search}
        {actions}
      </div>
    </header>
  )
}

export type FooterProps = {
  buildInfo: string
  apiStatus: { label: string; tone: 'ok' | 'degraded' | 'down' }
}

const STATUS_COLOR: Record<FooterProps['apiStatus']['tone'], string> = {
  ok: '#12b76a',
  degraded: '#d9a200',
  down: '#d92d20'
}

/** Footer: build/version info + API status dot. */
export function Footer({ buildInfo, apiStatus }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <span>{buildInfo}</span>
      <span className={styles.statusDot}>
        <span
          className={styles.dot}
          style={{ background: STATUS_COLOR[apiStatus.tone] }}
          aria-hidden="true"
        />
        {apiStatus.label}
      </span>
    </footer>
  )
}

export type AppShellProps = {
  sidebar: ReactNode
  header: ReactNode
  footer: ReactNode
  children: ReactNode
}

/** The Sidebar + TopBar + Content + Footer frame shared by every route. */
export function AppShell({ sidebar, header, footer, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      {sidebar}
      <div className={styles.main}>
        {header}
        <main id="main-content" className={styles.content} tabIndex={-1}>
          {children}
        </main>
        {footer}
      </div>
    </div>
  )
}
