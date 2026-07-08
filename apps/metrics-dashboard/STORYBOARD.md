# Storyboard — `/metrics` · « L'adresse de la facture »

Essai visuel interactif pour la soutenance du mémoire
**« Optimiser la DX pour une UX qui rapporte »** — Enzo Givernaud, M2 IWID, IIM · Sahar.

Ce document décrit la narration, les écrans, les données affichées et les règles
d'honnêteté de chaque acte. Il est la référence éditoriale de l'implémentation.

---

## Intention

La page n'est pas un dashboard. C'est un **essai visuel scrollable** : pendant la
soutenance (segment de 8 à 12 minutes), Enzo parle, la page raconte avec lui.
Le jury doit comprendre le raisonnement au premier regard, puis pouvoir attaquer
la méthode pendant les questions — la page sert les deux moments.

Trois voix typographiques portent les trois niveaux de discours :

| Voix | Usage | Style |
| --- | --- | --- |
| **Affirmation** | les phrases-jalons du récit | sans-serif très gras, très grand, majuscules |
| **Donnée** | toute valeur mesurée ou dérivée | monospace, chiffres tabulaires |
| **Lecture** | l'interprétation argumentative | serif italique, toujours marquée « lecture » |

Chaque valeur affichée porte son **niveau de vérité** (mesure directe / dérivé /
post-hoc revu / lecture) — cliquable pour ouvrir sa provenance (fichier source,
formule, limite associée). C'est l'outil anti-« d'où sort ce chiffre ? » du jury.

Palette (validée CVD + contraste, mode clair et scène sombre) :
Flow `#0c8f70` · Friction `#e04f2f` · Overfit `#7d55e3` sur papier `#f7f4ee` ;
scène sombre : `#0ea182` / `#e5603d` / `#906fe8` sur `#141210`.
La couleur suit la variante, jamais le rang.

---

## Acte 1 — La facture invisible (~45 s)

Plein écran, papier nu, aucune carte, aucun graphique.

```
OPTIMISER
N'EST PAS
ALLER PLUS VITE.
```

Au scroll :

```
C'est éviter de payer ailleurs.
```

Puis les quatre adresses possibles de la facture apparaissent, une par une :

```
BUILD    construire et tester localement
SHIP     valider et livrer avec confiance
RUN      diagnostiquer et restaurer
CHANGE   faire évoluer sans tout payer
```

En pied d'acte, discret : titre du mémoire, problématique, auteur/formation.

## Acte 2 — J'ai changé le système, pas le produit (~90 s)

```
MÊME PRODUIT.
MÊME IA.
MÊMES TICKETS.
```

Trois colonnes se lèvent, chacune avec un glyphe structurel abstrait
(strates rangées / plan unique / empilement dense) :

- **FLOW** — le compromis. Frontières explicites, changement localisé.
- **FRICTION** — le chemin direct. Plat, immédiat, volontairement frictionnel.
- **OVERFIT** — l'industrialisation poussée. Rust, couches, contrats, gates.

Puis le protocole, en chiffres nus : `12 runs · 4 scénarios · 3 codebases · 1 modèle`,
avec les garanties (conversation neuve par run, prompt identique, ordres tournés,
0 prompt de correction) et le modèle exact (`claude-opus-4-8[1m]`, Extra High).

```
MÊME IA. MÊME BESOIN. PAS LE MÊME COÛT.
```

Source discrète : *DORA, State of AI-assisted Software Development, 2025* —
l'IA amplifie le système dans lequel elle travaille (cadrage, pas preuve).

## Acte 3 — Première surprise : Flow perd (~60 s)

Ticket S01 (`riskLevel` de bout en bout). Trois chronos immenses qui montent
en compte-à-rebours inversé au scroll, puis se figent :

```
FRICTION  14:16      FLOW  19:04      OVERFIT  21:02
```

```
FRICTION GAGNE.
```

```
Mon hypothèse ne tenait pas encore.
```

Le reveal d'honnêteté est le cœur de l'acte : le résultat défavorable est
affiché en premier, en plus gros que tout le reste. Donnée secondaire discrète :
fichiers touchés 17 / 17 / 26.

## Acte 4 — Le produit change d'avis (~2 min 30)

Le mot `critical` entre dans l'écran comme un nouveau niveau de risque (S02).
Les chronos de l'acte 3 ne sont pas rechargés : ils **se transforment** —
le temps s'empile (S01+S02), puis la caméra change de métrique.

1. **Temps cumulé** (honnête d'abord) : Friction reste devant.
   `25:49 · 34:52 · 38:33` — « Friction est toujours plus rapide. »
2. **La matière du changement** : le churn devient texture — chaque LOC un trait.
   ```
   CHURN CUMULÉ S01+S02 :  FLOW 291   FRICTION 346   OVERFIT 470
   ```
3. **File-touches** en grille de cellules : `FRICTION 27 · FLOW 28 · OVERFIT 41`.

```
Rapide aujourd'hui ne veut pas dire économique demain.   (lecture)
```

Interdit respecté : on ne dit jamais que Friction « ralentit » — elle accélère
aussi en S02. Le message est : plusieurs métriques, plusieurs coûts.

4. **Le métier à tisser** (knowledge map consolidée, post-hoc revu) :
   5 règles métier = 5 fils ; les fichiers = nœuds.
   - Friction : 3 fils **convergent** dans `helpers.ts` (7 liens / 4 fichiers).
   - Flow : un fil, un fichier (5 liens / 5 fichiers, 0 duplication).
   - Overfit : `allowed_values` se **réplique** dans 5 représentations
     maintenues à la main (11 liens / 8 fichiers, 3 règles dupliquées).
   Badge « analyse post-hoc revue » + note : la bannière « generated » d'Overfit
   ne correspond pas à une génération réelle (ADR-0003, générateur = lock only).

## Acte 5 — Un bug demande un modèle mental (~2 min)

**Rupture : scène sombre.** S03, `nullable-tags-render-crash`.

```
ÉCRAN VIDE
```

La chaîne causale se construit au scroll, maillon par maillon :

```
SIGNAL → CONTRAT → FRONTIÈRE → tags = null → .map() → CRASH
```

Puis la course, sur une vraie ligne de temps :

```
PREMIÈRE HYPOTHÈSE CORRECTE     FLOW 00:53   OVERFIT 02:33   FRICTION 03:17
CAUSE CONFIRMÉE                 FRICTION 03:28   FLOW 03:47   OVERFIT 05:25
```

```
Flow ne confirme pas la cause en premier.
Il construit le bon modèle en premier.        (lecture)
```

Les 18 secondes d'avance de Friction sur la confirmation restent affichées —
le contraste fait le récit. Badges : horodatage = mesure directe ;
« hypothèse correcte » = classement post-hoc contre le ground truth.
Lien discret : « Pourquoi le temps de correction n'est pas classé → » (Limites) :
scénario re-scopé, seams d'injection asymétriques, consigne fixture perdue,
métriques post-cause déclassées.

## Acte 6 — Même qualité finale. Pas le même chantier. (~2 min 30)

Retour au papier. S04 : accessibilité + sobriété réseau, même cible pour tous.

1. **Capacités accessibilité** en couches d'état (pas des checkboxes) :
   baseline → cible pour `noms accessibles · clavier · aria-sort · focus · annonce live`.
   Flow possédait déjà presque tout ; Friction et Overfit partaient des tris
   souris-seулement.
2. Reveal churn accessibilité : `FLOW 18 · FRICTION 80 · OVERFIT 82`.
3. **Sobriété** — le zéro géant de Flow :
   ```
   0  fichier à modifier
   0 requête dupliquée · 0 détail anticipé · 0 refetch liste au retour
   ```
   « Le meilleur correctif réseau n'a pas eu besoin d'exister. »
   Honnêteté : Flow a tout de même payé ~16 min pour **vérifier** qu'il n'y
   avait rien à faire.
4. Friction : requêtes dupliquées `5 → 0`. Overfit : `3 → 0`
   (suppression d'un breadcrumb télémétrique POST /api/logs émis 4×).
5. **Coût combiné pour la même cible** : `FLOW 18 · OVERFIT 86 · FRICTION 107` LOC.
6. Contrepoint affiché : en temps brut S04, Flow est le plus lent
   (34:17 vs 24:41 / 21:27). « La vitesse brute reste chez les autres.
   Le chantier, lui, change d'échelle. »

```
L'accessibilité coûte moins cher quand le système l'attend déjà.   (lecture)
```

Interdits respectés : aucun classement axe-core inter-variantes, aucun octet
comparé entre variantes (méthodes non homogènes — renvoi vers Limites).

## Acte 7 — L'adresse de la facture (~90 s)

Le profil de coût total de livraison. Pas un score. Quatre axes indépendants,
quatre rails horizontaux ; sur chaque rail, le meilleur équilibre observé = `1,00×`.

```
BUILD    FRICTION 1,00×   FLOW 1,06×   OVERFIT 2,77×
SHIP     FRICTION 1,00×   FLOW 1,02×   OVERFIT 1,13×
RUN      FRICTION 1,00×   FLOW 1,09×   OVERFIT 1,56×
CHANGE   FLOW 1,00×   FRICTION 1,50×   OVERFIT 1,88×
```

```
LE CTL N'EST PAS UN SCORE.
C'EST L'ADRESSE DE LA FACTURE.
```

Jamais de moyenne inter-axes, jamais de total. Tensions hors facteur exposées à
côté du rail Build : à froid Friction est la moins chère (17,3 s vs 46,1 s),
en boucle chaude Flow l'emporte (6,1 s vs 14,5 s) — le facteur combine les deux.
Hors facteur Ship : démarrage conteneur (Flow SSR 14,6 s vs 67 ms) — exposé,
non compté (topologies non comparables).

Lecture (marquée) : la facture de Friction est à l'adresse **Change** ;
celle d'Overfit surtout à **Build** et **Change** ; Flow paie quelques pourcents
partout pour réduire le coût d'évolution.

Note de sensibilité visible : sans le churn qualité S04, l'axe Change change de
tête (Friction 1,00× · Flow 1,06×) — détaillé dans Méthode/Limites.

## Acte 8 — Trois préconisations, puis les limites (~60 s)

1. **Mesurer avant d'optimiser** : tenir un profil Build/Ship/Run/Change comme
   boussole d'équipe ; juger chaque optimisation locale sur le système entier.
2. **Investir dans les frontières qui réduisent le coût du changement** —
   y compris pour l'IA : l'agent amplifie le système qu'on lui donne
   (contexte local, contrats explicites, golden paths légers).
3. **Faire de l'accessibilité et de la sobriété des attentes par défaut du
   système** : intégrées aux gates et aux primitives, elles coûtent 18 LOC ;
   en chantier correctif, 80 à 107.

Conclusion :

```
LA DX NE RAPPORTE PAS EN ALLANT PLUS VITE.
ELLE RAPPORTE EN DÉPLAÇANT LA FACTURE
LÀ OÙ ON PEUT LA PAYER.
```

Et l'aveu final, en lecture : 12 runs contrôlés, pas une preuve statistique.
« Ce que je livre, c'est une méthode pour trouver l'adresse de la facture. »

---

## Vues de défense (après le récit, accessibles par la navigation)

- **Méthode** — protocole complet (modèle, ordres, conversations neuves),
  définition du CTL et des formules (`cost_ratio`, moyenne géométrique,
  normalisation), composition exacte de chaque axe, critères d'admissibilité,
  analyse de sensibilité Change, niveaux de vérité.
- **Limites** — biais de sélection assumé ; seuils riskLevel non identiques ;
  chemins de validation non identiques (FULL_GREEN commun) ; S03 re-scopé et
  asymétries ; méthodes axe/réseau non homogènes en S04 ; métriques Build/Ship
  mono-run (win32) ; occupation contexte = capture externe, jamais un coût ;
  12 runs ≠ statistique.
- **Données** — table complète par scénario × variante, chaque ligne avec
  niveau de vérité + chemin du fichier source ; valeurs brutes vs consolidées
  (ex. `final_build_pass` S03 Overfit) ; snapshots contexte externes.
- **Sources** — archive des 12 runs, commit des métriques automatiques,
  ADR-0003, DORA 2025.

## Règles d'honnêteté non négociables (rappel d'implémentation)

- Aucun score CTL global, aucune moyenne Build+Ship+Run+Change, aucun euro.
- Friction n'est jamais « lente » ni « difficile à debugger » ; Overfit n'est
  jamais « mauvaise » ni « en échec ».
- Aucune comparaison axe-core ni octets absolus inter-variantes.
- L'occupation de contexte n'est jamais appelée « tokens consommés ».
- Les interprétations sont typographiquement distinctes et marquées.
- Chaque chiffre du récit existe dans le truth pack avec provenance.
