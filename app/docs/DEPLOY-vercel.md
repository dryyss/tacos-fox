# Déploiement Vercel + Neon

Application Next.js hébergée sur **Vercel** (fonctions en région `fra1`, Francfort), base **PostgreSQL Neon** : projet `tacos-fox` (id `patient-tooth-82388366`), région `aws-eu-central-1` (Francfort), branche `production`.

## 1. Créer le projet Vercel

1. *Add New… > Project*, importer le dépôt Git.
2. **Root Directory** : `app`.
3. **Framework Preset** : Next.js.
4. **Build Command** : `npm run build:deploy` (déjà fixé par `vercel.json`, qui prime sur la console). Ce script enchaîne `prisma generate`, `prisma migrate deploy` et `next build`.
5. **Install Command** et **Output Directory** : valeurs par défaut.
6. *Settings > General > Node.js Version* : **22.x** (cohérent avec `engines` du `package.json`).
7. *Settings > Functions > Function Region* : **`fra1`** (également fixé par `vercel.json`), pour que les fonctions soient à côté de la base Neon de Francfort.

## 2. Variables d'environnement

*Settings > Environment Variables*. Chaque variable est saisie séparément pour **Production** et pour **Preview** : les valeurs diffèrent (base, clés Stripe, URL).

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | chaîne **poolée** de la branche Neon `production` (hôte `…-pooler…`, `sslmode=require`) | chaîne poolée d'une branche Neon de préversion (voir § 3) |
| `DATABASE_URL_UNPOOLED` | chaîne **directe** de la branche `production` (hôte sans `-pooler`) : migrations Prisma | chaîne directe de la branche de préversion |
| `AUTH_SECRET` | chaîne aléatoire : `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | autre chaîne aléatoire |
| `AUTH_TRUST_HOST` | `true` | `true` |
| `APP_URL` | `https://tacosfox.fr` (sans slash final) | URL de préversion stable, par exemple l'URL de branche `https://<projet>-git-<branche>-<équipe>.vercel.app` |
| `STRIPE_SECRET_KEY` | clé secrète **live** du compte Stripe **plateforme** (compte Tacos Fox, Connect activé) | clé **test** (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | secret du webhook live du compte plateforme (§ 5) | secret d'un webhook de test, ou vide |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | secret du webhook live « comptes connectés » (§ 5) : paiements des restaurants | idem en test |
| `RESEND_API_KEY` | clé Resend, domaine d'envoi vérifié | clé Resend (ou vide : les e-mails sont alors écrits dans les journaux) |
| `EMAIL_FROM` | `Tacos Fox <commandes@tacosfox.fr>` | idem |

Les comptes et rôles se gèrent dans Auth0 (Action `tacosfox-roles`) : `tacosfox:superadmin` (MAGAR), `tacosfox:admin` (gérant, les 5 restaurants) et, pour chaque équipier, `tacosfox:staff:<restaurant>` qui le rattache à son restaurant (`stains-marcel-cachin`, `stains-louis-bordes`, `dugny-22-lariviere`, `dugny-21-lariviere`, `blanc-mesnil`). Un équipier sans rôle de restaurant ne voit aucune commande. Ajouter ajouter `AUTH_AUTH0_ID`, `AUTH_AUTH0_SECRET` et `AUTH_AUTH0_ISSUER` sur Vercel. `NEON_BRANCH` ne sert qu'aux outils Neon en local.

Points d'attention :

- `APP_URL` sert aux URL de retour Stripe et aux liens des e-mails. Sans elle, le code retombe sur `http://localhost:3000` : elle est donc **obligatoire** dans chaque environnement.
- Les variables sont lues **au build** (migrations) et à l'exécution : après toute modification, redéployer.
- Sans `STRIPE_SECRET_KEY`, la commande en ligne est **impossible en production** (paiement par carte uniquement) ; la simulation n'existe qu'en développement local.
- En production, un restaurant n'accepte de commandes qu'une fois le compte Stripe de sa société actif (Gestion > Paiements). En mode test, ses paiements d'essai passent par le compte de test de la plateforme.

## 3. Base de données Neon

- L'application se connecte via `DATABASE_URL` (poolée, PgBouncer) avec `pg` + `@prisma/adapter-pg`. Sur Vercel, `attachDatabasePool` (`@vercel/functions`) réutilise le pool entre invocations.
- Prisma migrate et le seed utilisent `DATABASE_URL_UNPOOLED` (`directUrl` du schéma) : les migrations ne passent pas par PgBouncer.
- **Préversions** : utiliser une **branche Neon distincte** (par exemple `preview`, créée depuis `production`) et renseigner ses chaînes dans l'environnement Preview. Le build de chaque préversion exécute `prisma migrate deploy` : pointé sur la branche `production`, il appliquerait en production des migrations non fusionnées, et les commandes de test seraient écrites dans la base réelle. L'intégration Neon de Vercel peut aussi créer une branche par préversion et injecter les variables automatiquement ; vérifier alors qu'elle fournit bien `DATABASE_URL` et `DATABASE_URL_UNPOOLED` sous ces noms.

## 4. Premier déploiement

1. Déployer : les migrations s'appliquent au build sur la branche Neon visée.
2. Semer la carte, les zones, les horaires et le compte gérant **une seule fois**, depuis un poste, en visant explicitement la chaîne **directe** de la branche `production`. Le script `db:seed` charge `.env` (le fichier doit exister) mais les variables passées en ligne de commande priment ; renseigner impérativement `DATABASE_URL_UNPOOLED`, que le seed utilise en priorité, sinon il viserait la base de `.env`.

   ```bash
   DATABASE_URL_UNPOOLED="postgresql://…" npm run db:seed
   ```

   Sous PowerShell :

   ```powershell
   $env:DATABASE_URL_UNPOOLED="postgresql://…"; npm run db:seed
   ```

   Le seed ne touche pas à une carte existante ; ne pas utiliser `--reset-catalog` en production.
3. `npm run db:add-restaurants` crée ou met à jour les 5 restaurants (adresses et sociétés reprises des Kbis).
4. Se connecter sur `/connexion` avec un compte `tacosfox:superadmin`, puis compléter **Gestion > Restaurants** (téléphone, horaires, délai, n° de TVA, taux de TVA) et **Réglages du site** (société signataire pour les mentions légales). Ouvrir enfin la commande en ligne de chaque restaurant.

## 5. Webhook Stripe

Dans le tableau de bord Stripe (mode **live**), créer un webhook vers `https://<domaine>/api/stripe/webhook` (soit `https://tacosfox.fr/api/stripe/webhook`) avec les événements gérés par la route :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `charge.refunded`

Copier le secret de signature (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET` (Production).

Paiements des restaurants (Stripe Connect, charges directes) : créer un **second** webhook, de type « événements des comptes connectés », vers la même adresse, avec les mêmes événements plus `account.updated`. Copier son secret dans `STRIPE_CONNECT_WEBHOOK_SECRET`, puis redéployer.

Ouverture des comptes : **Gestion > Paiements** (MAGAR), un compte Stripe Standard par société, rempli avec le gérant (pièce d'identité, Kbis, RIB, téléphone). Les paiements arrivent directement sur ce compte, sans commission.

Pour tester en préversion, créer un webhook distinct en mode test vers l'URL de préversion. Si la **Deployment Protection** de Vercel est active sur les préversions, Stripe reçoit une 401 : ajouter un contournement (*Protection Bypass for Automation*) ou tester le webhook en local avec `npm run stripe:listen`.

## 6. Domaine personnalisé

1. *Settings > Domains* : ajouter `tacosfox.fr` et `www.tacosfox.fr` (redirection de l'un vers l'autre).
2. Chez le registrar, créer les enregistrements DNS indiqués par Vercel (A pour l'apex, CNAME pour `www`). Le certificat HTTPS est émis automatiquement.
3. Vérifier que `APP_URL` (Production) correspond exactement au domaine retenu, et que l'URL du webhook Stripe l'utilise.
4. Resend : les enregistrements DNS du domaine d'envoi (SPF, DKIM) restent à déclarer chez le registrar, indépendamment de Vercel.

## 7. Photos

Les photos sont stockées **en base** (table `Image`) et servies par `src/app/api` : rien n'est écrit sur le disque, ce qui convient au système de fichiers éphémère de Vercel. Aucun stockage externe n'est nécessaire.

## Comptes de l'équipe (R8) et page de connexion

Script `scripts/auth0-team.mjs` (lit `AUTH_AUTH0_ISSUER`, `auth0_m2m_id`, `auth0_m2m_key` dans `.env`). Il ne touche qu'aux rôles `tacosfox:*` et à l'application Tacos Fox, le tenant servant à d'autres projets.

```
node scripts/auth0-team.mjs roles                                   # crée tacosfox:superadmin et tacosfox:staff:<restaurant>
node scripts/auth0-team.mjs add prenom@exemple.fr stains-marcel-cachin   # crée le compte, affiche le mot de passe
node scripts/auth0-team.mjs grant moi@gmail.com superadmin          # rôle sur un compte existant (Google compris)
node scripts/auth0-team.mjs list                                    # qui a quel rôle
node scripts/auth0-team.mjs logo https://<site>/logo.png            # logo de la page de connexion Auth0
```

## Sécurité en place

- En-têtes HTTP sur toutes les pages (`next.config.ts`) : CSP (scripts et styles du site seulement, plan Google Maps, redirections Auth0 et Stripe), HSTS 2 ans, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, pas d'en-tête `X-Powered-By`. `/admin` et `/suivi` : jamais en cache, `noindex`.
- Limite de requêtes par adresse IP (`src/lib/rate-limit.ts`) : 10 commandes / 10 min, 120 recalculs de panier / min, 30 factures / min. En mémoire, par instance Vercel : un frein contre les robots, pas un quota exact.
- Lien de suivi et facture : jeton aléatoire de 192 bits par commande.
- Prix toujours recalculés côté serveur ; paiement vérifié par webhook signé (compte, montant, session) ; aucune donnée de carte sur le site.
- Équipe : Auth0 uniquement, rôles par restaurant ; un équipier ne voit et ne modifie que les commandes de son restaurant.
- Dépendances : Next.js 15.5.28 (faille critique corrigée). Restent signalées par `npm audit`, sans exposition sur le site en ligne : l'outil en ligne de commande Prisma (corrigé en Prisma 7) et le PostCSS interne de Next (corrigé en Next 16), utilisés seulement à la compilation.
