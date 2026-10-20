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
| `STRIPE_SECRET_KEY` | clé secrète **live** du compte Stripe du restaurant | clé **test** (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | secret du webhook live (§ 5) | secret d'un webhook de test, ou vide |
| `RESEND_API_KEY` | clé Resend, domaine d'envoi vérifié | clé Resend (ou vide : les e-mails sont alors écrits dans les journaux) |
| `EMAIL_FROM` | `Tacos Fox <commandes@tacosfox.fr>` | idem |

`SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` ne servent qu'au seed lancé depuis un poste (§ 4) : ne pas les déclarer sur Vercel. `NEON_BRANCH` ne sert qu'aux outils Neon en local.

Points d'attention :

- `APP_URL` sert aux URL de retour Stripe et aux liens des e-mails. Sans elle, le code retombe sur `http://localhost:3000` : elle est donc **obligatoire** dans chaque environnement.
- Les variables sont lues **au build** (migrations) et à l'exécution : après toute modification, redéployer.
- Sans `STRIPE_SECRET_KEY`, le paiement carte est **indisponible en production** (le paiement sur place reste possible) ; la simulation n'existe qu'en développement local.

## 3. Base de données Neon

- L'application se connecte via `DATABASE_URL` (poolée, PgBouncer) avec `pg` + `@prisma/adapter-pg`. Sur Vercel, `attachDatabasePool` (`@vercel/functions`) réutilise le pool entre invocations.
- Prisma migrate et le seed utilisent `DATABASE_URL_UNPOOLED` (`directUrl` du schéma) : les migrations ne passent pas par PgBouncer.
- **Préversions** : utiliser une **branche Neon distincte** (par exemple `preview`, créée depuis `production`) et renseigner ses chaînes dans l'environnement Preview. Le build de chaque préversion exécute `prisma migrate deploy` : pointé sur la branche `production`, il appliquerait en production des migrations non fusionnées, et les commandes de test seraient écrites dans la base réelle. L'intégration Neon de Vercel peut aussi créer une branche par préversion et injecter les variables automatiquement ; vérifier alors qu'elle fournit bien `DATABASE_URL` et `DATABASE_URL_UNPOOLED` sous ces noms.

## 4. Premier déploiement

1. Déployer : les migrations s'appliquent au build sur la branche Neon visée.
2. Semer la carte, les zones, les horaires et le compte gérant **une seule fois**, depuis un poste, en visant explicitement la chaîne **directe** de la branche `production`. Le script `db:seed` charge `.env` (le fichier doit exister) mais les variables passées en ligne de commande priment ; renseigner impérativement `DATABASE_URL_UNPOOLED`, que le seed utilise en priorité, sinon il viserait la base de `.env`.

   ```bash
   DATABASE_URL_UNPOOLED="postgresql://…" SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:seed
   ```

   Sous PowerShell :

   ```powershell
   $env:DATABASE_URL_UNPOOLED="postgresql://…"; $env:SEED_ADMIN_EMAIL="..."; $env:SEED_ADMIN_PASSWORD="..."; npm run db:seed
   ```

   Le seed ne touche pas à une carte existante ; ne pas utiliser `--reset-catalog` en production.
3. Se connecter sur `/connexion` avec ce compte, puis compléter **Horaires et réglages** (raison sociale, SIRET, adresse, téléphone) : ces champs alimentent les mentions légales, les CGV et les factures.

## 5. Webhook Stripe

Dans le tableau de bord Stripe (mode **live**), créer un webhook vers `https://<domaine>/api/stripe/webhook` (soit `https://tacosfox.fr/api/stripe/webhook`) avec les événements gérés par la route :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `charge.refunded`

Copier le secret de signature (`whsec_…`) dans `STRIPE_WEBHOOK_SECRET` (Production), puis redéployer.

Pour tester en préversion, créer un webhook distinct en mode test vers l'URL de préversion. Si la **Deployment Protection** de Vercel est active sur les préversions, Stripe reçoit une 401 : ajouter un contournement (*Protection Bypass for Automation*) ou tester le webhook en local avec `npm run stripe:listen`.

## 6. Domaine personnalisé

1. *Settings > Domains* : ajouter `tacosfox.fr` et `www.tacosfox.fr` (redirection de l'un vers l'autre).
2. Chez le registrar, créer les enregistrements DNS indiqués par Vercel (A pour l'apex, CNAME pour `www`). Le certificat HTTPS est émis automatiquement.
3. Vérifier que `APP_URL` (Production) correspond exactement au domaine retenu, et que l'URL du webhook Stripe l'utilise.
4. Resend : les enregistrements DNS du domaine d'envoi (SPF, DKIM) restent à déclarer chez le registrar, indépendamment de Vercel.

## 7. Photos

Les photos sont stockées **en base** (table `Image`) et servies par `src/app/api` : rien n'est écrit sur le disque, ce qui convient au système de fichiers éphémère de Vercel. Aucun stockage externe n'est nécessaire.
