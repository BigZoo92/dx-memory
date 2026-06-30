# Le modele du cout total de livraison

## Definition courte

Le **cout total de livraison** est l'ensemble des efforts pour transformer une intention produit en logiciel utilisable, puis pour le faire vivre. Il agrege le temps, l'attention, le risque et la coordination depenses du premier `git clone` jusqu'a l'exploitation en production et a l'evolution ulterieure.

C'est une **boussole**, pas un compteur. On l'utilise pour orienter une decision, pas pour produire un montant.

## Ce que le modele n'est pas

- Pas un chiffrage exact ni un ROI calcule. Il classe et compare des couts, il ne les additionne pas en euros.
- Pas un score unique qui note ou classe les equipes.
- Pas un argument de mode : "c'est moderne" n'est pas un gain.
- Pas une mesure de productivite individuelle : le sujet est ce que le systeme livre, pas ce qu'une personne produit.

## Les quatre axes : Build / Ship / Run / Change

Une friction ou une optimisation touche presque toujours plusieurs axes. Le but est de voir sur lequel le cout baisse et sur lequel il monte.

- **Build** - construire, installer, lancer, comprendre et tester en local.
  Frictions typiques : setup instable, serveur TypeScript lent, build local trop long, scripts confus, dependances mal comprises, onboarding difficile.
- **Ship** - livrer avec confiance.
  Frictions typiques : CI lente ou peu fiable, tests flaky, review longue, PR trop larges, validation incomplete, deploiement stressant, rollback mal connu.
- **Run** - diagnostiquer, exploiter, restaurer.
  Frictions typiques : logs incomplets, absence de runbook, documentation introuvable, incident difficile a isoler, manque de visibilite apres deploiement.
- **Change** - faire evoluer le systeme dans le temps.
  Frictions typiques : couplage fort, dependance trop centrale, graphe monorepo trop large, code difficile a comprendre, dette technique, regles implicites, refactor risque.

Regle d'arbitrage : **Run et Change coutent plus cher que Build et Ship.** Un cout deplace vers le diagnostic d'incident ou vers la capacite a evoluer est plus grave qu'un cout retire au confort local.

## Types de couts a reperer

Le gain local se paie souvent dans un de ces couts ailleurs. Les nommer rend le cout deplace visible.

- **Temps d'attente** - on attend la machine (build, CI, tsc, install).
- **Relances** - on relance "pour voir" (re-run CI, retry flaky, rebuild).
- **Rework** - on refait ce qui etait deja fait.
- **Review** - effort humain pour valider un changement.
- **Coordination** - synchroniser plusieurs personnes ou equipes.
- **Charge cognitive** - ce qu'il faut tenir en tete pour avancer sans casser.
- **Risque de regression** - probabilite de casser l'existant.
- **Risque utilisateur** - ce qui atteint l'utilisateur final (bug, lenteur, a11y degradee).
- **Risque securite** - surface d'attaque, secret expose, validation contournee.
- **Dette maintenable** - dette assumee et tracee, par opposition a la dette subie.
- **Transmission orale** - savoir qui ne vit que dans une tete ("demande a X").
- **Documentation absente** - savoir qui n'existe nulle part.
- **Cout d'exploitation** - ressources, energie, surveillance en production.
- **Cout de validation IA** - effort pour cadrer, relire, tester et valider un diff genere.

## Signaux faibles

Indices qu'une friction est deja payee sans etre nommee :

- "On relance la CI, ca passera." (relances, tests flaky -> Ship)
- "Demande a X comment on deploie." (transmission orale -> Run/Ship)
- "Personne ne touche ce module." (couplage, peur du refactor -> Change)
- "Le tsc rame mais on s'y est habitue." (temps d'attente normalise -> Build)
- "La PR est grosse mais on review vite." (review survolee, risque de regression -> Ship)
- "Il y a un script magique, je sais plus ce qu'il fait." (charge cognitive, doc absente -> Build/Run)

Un signal faible n'est pas une preuve : c'est une piste a confirmer (voir le registre de preuve dans SKILL.md).

## Point de bascule

Le **point de bascule** est le moment ou le cout ajoute par l'optimisation (complexite, maintenance, risque, validation) depasse le cout qu'elle retire. Au-dela, on a optimise et pourtant le systeme livre moins bien.

Indices qu'on l'a franchi ou qu'on en approche :

- L'optimisation cree plus de cas particuliers qu'elle n'en supprime.
- Le gain n'est plus mesurable, ou n'a jamais ete mesure.
- On optimise une zone non mesuree (premature optimization).
- Le cout migre vers un axe plus cher (Build vers Run, Ship vers Change).
- Il faut un expert pour comprendre l'optimisation elle-meme.

## Lien DX -> UX -> valeur economique

La chaine est qualitative mais reelle :

- Une friction DX non traitee se paie en delai de livraison, en bugs qui atteignent l'utilisateur, et en features non faites faute de temps.
- Une bonne DX permet de livrer plus souvent et plus sur : l'UX devient plus stable, les regressions atteignent moins l'utilisateur.
- La valeur economique suit : time-to-market, cout des incidents, retention, capacite a evoluer sans tout reecrire.

Ne jamais transformer cette chaine en chiffre invente. La relier, oui ; la chiffrer, seulement avec des donnees fournies.

## Place de l'IA

L'IA reduit le **cout d'entree** d'une tache : demarrer, generer un premier jet, explorer une piste. Mais elle deplace une partie du cout vers le **cadrage**, la **review**, les **tests**, la **comprehension du diff** et la **validation** (cout de validation IA).

Consequences pour l'analyse :

- Evaluer l'IA au niveau equipe et systeme, pas a la productivite individuelle.
- Un gros diff genere vite n'est un gain que si review et tests suivent.
- Bonne reponse type face a un refactor assiste : petits lots, tests, preuves, review renforcee.

## Accessibilite, securite, sobriete

A traiter comme des destinations possibles du cout deplace, des qu'elles sont pertinentes :

- **Accessibilite** - une optimisation de vitesse ou de perception qui degrade l'a11y deplace le cout vers le risque utilisateur.
- **Securite** - raccourcir une validation ou elargir une surface deplace le cout vers le risque securite.
- **Sobriete** - une optimisation locale peut augmenter le cout d'exploitation (ressources, energie, surveillance) en production.

Ne pas les invoquer par principe : seulement quand le changement analyse les touche.
