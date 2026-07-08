import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'

const PRECOS: { n: string; title: string; body: React.ReactNode }[] = [
  {
    n: '01',
    title: 'Cartographier',
    body: (
      <>
        <strong>Avant d'optimiser, localiser la facture.</strong> Identifier où le coût se situe
        réellement · vérifier qu'il est fréquent et structurant · mesurer avant / après · regarder
        où l'optimisation risque de déplacer le coût.
      </>
    )
  },
  {
    n: '02',
    title: 'Paver',
    body: (
      <>
        <strong>Des golden paths légers — pas des autoroutes obligatoires.</strong> Réduire la
        friction des parcours fréquents · préparer des chemins simples et documentés · fournir les
        bonnes primitives · garder une porte de sortie quand un cas sort du standard.
      </>
    )
  },
  {
    n: '03',
    title: 'Gouverner',
    body: (
      <>
        <strong>IA, accessibilité et sobriété : des décisions normales, pas des correctifs de fin
        de projet.</strong> Donner un contexte fiable aux agents IA · intégrer l'accessibilité aux
        primitives et composants · intégrer la sobriété aux choix de chargement, de cache et
        d'architecture · arbitrer ces sujets dans le flux normal de livraison.
      </>
    )
  }
]

export function Act8Conclusion() {
  return (
    <Act id="preconisations">
      <Kicker>Trois préconisations</Kicker>
      <div className="precos">
        {PRECOS.map((p, i) => (
          <Reveal key={p.n} delay={i * 140}>
            <article className="preco">
              <span className="preco-n">{p.n}</span>
              <h3 className="preco-title">{p.title}</h3>
              <p className="preco-body">{p.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <div className="finale">
        <Affirm size="xl" align="center">
          La DX ne rapporte pas
          <br />
          en allant plus vite.
        </Affirm>
        <Affirm size="lg" align="center">
          Elle rapporte en déplaçant la facture
          <br />
          là où l'équipe peut la payer.
        </Affirm>
      </div>
      <Lecture>
        Douze runs contrôlés ne prouvent pas une loi générale — et ne le prétendent pas. Ce que je
        livre, c'est une méthode honnête pour trouver l'adresse de la facture, et un système, Flow, qui
        choisit la sienne en connaissance de cause.
      </Lecture>
    </Act>
  )
}
