import { Act, Affirm, Reveal } from '../ui/voice'

const AXES_INTRO = [
  { id: 'build', label: 'Build', gloss: 'construire et tester localement' },
  { id: 'ship', label: 'Ship', gloss: 'valider et livrer avec confiance' },
  { id: 'run', label: 'Run', gloss: 'diagnostiquer et restaurer' },
  { id: 'change', label: 'Change', gloss: 'faire évoluer sans tout payer' }
]

export function Act1Ouverture() {
  return (
    <Act id="ouverture">
      <div className="hero-block">
        <Affirm size="xl">
          Optimiser
          <br />
          n'est pas
          <br />
          aller plus vite.
        </Affirm>
      </div>
      <div className="hero-block hero-counter">
        <Affirm size="lg">C'est éviter de payer ailleurs.</Affirm>
      </div>
      <div className="hero-axes">
        <Reveal>
          <p className="hero-axes-intro">Un changement logiciel se paie à quatre adresses :</p>
        </Reveal>
        <ol className="axes-list">
          {AXES_INTRO.map((a, i) => (
            <Reveal key={a.id} delay={i * 110}>
              <li className="axes-item">
                <span className="axes-name">{a.label}</span>
                <span className="axes-gloss">{a.gloss}</span>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal delay={500}>
          <p className="hero-thesis">
            Le coût total de livraison, c'est l'effort et l'attention nécessaires pour construire, valider,
            livrer, diagnostiquer, corriger et faire évoluer un changement. Il ne se calcule pas.
            Il se <em>localise</em>.
          </p>
        </Reveal>
      </div>
      <footer className="memoire-id">
        <Reveal>
          <p className="memoire-title">« Optimiser la DX pour une UX qui rapporte »</p>
          <p className="memoire-q">
            Dans quelle mesure l'investissement dans la DX améliore l'UX et la performance économique
            de l'entreprise, et jusqu'où aller avant que l'optimisation devienne contre-productive ?
          </p>
          <p className="memoire-meta">
            Enzo Givernaud · Mastère IWID, IIM Digital School De Vinci · Développeur frontend, Sahar · 2025-2026
          </p>
        </Reveal>
      </footer>
    </Act>
  )
}
