// « L'adresse de la facture » — essai visuel interactif du mémoire
// « Optimiser la DX pour une UX qui rapporte » (Enzo Givernaud, M2 IWID).
//
// La page est un récit scrollable en huit actes, suivi des vues de défense
// (Méthode / Limites / Données / Sources). Chaque valeur affichée est cliquable
// et ouvre sa provenance ; les interprétations sont typographiquement marquées.
// Storyboard : apps/metrics-dashboard/STORYBOARD.md.

import { ProvHost } from './lib/Prov'
import { Nav } from './ui/Nav'
import { Act1Ouverture } from './acts/Act1Ouverture'
import { Act2Systemes } from './acts/Act2Systemes'
import { Act3Surprise } from './acts/Act3Surprise'
import { Act4Changement } from './acts/Act4Changement'
import { Act5Diagnostic } from './acts/Act5Diagnostic'
import { Act6Qualites } from './acts/Act6Qualites'
import { Act7Profil } from './acts/Act7Profil'
import { Act8Conclusion } from './acts/Act8Conclusion'
import { Donnees, Limites, Methode, Sources } from './views/Defense'

export default function App() {
  return (
    <ProvHost>
      <Nav />
      <main>
        <Act1Ouverture />
        <Act2Systemes />
        <Act3Surprise />
        <Act4Changement />
        <Act5Diagnostic />
        <Act6Qualites />
        <Act7Profil />
        <Act8Conclusion />
        <div className="defense-wrap">
          <Methode />
          <Limites />
          <Donnees />
          <Sources />
        </div>
      </main>
      <footer className="page-foot">
        <p>
          Douze runs contrôlés · un truth pack vérifiable · <a href="#methode">méthode</a> ·{' '}
          <a href="#limites">limites</a>
        </p>
      </footer>
    </ProvHost>
  )
}
