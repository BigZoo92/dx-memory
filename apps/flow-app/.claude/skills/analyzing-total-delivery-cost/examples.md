# Exemples

Cas courts pour calibrer l'analyse. Chacun montre le gain local, le cout deplace, et la decision attendue. Forme compacte ; la sortie reelle suit le format complet de [SKILL.md](SKILL.md).

## 1. CI plus rapide, mais tests non lances

- **Friction / optim** : reduire la duree CI en sautant une partie des tests.
- **Axes** : gain affiche sur Ship (CI plus courte).
- **Gain local** : feedback plus rapide sur la PR.
- **Cout deplace** : Ship et Run - les bugs non detectes passent en review, en deploiement, en incident. Risque de regression et risque utilisateur montent.
- **Verdict** : faux gain. La CI n'est pas "plus rapide", elle en fait moins. Le cout total a augmente, il a juste change d'axe.
- **Decision** : ne pas optimiser ainsi. Si la CI est lente, viser la parallelisation, le cache de taches affectees ou la selection par impact, pas la suppression de couverture.
- **Stop rule** : si la couverture executee baisse, l'optimisation est rejetee par defaut.

## 2. IA sur un refactor monorepo

- **Friction / optim** : utiliser l'IA pour refactorer un large perimetre du monorepo.
- **Axes** : Build et Change.
- **Gain local** : cout d'entree reduit, premier jet rapide.
- **Cout deplace** : review, validation, tests, comprehension du diff (cout de validation IA). Un gros diff genere vite n'est pas un gain s'il sature la review.
- **Decision** : petits lots, tests en appui, preuves de non-regression, review renforcee. Cadrer avant de generer.
- **Stop rule** : si la taille de diff par PR depasse ce que la review absorbe, on refractionne avant de continuer.

## 3. Runbook Kubernetes absent ou introuvable

- **Friction / optim** : aucun runbook, ou doc introuvable au moment de l'incident.
- **Axes** : Run d'abord, Ship ensuite (deploiement stressant).
- **Cout deplace** : transmission orale ("demande a X"), temps de diagnostic, risque utilisateur pendant l'incident.
- **Decision** : documenter d'abord - golden path leger (chemin nominal de deploiement, rollback, ou regarder les logs) avant toute automatisation plus lourde.
- **Stop rule** : si une nouvelle restauration repose encore sur une personne unique, le golden path est incomplet.

## 4. Lib UI trop centrale dans un monorepo Nx

- **Friction / optim** : une lib UI dont presque tout depend.
- **Axes** : Build et Change.
- **Cout deplace** : tout changement a un grand rayon d'impact - tsc plus long, beaucoup de taches affectees, CI plus large, refactor risque, charge cognitive.
- **Preuves a rechercher** : graphe de dependances Nx, nombre de projets affectes par PR, duree tsc, duree CI, rayon d'impact des PR recentes.
- **Decision** : selon les preuves - decouper la lib, ou stabiliser son interface avant d'y toucher. Pas d'optimisation a l'aveugle.
- **Stop rule** : si le nombre de projets affectes par PR ne baisse pas apres le decoupage, le seam choisi est mauvais.

## 5. memo / useMemo partout sur une page React lente

- **Friction / optim** : ajouter memo et useMemo sur toute une page jugee lente.
- **Axes** : gain vise sur l'UX (performance percue) ; cout sur Change.
- **Gain local** : potentiellement une page plus fluide.
- **Cout deplace** : complexite, lisibilite, maintenance, dependances de hooks a tenir a jour. Optimiser une zone non mesuree peut ne rien gagner et tout alourdir.
- **Decision** : profiler avant, optimiser seulement les zones mesurees comme couteuses, retirer ce qui n'apporte pas de gain visible.
- **Stop rule** : si le profiler ne montre pas de gain mesurable, on retire les memo.
