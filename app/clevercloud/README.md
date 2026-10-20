> **Obsolète** : l'hébergement retenu est Vercel + Neon (voir [`../docs/DEPLOY-vercel.md`](../docs/DEPLOY-vercel.md)). Ce fichier est conservé pour mémoire.

# Déploiement Clever Cloud

Application **Node.js** (Node 22) + add-on **PostgreSQL**, région Paris.

## Variables d'environnement (console Clever Cloud)

| Variable | Valeur |
|---|---|
| `CC_POST_BUILD_HOOK` | `npm run build:deploy` (génère Prisma, applique les migrations, build Next) |
| `DATABASE_URL` | fournie par l'add-on PostgreSQL (`POSTGRESQL_ADDON_URI`) |
| `AUTH_SECRET` | chaîne aléatoire : `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_TRUST_HOST` | `true` |
| `APP_URL` | `https://tacosfox.fr` (sans slash final) |
| `STRIPE_SECRET_KEY` | clé secrète **live** du compte Stripe du restaurant |
| `STRIPE_WEBHOOK_SECRET` | secret du webhook (voir ci-dessous) |
| `RESEND_API_KEY` | clé Resend, domaine d'envoi vérifié |
| `EMAIL_FROM` | `Tacos Fox <commandes@tacosfox.fr>` |

Le démarrage utilise `npm start` (`next start`), qui écoute sur `PORT` fourni par Clever Cloud.

## Stripe

Dans le tableau de bord Stripe, créer un webhook vers `https://tacosfox.fr/api/stripe/webhook` avec les événements :

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `charge.refunded`

Sans clé Stripe, le paiement carte est **simulé en développement** et **indisponible en production** (le paiement sur place reste possible).

## Premier déploiement

1. Déployer (les migrations s'appliquent au build).
2. Semer la carte et le compte gérant une seule fois, depuis un poste ayant accès à la base :
   `SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... DATABASE_URL=... npm run db:seed`
3. Se connecter sur `/connexion` avec ce compte, puis compléter **Horaires et réglages** (raison sociale, SIRET, adresse, téléphone) : ces champs alimentent les mentions légales, les CGV et les factures.
