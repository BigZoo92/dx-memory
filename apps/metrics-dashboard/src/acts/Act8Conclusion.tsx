import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'

const PRECOS = [
  {
    n: '01',
    title: 'Mesurer avant d’optimiser',
    body:
      'Tenir un profil Build / Ship / Run / Change comme boussole d’équipe — pas comme un score. Une optimisation locale se juge sur le système entier : une CI plus rapide qui teste moins, une image minuscule qu’on ne sait plus diagnostiquer ou une industrialisation qui rend chaque changement transversal déplacent la facture au lieu de la réduire.'
  },
  {
    n: '02',
    title: 'Investir dans les frontières qui réduisent le coût du changement',
    body:
      'Des responsabilités explicites, des contrats uniques, des golden paths légers — calibrés sur le produit, pas sur l’ambition technique. C’est aussi un investissement IA : l’agent amplifie le système qu’on lui donne ; un contexte local et lisible transforme la même IA en meilleur coéquipier.'
  },
  {
    n: '03',
    title: 'Faire de l’accessibilité et de la sobriété des attentes par défaut',
    body:
      'Intégrées aux primitives et aux gates du système, ces qualités ont coûté 18 lignes ; en chantier correctif, 80 à 107. Les budgets d’accessibilité et de requêtes appartiennent au chemin de livraison — pour les personnes qui utilisent le produit comme pour son empreinte environnementale.'
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
