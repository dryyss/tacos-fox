# Tacos Fox : site de commande en ligne

Next.js 15 (App Router, React 19, TypeScript), PostgreSQL (Prisma), Auth.js, Stripe Checkout, Resend.
Référence fonctionnelle : `../pics/CDC-0006_Tacos_Fox.pdf` (formule Pro). Maquette d'origine : `../site/`.

## Démarrer en local

```bash
cp .env.example .env          # renseigner DATABASE_URL / DATABASE_URL_UNPOOLED (branche Neon de dev), AUTH_SECRET, AUTH_AUTH0_ID / SECRET / ISSUER
npm install
npm run db:migrate            # applique les migrations
npm run db:seed               # carte, zones, horaires, compte gérant
npm run dev
```

La base de développement est une branche Neon du projet `tacos-fox` (jamais `production`). Alternative hors ligne : `docker compose up -d` (PostgreSQL sur le port 5434, chaînes commentées dans `.env.example`).

- Site : http://localhost:3000
- Gestion : http://localhost:3000/admin (compte Auth0 ayant le rôle `tacosfox:admin` ou `tacosfox:staff`)
- Connexion : uniquement via Auth0 (e-mail, Google, Apple, Microsoft). Les rôles se donnent dans Auth0 (User Management → Users → Roles) et sont repris à la connexion suivante.
- Sans clé Stripe, le paiement carte est simulé (développement uniquement). Sans clé Resend, les e-mails sont écrits dans la console.

`npm run db:seed` ne touche pas à une carte existante. Pour la recharger depuis le relevé `prisma/catalog-source.cjs` : `npm run db:seed -- --reset-catalog` (écrase les modifications faites dans la gestion).

## Vérifications

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Organisation

| Dossier | Rôle |
|---|---|
| `src/app/(site)` | site client : accueil, carte, panier, retrait, paiement, suivi, compte, pages légales |
| `src/app/(admin)/admin` | gestion : commandes en direct, historique, carte, promos, livraison, réglages, comptabilité, QR code |
| `src/app/(print)` | ticket de caisse 80 mm |
| `src/app/api` | devis, commandes, webhook Stripe, suivi, factures, photos, exports |
| `src/lib/pricing.ts` | moteur de prix unique (client pour l'affichage, serveur pour l'encaissement) |
| `src/lib/quote.ts`, `orders.ts` | recalcul serveur du panier, création de commande, paiement |
| `src/lib/hours.ts` | horaires et créneaux, toujours en heure de Paris |
| `src/lib/prisma.ts` | client Prisma (adapter `pg`, pool Neon réutilisé sur Vercel) |
| `prisma` | schéma, migrations, seed et relevé de la carte |
| `docs` | documentation de déploiement (Vercel + Neon) |
| `clevercloud` | ancienne procédure Clever Cloud, conservée pour mémoire |

Règles importantes :

- **Les prix ne viennent jamais du navigateur.** Le panier n'envoie que des identifiants ; `quoteCart` recalcule tout (options, tailles, pizza offerte, zone, promo, minimum).
- Montants en **centimes** partout.
- Les photos sont stockées en base (table `Image`), le disque Vercel n'étant pas persistant.
- Numéros de facture séquentiels par année (`F-2026-00001`), attribués quand la commande est remise au client.

Déploiement (Vercel + Neon) : voir [`docs/DEPLOY-vercel.md`](docs/DEPLOY-vercel.md).
