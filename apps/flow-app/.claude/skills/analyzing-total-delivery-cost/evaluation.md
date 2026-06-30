# Auto-tests

Cinq scenarios pour verifier que le skill change vraiment le comportement. Pour chacun : l'input, le comportement attendu, les erreurs a eviter, les criteres de reussite. Si une reponse echoue a un critere, le skill (ou son usage) est a corriger.

## Scenario 1 - "Notre CI prend 20 min, optimise-la"

- **Comportement attendu** : reformuler l'intention (feedback plus rapide), classer en Ship, lister les leviers qui reduisent la duree sans reduire la couverture (parallelisation, cache de taches affectees, selection par impact, isolation des tests flaky), demander des preuves (duree p50/p95, taux de re-run, repartition par job).
- **Erreurs a eviter** : proposer de sauter des tests comme un gain ; annoncer un pourcentage de gain invente ; conclure sans preuve.
- **Reussite** : la reponse distingue "moins de temps" de "moins de travail", marque les indicateurs comme a mesurer, et donne une stop rule observable.

## Scenario 2 - "Claude a genere une grosse PR de refactor, est-ce rentable ?"

- **Comportement attendu** : reconnaitre le gain de cout d'entree, puis pointer le cout deplace vers review, tests, comprehension du diff (cout de validation IA) ; recommander petits lots, tests, preuves, review renforcee ; raisonner equipe, pas productivite individuelle.
- **Erreurs a eviter** : juger "rentable" parce que c'est rapide a generer ; ignorer la charge de review ; donner un verdict chiffre.
- **Reussite** : la decision est decouper / tester, pas merger tel quel ; la stop rule borne la taille de diff revue.

## Scenario 3 - "On veut ajouter un outil de cache Nx"

- **Comportement attendu** : classer en Build/Ship, nommer le gain (re-build et CI plus courts sur taches non affectees), chercher le cout deplace (cache empoisonne, faux verts, complexite de config, debug plus dur), demander preuves (taux de hit, taches affectees par PR, incidents de cache).
- **Erreurs a eviter** : presenter le cache comme un gain sans risque ; oublier le risque de faux positif (un test "passe" depuis le cache alors que le code a change).
- **Reussite** : la reponse mentionne le risque de fausse confiance et propose un pilote ou une cle de cache verifiable, avec stop rule sur les faux verts.

## Scenario 4 - "On veut documenter nos releases"

- **Comportement attendu** : classer en Run/Ship, identifier le cout actuel (transmission orale, deploiement stressant, rollback mal connu), recommander un golden path leger (chemin nominal, rollback, logs) avant toute automatisation lourde.
- **Erreurs a eviter** : proposer une doc exhaustive qui ne sera pas maintenue ; sauter directement a l'outillage.
- **Reussite** : la decision est documenter d'abord, avec un perimetre minimal utile et une stop rule (la doc est insuffisante si une release depend encore d'une personne unique).

## Scenario 5 - "On veut mettre useMemo partout sur une page lente"

- **Comportement attendu** : exiger un profil avant d'optimiser, classer le cout sur Change (lisibilite, maintenance), n'optimiser que les zones mesurees, prevoir le retrait si aucun gain visible.
- **Erreurs a eviter** : valider l'optimisation generalisee sans mesure ; confondre "page lente" ressentie et lenteur mesuree.
- **Reussite** : la reponse demande de profiler d'abord et donne une stop rule (retirer les memo si le profiler ne montre pas de gain).

## Critere transversal

Sur les cinq, verifier que la sortie : (1) suit le format de [SKILL.md](SKILL.md), (2) separe observe / mesure / suppose / propose / a verifier, (3) n'invente aucune metrique terrain, (4) finit par une stop rule observable.
