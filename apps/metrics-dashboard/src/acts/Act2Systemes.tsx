import { VARIANTS, VARIANT_NAME, VARIANT_TAGLINE } from '../bench/data'
import type { VariantId } from '../bench/types'
import { useInView } from '../lib/hooks'
import { Act, Affirm, Reveal } from '../ui/voice'

/** Glyphe structurel abstrait : la forme du système, pas un logo. */
function SystemGlyph({ variant }: { variant: VariantId }) {
  if (variant === 'friction') {
    // Un plan unique, direct.
    return (
      <svg viewBox="0 0 120 84" className="glyph" aria-hidden="true">
        <rect x="8" y="36" width="104" height="12" rx="3" className="glyph-fill" />
        <rect x="24" y="54" width="72" height="5" rx="2.5" className="glyph-soft" />
        <rect x="24" y="25" width="72" height="5" rx="2.5" className="glyph-soft" />
      </svg>
    )
  }
  if (variant === 'flow') {
    // Des strates rangées, une responsabilité par étage.
    return (
      <svg viewBox="0 0 120 84" className="glyph" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={18 + i * 3} y={14 + i * 13} width={84 - i * 6} height="8" rx="3" className={i === 2 ? 'glyph-fill' : 'glyph-soft'} />
        ))}
      </svg>
    )
  }
  // Overfit : l'empilement dense, répliqué.
  return (
    <svg viewBox="0 0 120 84" className="glyph" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={12 + (i % 2) * 6} y={8 + i * 10} width={96 - (i % 3) * 10} height="6" rx="2" className={i % 3 === 0 ? 'glyph-fill' : 'glyph-soft'} />
      ))}
    </svg>
  )
}

const VARIANT_DESC: Record<VariantId, string> = {
  flow: 'Frontières explicites, changement localisé, outillage quand il réduit réellement le coût.',
  friction: 'Plat, immédiat, volontairement frictionnel : types copiés, helpers fourre-tout, peu de frontières.',
  overfit: 'Rust, couches, contrats, DTO, mappers, gates. Techniquement impressionnante. Validée.'
}

export function Act2Systemes() {
  const { ref, inView } = useInView<HTMLElement>(0.5)
  return (
    <Act id="systemes" style={{paddingBottom: '20px'}}>
      <Affirm size="lg">
        Même produit.
        <br />
        Même IA.
        <br />
        Mêmes tickets.
      </Affirm>
      <Reveal>
        <p className="prose">
          J'ai implémenté trois fois le <b>même produit</b> visible: mêmes écrans, mêmes données. <b>Seul la DX change.</b>
        </p>
      </Reveal>
      <div className="variant-cards">
        {VARIANTS.map((v, i) => (
          <Reveal key={v} delay={i * 130}>
            <article className={`variant-card v-${v}`}>
              <SystemGlyph variant={v} />
              <h3 className="variant-name">{VARIANT_NAME[v]}</h3>
              <p className="variant-tagline">{VARIANT_TAGLINE[v]}</p>
              <p className="variant-desc">{VARIANT_DESC[v]}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <div className="protocol">
        <Reveal>
          <p className="protocol-figures">
            <span><strong>12</strong> runs</span>
            <span><strong>4</strong> scénarios</span>
            <span><strong>3</strong> codebases</span>
            <span><strong>1</strong> modèle</span>
          </p>
        </Reveal>
      </div>
      <Affirm size="lg" align="center">
        Même IA. Même besoin.
        <br />
        Pas le même coût.
      </Affirm>
          <aside ref={ref} className={`lecture reveal${inView ? ' is-in' : ''}`}>
            <p> Je n'ai pas benchmarké l'IA. J'ai changé le système autour d'elle.
            <span className="source-ref"> Interprétation à partir de DORA, State of AI-assisted Software Development, 2025</span></p>
            <span className="level-tag level-interpretation">L'agent amplifie le système dans lequel il travaille.</span>
          </aside>
    </Act>
  )
}
