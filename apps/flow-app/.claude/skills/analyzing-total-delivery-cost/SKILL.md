---
name: analyzing-total-delivery-cost
description: Analyzes developer-experience decisions through the total delivery cost model ("cout total de livraison"). Use when evaluating a DX optimization, mapping a developer friction, judging a CI / build / pipeline / monorepo / Nx / Docker / TypeScript / React / test / review / documentation / golden-path / AI change, weighing a Build-Ship-Run-Change tradeoff, checking whether an optimization displaces cost elsewhere ("cout deplace"), finding a tipping point ("point de bascule"), writing a stop rule, or producing a DX recommendation linking DX to UX and business value.
---

# Analyzing total delivery cost

Le **cout total de livraison** est l'ensemble des efforts pour transformer une intention produit en logiciel utilisable, puis pour le faire vivre. Ce n'est pas un chiffre : c'est une **boussole** qualitative pour voir ou une friction apparait, ou une optimisation agit, ou elle risque de deplacer le cout, et si le systeme livre mieux dans son ensemble.

Idee directrice : une optimisation peut etre **vraie localement et mauvaise globalement**. Le travail du skill est de retrouver le **cout deplace** que le gain local cache, sur les quatre axes **Build / Ship / Run / Change**.

## Quand l'utiliser

- Analyser une optimisation DX ou cartographier une friction developpeur.
- Juger une CI, un build, une pipeline, un monorepo, React, Docker, Nx, TypeScript, l'IA, la review, les tests, la documentation ou un golden path sous l'angle du cout.
- Arbitrer entre vitesse, fiabilite, maintenabilite et UX.
- Verifier si une optimisation deplace le cout ailleurs, trouver son **point de bascule**, ecrire une **stop rule**.
- Relier DX, UX et performance economique dans une preconisation.

## Quand ne pas l'utiliser

- Implementer le changement (ecrire le code, configurer la CI) : ce skill decide, il n'execute pas.
- Repondre a une question factuelle isolee ("quelle commande lance les tests ?") sans arbitrage.
- Produire un chiffrage financier exact ou un ROI : le modele reste qualitatif (voir [model.md](model.md)).

## Workflow

Sequence a suivre. Detail, questions et pieges de chaque etape dans [workflow.md](workflow.md).

1. **Reformuler** l'optimisation ou la friction analysee, en une phrase neutre.
2. **Intention** : a quel besoin produit ou technique elle repond.
3. **Classer** la friction dans Build / Ship / Run / Change (souvent plusieurs).
4. **Gain local** : ce qui s'ameliore reellement ou semble s'ameliorer.
5. **Cout deplace** : ou le gain reapparait en cout ailleurs.
6. **Impacts** : UX, livraison, maintenance, securite, accessibilite, sobriete si applicable.
7. **Preuves a rechercher** : ce qu'il faudrait observer ou mesurer pour trancher.
8. **Indicateurs possibles** : metriques simples, signalees "a mesurer" si absentes.
9. **Decision** : optimiser maintenant / documenter d'abord / decouper / tester sur pilote / ne pas optimiser / arreter l'optimisation.
10. **Stop rule** : la condition qui declenche l'arret ou la remise en question.
11. **Sortie** : produire le format ci-dessous.

## Format de sortie

Par defaut, repondre avec ces sections, dans cet ordre :

```
## Diagnostic
## Cartographie Build / Ship / Run / Change   (table courte : axe -> impact)
## Gain local
## Couts deplaces possibles
## Preuves a rechercher
## Indicateurs possibles
## Decision recommandee
## Stop rule
## Formulation utilisable   (un paragraphe pret a coller dans une note, une PR, un memoire)
```

Adapter la longueur a la question ; ne jamais supprimer Couts deplaces, Decision et Stop rule, qui sont le coeur du skill.

## Registre de preuve

Distinguer toujours, et l'ecrire, cinq statuts : **observe**, **mesure**, **suppose**, **propose**, **a verifier**. Ne pas confondre une hypothese avec une mesure.

Ne jamais inventer de metrique terrain. Si la donnee n'est pas fournie, proposer l'indicateur et le marquer **a mesurer** ; ne pas lui donner de valeur chiffree.

## Style

- Francais naturel, direct, sans jargon inutile.
- Raisonner systeme complet plutot qu'indicateur local.
- Distinguer gain individuel et gain equipe.
- Regarder le risque UX ou utilisateur des qu'il existe.

## Anti-patterns

- Conclure sur le seul gain local sans chercher le cout deplace.
- Inventer un ROI, un pourcentage ou un temps gagne non mesure.
- Justifier par la mode ("il faut optimiser parce que c'est moderne").
- Evaluer l'IA a la productivite individuelle en ignorant review, tests et validation.
- Donner une decision sans stop rule, ou une stop rule non observable.
- Traiter Build / Ship / Run / Change comme un seul axe alors que le cout migre de l'un a l'autre.

Modele detaille : [model.md](model.md) | Exemples : [examples.md](examples.md) | Auto-tests : [evaluation.md](evaluation.md)
