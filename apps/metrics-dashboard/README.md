# `/metrics` — « L'adresse de la facture »

Essai visuel interactif du mémoire **« Optimiser la DX pour une UX qui rapporte »**
(Enzo Givernaud, M2 IWID). La page sert de support de soutenance scrollable :
huit actes narratifs, puis les vues de défense (Méthode / Limites / Données / Sources)
pour les questions du jury. Le storyboard complet est dans [STORYBOARD.md](./STORYBOARD.md).

## Données

La page n'importe qu'une seule source : `src/bench/truth-pack.json`, le pack de
vérité consolidé des 12 runs de benchmark (S01-S04 × Flow/Friction/Overfit).

- Il est **généré mécaniquement** par `node tools/metrics/bench-truth-pack.mjs`
  depuis l'archive brute (`~/dx-memory-benchmark-archive-2026-07-08`) et les
  mesures CI gelées (`tools/metrics/results/ci/*.json`).
- Le générateur vérifie des checkpoints d'intégrité et documente chaque
  consolidation (valeur brute conservée, valeur consolidée, raison).
- `pnpm metrics:truth-pack:check` échoue si le JSON committé dérive du raw.
- Le build est hermétique : aucun collecteur ne tourne au build.

Le profil de coût total de livraison (facteurs `×` par axe Build/Ship/Run/Change)
est recalculé à l'exécution dans `src/bench/ctl.ts` — formules lisibles, valeurs
non arrondies conservées, arrondi = affichage seulement. Il n'existe volontairement
**aucun score global** : les axes ne sont ni additionnés ni moyennés.

## Niveaux de vérité

Chaque valeur porte un niveau (`direct` / `derived` / `reviewable` /
`interpretation`) et une provenance. Dans la page, cliquer une valeur ouvre sa
fiche (source, formule, limite associée). Les interprétations sont marquées
typographiquement (serif italique + étiquette « lecture »).

## Commandes

```bash
pnpm metrics:dashboard        # dev server (http://localhost:5173/metrics/)
pnpm metrics:dashboard:build  # tsc + vite build
pnpm --filter @signalops/metrics-dashboard typecheck
pnpm --filter @signalops/metrics-dashboard lint
pnpm metrics:truth-pack       # régénère src/bench/truth-pack.json depuis l'archive
```
