# Fonctionnalités livrées · formule Essentiel, 5 restaurants

Référence : cahier des charges **CDC-0007** et devis **DEV-2026-TFX-004**. Seul ce qui y figure est développé ; les options (O1 à O18) restent coupées.

Légende : ✅ fait · ⏳ fait, attend des éléments du client.

## Côté client

| CDC | Module | État | Où | Ce qui est fait |
|---|---|---|---|---|
| C1 | Accueil | ✅ | `/` | Promotions (vitrine), incontournables, badge halal, les 5 restaurants avec ouvert/fermé et horaires du jour, bouton Commander. |
| C2 | Choix du restaurant | ✅ | `/restaurants`, `/r/<restaurant>` | Liste avec adresse et horaires. Choix mémorisé (cookie), rappelé en haut de chaque page et dans le tunnel, modifiable avant le paiement. Sans restaurant, la carte et le panier renvoient d'abord au choix. |
| C3 | La carte | ✅ ⏳ | `/carte` | Carte du restaurant choisi : catégories, photos du restaurant (103 photos Uber associées aux plats), compositions, allergènes. Carte commune, plus des produits réservés à un restaurant et, par restaurant, un produit masqué (rupture) ou un prix propre. ⏳ Différences de la carte du 5e restaurant (Blanc-Mesnil) à recevoir. |
| C4 | Composer son tacos ou menu | ✅ ⏳ | fiche produit | Taille, viandes, sauces, suppléments, boisson. Burgers et sandwichs « seul ou menu » : le client choisit, la boisson et les frites ne sont demandées qu'en menu. ⏳ Prix seul = menu − 2,50 € (provisoire, à confirmer par le client). Prix recalculé à chaque choix, et toujours recalculé par le serveur au paiement. Pizza « 1 achetée = 1 offerte » (Senior et Mega) calculée automatiquement. |
| C5 | Panier, à emporter | ✅ | `/panier`, `/commande` | À emporter uniquement. Créneaux selon les horaires et le délai du restaurant. Le restaurant fermé ou dont la commande en ligne est coupée refuse la commande. |
| C6 | Paiement sécurisé | ✅ | Stripe Checkout | Carte uniquement, 3-D Secure, aucune donnée de carte sur le site. |
| C7 | Suivi et facture | ✅ | `/suivi/<n°>`, e-mail | Statuts reçue, en préparation, prête. Restaurant de retrait avec itinéraire. E-mail de confirmation avec la facture PDF en pièce jointe (envoi actif dès que la clé Resend est posée). |
| C8 | Pages villes | ✅ | `/restaurants/<restaurant>` | Une page par restaurant : adresse, horaires, itinéraire, plan, lien de commande, balisage « restaurant local » (JSON-LD), plan du site. |
| C9 | Pages légales | ✅ ⏳ | `/mentions-legales`, `/cgv`, `/confidentialite`, `/allergenes` | Les 5 sociétés vendeuses (forme, capital, RCS), hébergeur réel, paiement carte uniquement. ⏳ Société signataire, médiateur de la consommation et allergènes à recevoir. |

## Côté restaurant

| CDC | Module | État | Où | Ce qui est fait |
|---|---|---|---|---|
| R1 | Réception des commandes | ✅ | `/admin` | Les commandes payées arrivent sans recharger la page, dans le restaurant choisi par le client. Plusieurs écrans restent synchronisés. |
| R2 | Écran cuisine | ✅ | `/admin` | Colonnes À préparer, En préparation, Prêtes. Classées par heure de retrait. Un appui fait avancer la commande ; remise au client, elle quitte l'écran et reste dans l'historique. |
| R3 | Alertes | ✅ | `/admin` | Bouton pour autoriser le son à l'ouverture. Alerte sonore et onglet qui clignote, répétés toutes les 10 secondes tant qu'une commande attend. |
| R4 | Factures | ✅ | PDF | Émise au paiement, au nom de la société du restaurant (raison sociale, forme, capital, RCS, adresse), numérotation continue propre à chaque société : `F-LSF-2026-00001`. ⏳ N° de TVA et taux de TVA à confirmer par le comptable. |
| R5 | Encaissement séparé | ✅ ⏳ | Gestion > Paiements | Stripe Connect, un compte Standard par société, paiement créé directement sur ce compte, sans commission. Remboursements depuis le compte qui a encaissé. ⏳ Ouverture des 5 comptes avec les gérants (pièce d'identité, RIB). |
| R6 | Historique | ✅ | `/admin/historique` | Recherche par numéro de commande ou de facture, nom, téléphone, dates, restaurant et statut. Lien vers chaque facture. Le gérant voit les 5 restaurants. |
| R7 | QR codes | ✅ | `/admin/qrcode` | Un QR code par restaurant qui ouvre directement sa carte, planche prête à imprimer, SVG à télécharger. |
| R8 | Comptes de l'équipe | ✅ ⏳ | Auth0 | Rôles gérant (5 restaurants) et équipe rattachée à son restaurant (`tacosfox:staff:<restaurant>`). Un équipier ne voit et ne modifie que les commandes de son restaurant. ⏳ Prénoms et e-mails de l'équipe à recevoir, rôles à créer dans le tenant Auth0 officiel. |

## Gestion par MAGAR Développement (sans l'option O1)

- **Gestion > Restaurants** : téléphone, e-mail, délai, créneaux, horaires, société qui encaisse, ouverture de la commande en ligne, et carte de chaque restaurant (masquer un produit, prix propre).
- **Gestion > Paiements** : ouverture accompagnée des comptes Stripe, partage d'un compte entre restaurants d'une même société.
- **Gestion > Options** : active une option quand elle est achetée.

## Retiré parce que hors formule

- Mode « sur place » et QR codes par table.
- Paiement au comptoir.
- Horaires généraux du site : chaque restaurant a les siens.

## Éléments attendus du client (LST-2026-TFX-002)

1. Téléphone, horaires et délai de préparation de chaque restaurant.
2. Numéros de TVA et taux de TVA (comptable) ; société signataire du devis pour les mentions légales.
3. Ouverture des comptes Stripe (une séance par société) et compte Stripe plateforme Tacos Fox.
4. Prénom et e-mail de chaque équipier, et nom des gérants.
5. Validation de la carte et des prix (desserts, boissons, paninis, crêpes, menu enfant en « prix à confirmer »), différences de Blanc-Mesnil, allergènes.
6. Photos des devantures et de la bannière d'accueil ; photos des plats sans photo Uber (Crousty Fox, Fish Burger, assiette Escalope, sandwichs au four, croque-monsieur, milkshakes, smoothies, desserts, boissons), qui gardent pour l'instant un visuel provisoire.
7. Médiateur de la consommation, certificat halal, nom de domaine, fiches Google.

Plats présents sur Uber Eats mais absents du relevé de carte (non ajoutés, prix inconnus) : Best Of Fox, Charolais Fox, Triple, burger Végé, assiette Kefta, pâtes Fromages, Poulet, Saumon, Spaghetti bolognaise, Tagliatelles carbonara, crêpes Nutella coco et Poulet, menus enfant burger, crêpe, tacos et tenders.

## Recette (CDC § 07) : comment vérifier

1. Choisir chaque restaurant depuis `/restaurants`, commander, payer avec une carte de test : la commande apparaît sur l'écran cuisine du bon restaurant (onglet), avec le son.
2. Faire avancer la commande : le statut change sur la page de suivi du client.
3. Ouvrir la facture : société et numéro du restaurant.
4. Se connecter avec un compte `tacosfox:staff:<restaurant>` : seules ses commandes sont visibles.
5. Scanner chaque QR code : il ouvre la carte du bon restaurant.
