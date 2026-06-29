# @signalops/ui-spec

A **typed source of truth** for the SignalOps UI — not a React design system. It turns the design
spec and the clickable maquette into data the variants (and code agents) can import, so the three
variants render the same product from the same spec.

```ts
import {
  colors,
  hues,
  radius,
  spacing,
  shadow,
  typography,
  layout,
  severityHue,
  statusHue,
  impactHue,
  BADGE_VARIANTS,
  ROUTES,
  NAV_ROUTES,
  routeById,
  SCREENS,
  UI_STATES,
  MICROCOPY,
  screenById,
  COMPONENTS,
  componentsByGroup
} from '@signalops/ui-spec'
```

| Module       | Contents                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `tokens`     | colors, hues, radius, spacing, shadow, typography, focus ring, layout dims, severity/status/impact hue maps, badge variants |
| `routes`     | the 7 product routes + nav metadata                                                                                         |
| `screens`    | per-screen required sections, the 8 async UI states, canonical microcopy                                                    |
| `components` | the reusable component catalog (names + responsibilities)                                                                   |

## Source of truth & invariance

Values are transcribed from [`docs/product/01-design-spec.md`](../../docs/product/01-design-spec.md)
and `maquettes/SignalOps.dc.html`. **Do not change token values per variant** — the three variants
are meant to be pixel-identical; the only allowed visible difference is the `VariantBadge` value.

The hue maps (`severityHue`, `statusHue`, `impactHue`) are keyed by the `@signalops/contracts`
enums via `satisfies`, so they cannot drift from the data model. Meaning is never encoded by color
alone — every badge also carries a text label.
