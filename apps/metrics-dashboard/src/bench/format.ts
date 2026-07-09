// Formatage français : virgule décimale, espaces fines insécables, chronos mm:ss.

const NNBSP = ' '

export const fmtInt = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)

/** Facteur de coût relatif : 1.0554 → « 1,06× » (arrondi d'affichage uniquement). */
export const fmtFactor = (x: number): string =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x)}×`

/** 856321 ms → « 14:16 » (minutes:secondes, arrondi à la seconde). */
export const fmtChrono = (ms: number): string => {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 53171.858 ms → « 53 s » ; 208099 → « 3 min 28 s ». */
export const fmtDuration = (ms: number): string => {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total}${NNBSP}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return s === 0 ? `${m}${NNBSP}min` : `${m}${NNBSP}min${NNBSP}${String(s).padStart(2, '0')}${NNBSP}s`
}

/** 46063 ms → « 46,1 s » (durées courtes de validation). */
export const fmtSeconds = (ms: number): string =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(ms / 1000)}${NNBSP}s`

/** 241250 Ko → « 236 Mo ». */
export const fmtKb = (kb: number): string => {
  if (kb >= 1024) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(kb / 1024)}${NNBSP}Mo`
  }
  return `${fmtInt(kb)}${NNBSP}Ko`
}

/** 216.4 → « 216,4 Ko » (bundles gzip : la décimale compte). */
export const fmtKbFine = (kb: number): string =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(kb)}${NNBSP}Ko`

/** 180500 → « 180,5 k ». */
export const fmtThousands = (n: number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n / 1000)}${NNBSP}k`
