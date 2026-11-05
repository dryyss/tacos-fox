# Déploiement Clever Cloud + OVH

Site Next.js sur **Clever Cloud** (Node 22, région Paris), base **PostgreSQL Neon** (Francfort, déjà en place), nom de domaine chez **OVH**.

Le dépôt Git a le site dans le dossier `app/`. Clever Cloud le cible avec `APP_FOLDER=app`.

## 1. Application Node.js

Dans la console Clever Cloud (organisation SL Formation) :

1. *Create > An application > Node.js*
2. Région **Paris (`par`)**
3. Scalabilité : au moins **XS** en run, flavor de **build M** (le `next build` a besoin de RAM)
4. Brancher le dépôt GitHub `dryyss/tacos-fox`, ou ajouter le remote Git Clever Cloud et pousser `main`

Variables Clever Cloud (onglet *Environment variables*) :

| Variable | Valeur |
|---|---|
| `APP_FOLDER` | `app` |
| `CC_NODE_VERSION` | `22` |
| `CC_NODE_DEV_DEPENDENCIES` | `install` |
| `CC_POST_BUILD_HOOK` | `cd app && npm run build:deploy` |
| `CC_RUN_COMMAND` | `cd app && npx next start -H 0.0.0.0` |
| `CC_HEALTH_CHECK_PATH` | `/robots.txt` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | chaîne **poolée** Neon (`…-pooler…`, `sslmode=require`) |
| `DATABASE_URL_UNPOOLED` | chaîne **directe** Neon (sans `-pooler`) |
| `AUTH_SECRET` | chaîne aléatoire |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | même valeur que `APP_URL` (sinon Auth.js voit `0.0.0.0:8080` derrière le proxy Clever) |
| `AUTH_AUTH0_ID` | identifiant de l'application Auth0 |
| `AUTH_AUTH0_SECRET` | secret Auth0 |
| `AUTH_AUTH0_ISSUER` | `https://dev-zajf3pvu6p66a2c0.us.auth0.com` |
| `APP_URL` | `https://tacosfox.fr` (sans slash), ou `https://tacosfox.com` selon le domaine OVH retenu |
| `STRIPE_SECRET_KEY` | clé secrète Stripe (test `sk_test_` puis live) |
| `STRIPE_WEBHOOK_SECRET` | secret du webhook vers ce domaine |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | secret du webhook « comptes connectés » |
| `RESEND_API_KEY` | clé Resend (vide = e-mails seulement dans les journaux) |
| `EMAIL_FROM` | `Tacos Fox <commandes@tacosfox.fr>` |
| `CRON_SECRET` | chaîne aléatoire pour `/api/cron/payments` |

`npm start` lance `next start -H 0.0.0.0` et écoute le `PORT` fourni par Clever Cloud (8080).

Après chaque changement de variable : redéployer.

## 2. Domaine OVH (`tacosfox.com`)

Les noms `tacosfox.com` et `www.tacosfox.com` sont déjà déclarés sur l'app Clever Cloud. `tacosfox.fr` n'est pas enregistré.

Chez OVH, zone DNS de `tacosfox.com` (Manager > Domaines > Zone DNS) :

| Type | Nom | Cible |
|---|---|---|
| `CNAME` | `www` | `domain.par.clever-cloud.com.` (point final si OVH le demande) |
| `A` | `@` | `91.208.207.214` `91.208.207.215` `91.208.207.216` `91.208.207.217` `91.208.207.218` `91.208.207.220` `91.208.207.221` `91.208.207.222` `91.208.207.223` |

Supprimer l'A actuel `51.91.236.255` (page OVH « Site en construction ») et l'AAAA `2001:41d0:301::29` s'il est encore là.

Laisser se propager. Clever Cloud émet le certificat HTTPS tout seul une fois le DNS bon.

Ensuite :

4. `APP_URL` = `https://tacosfox.com` (sans slash), puis redémarrer l'app.
5. Auth0 : callbacks déjà ajoutés pour l'URL Clever Cloud et `tacosfox.com` / `www`.
6. Stripe : webhook vers `https://tacosfox.com/api/stripe/webhook` (événements checkout + `charge.refunded` ; second webhook Connect + `account.updated`).
7. Resend : SPF / DKIM du domaine d'envoi, toujours dans la zone OVH.

## 3. Premier déploiement

1. Pousser `main` : le hook exécute `prisma generate`, `prisma migrate deploy`, `next build`.
2. Semer **une seule fois** depuis un poste, sur la chaîne **directe** Neon production (déjà fait si la base contient la carte).
3. Cron paiements : `clevercloud/cron.json` appelle `clevercloud/payments.sh` toutes les 5 min (UTC) sur l'instance 0. Fichiers à commiter puis redéployer.

## 4. Stripe et restaurants

En production, un restaurant n'encaisse qu'avec le compte Stripe de sa société actif (*Gestion > Paiements*). Les clés `sk_test_` servent aux essais. Passer aux clés **live** avant l'ouverture.

Les photos sont en base (table `Image`) : le disque de l'instance n'a rien à persister.
