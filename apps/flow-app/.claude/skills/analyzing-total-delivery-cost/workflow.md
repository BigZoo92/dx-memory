# Workflow detaille

Detail des 11 etapes du SKILL.md : pour chaque etape, ce qu'on cherche, les questions a poser, le piege a eviter. Suivre l'ordre ; ne pas sauter le cout deplace (etape 5) ni la stop rule (etape 10).

## 1. Reformuler

Reecrire l'optimisation ou la friction en une phrase neutre, sans le verdict ("la CI est trop lente" plutot que "il faut paralleliser la CI").
Piege : reprendre la solution proposee comme si c'etait le probleme.

## 2. Intention

Nommer le besoin produit ou technique vise : livrer plus vite, reduire les incidents, faciliter l'onboarding, baisser le cout d'exploitation.
Piege : confondre l'intention (le pourquoi) avec le moyen (le comment). Le moyen est negociable, l'intention non.

## 3. Classer dans Build / Ship / Run / Change

Placer la friction sur un ou plusieurs axes (definitions dans [model.md](model.md)). La plupart des cas touchent au moins deux axes.
Piege : forcer un seul axe. Si c'est ambigu, c'est souvent le signe d'un cout qui migre d'un axe a l'autre - a noter explicitement.

## 4. Gain local

Decrire ce qui s'ameliore reellement, ou ce qui semble s'ameliorer, du point de vue de celui qui propose. Le formuler genereusement : le gain local est souvent vrai.
Piege : minimiser le gain pour gagner l'argument. On veut une analyse, pas un proces.

## 5. Cout deplace

Coeur du skill. Pour chaque type de cout (liste dans [model.md](model.md)), se demander : ce gain reapparait-il en cout ailleurs ? Suivre la migration entre axes, surtout vers Run et Change qui coutent plus cher.
Questions : qui paie maintenant ce qu'on ne paie plus ici ? Le cout disparait-il ou se deplace-t-il ? Y a-t-il un nouveau cout de validation, de coordination, de risque ?
Piege : s'arreter au premier "ca va plus vite". Un faux gain est un gain local sans cout retire au total.

## 6. Impacts

Evaluer UX, livraison, maintenance, securite, accessibilite, sobriete - uniquement celles que le changement touche reellement. Pour chacune, observe / suppose / a verifier.
Piege : derouler toutes les dimensions par reflexe. Pertinence d'abord.

## 7. Preuves a rechercher

Lister ce qu'il faudrait observer ou mesurer pour trancher : logs, durees, graphe de dependances, taux de flaky, retours developpeurs, rayon d'impact des PR, incidents passes.
Piege : conclure avant d'avoir nomme la preuve manquante. S'il manque une preuve decisive, le dire.

## 8. Indicateurs possibles

Proposer des metriques simples et observables. Les marquer **a mesurer** si la donnee n'est pas fournie. Ne jamais leur attribuer une valeur inventee.
Exemples d'indicateurs (a adapter) : duree CI p50/p95, taux de re-run, duree du tsc, nombre de taches Nx affectees par PR, taille mediane de diff, delai review, frequence de deploiement, temps de restauration, nombre d'incidents sans runbook.

## 9. Decision

Choisir une action et la justifier par les etapes precedentes. Les six options et quand les choisir :

- **Optimiser maintenant** - gain clair, cout deplace faible ou nul, preuve disponible.
- **Documenter d'abord** - le cout est surtout en transmission orale ou doc absente (golden path leger avant d'automatiser).
- **Decouper** - le gain est reel mais le lot est trop large pour etre revu sereinement (PR/refactor a fractionner).
- **Tester sur pilote** - hypothese plausible mais cout deplace incertain : valider sur un perimetre limite avant de generaliser.
- **Ne pas optimiser** - zone non mesuree, gain hypothetique, ou point de bascule deja en vue.
- **Arreter l'optimisation** - une optimisation en place a franchi son point de bascule : la retirer ou la simplifier.

Piege : choisir "optimiser maintenant" par defaut. L'absence de preuve oriente vers documenter, tester sur pilote ou ne pas optimiser, pas vers foncer.

## 10. Stop rule

Donner une condition observable qui declenche l'arret ou la remise en question. Une bonne stop rule est verifiable et bornee dans le temps ou la mesure.
Forme : "Si <indicateur observable> alors <arret / revert / re-examen>." Exemples : "Si le taux de flaky ne baisse pas sous 1 % en deux semaines, on revert." "Si le gain de perception n'apparait pas au profiler, on retire les memo."
Piege : une stop rule vague ("si ca se passe mal") qui ne se declenchera jamais.

## 11. Sortie

Produire le format de [SKILL.md](SKILL.md). Terminer par **Formulation utilisable** : un paragraphe autonome, sans jargon, pret a coller dans une note, une PR ou un memoire, qui resume le diagnostic, la decision et la stop rule.
