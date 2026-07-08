import { useEffect, useState } from 'react'

const LINKS = [
  { href: '#ouverture', label: 'Récit' },
  { href: '#profil', label: 'Profil CTL' },
  { href: '#methode', label: 'Méthode' },
  { href: '#limites', label: 'Limites' },
  { href: '#donnees', label: 'Données' },
  { href: '#sources', label: 'Sources' }
]

export function Nav() {
  const [progress, setProgress] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [onDark, setOnDark] = useState(false)
  useEffect(() => {
    const darkSections = Array.from(document.querySelectorAll('.tone-dark'))
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const doc = document.documentElement
        const total = doc.scrollHeight - window.innerHeight
        setProgress(total > 0 ? window.scrollY / total : 0)
        setScrolled(window.scrollY > 40)
        setOnDark(
          darkSections.some((el) => {
            const r = el.getBoundingClientRect()
            return r.top <= 60 && r.bottom >= 0
          })
        )
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}${onDark ? ' on-dark' : ''}`}>
      <a className="nav-title" href="#ouverture">
        L'adresse de la facture
      </a>
      <nav className="nav-links" aria-label="Navigation de la page">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>
      <span className="nav-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
    </header>
  )
}
