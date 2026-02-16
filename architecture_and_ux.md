# Choix d'Architecture, Stack Technique et Expérience Utilisateur

Ce document justifie les choix techniques et conceptuels pour le projet **L'InviThé Gourmand**.

## 1. Stack Technique

### Backend : Node.js & Express avec TypeScript
- **Pourquoi Node.js ?** Pour son modèle non-bloquant (I/O) idéal pour les applications web gérant de nombreuses requêtes simultanées, et pour l'écosystème npm vaste.
- **Pourquoi TypeScript ?** Pour le typage statique qui réduit drastiquement les bugs à l'exécution, améliore la maintenabilité et l'autocomplétion (Developer Experience).
- **Pourquoi Express ?** Framework minimaliste, robuste et standard de l'industrie pour les API et serveurs web Node.js.

### Base de Données : SQLite & Prisma ORM
- **Pourquoi SQLite (Dev) ?** Zéro configuration, fichier unique, idéal pour le développement et le prototypage rapide. Facilement migrable vers PostgreSQL ou MySQL en production.
- **Pourquoi Prisma ?**
  - **Type-safety** : Les requêtes sont validées à la compilation.
  - **Productivité** : Schéma déclaratif (`schema.prisma`) clair.
  - **Migrations** : Gestion automatique des évolutions de la base de données.

### Frontend : EJS (Server-Side Rendering) & TailwindCSS
- **Pourquoi EJS (SSR) ?**
  - **SEO** : Le contenu est généré sur le serveur, garantissant une indexation parfaite par les moteurs de recherche (crucial pour un commerce local).
  - **Performance** : "First Contentful Paint" rapide car le HTML arrive déjà prêt.
  - **Simplicité** : Pas besoin de complexité SPA (React/Vue/Angular) + API REST complète pour un site vitrine/e-commerce simple.
- **Pourquoi TailwindCSS ?** Pour le développement rapide d'interfaces modernes, responsive-first, sans écrire de CSS arbitraire ("utility-first").

## 2. Architecture Logicielle

L'application suit le **pattern MVC (Modèle-Vue-Contrôleur)** classique :

- **Modèles (Prisma)** : Définition des données (Produits, Commandes, Users).
- **Vues (EJS)** : Templates HTML qui affichent les données.
- **Contrôleurs** : Logique métier qui reçoit la requête, interroge le modèle, et renvoie la vue.

### Structure des dossiers
- `src/controllers` : Orchestration de la logique.
- `src/models` : Instances Prisma et logique de données.
- `src/routes` : Définition des URLs et middlewares.
- `src/services` : Logique métier complexe (ex: envoi d'emails, gestion Stripe) découplée des contrôleurs.
- `views/` : Templates d'interface.

## 3. Documentation API (Swagger)

Une documentation interactive de l'API (OpenAPI 3.0) est intégrée au projet.

- **URL locale** : [`http://localhost:3000/api-docs`](http://localhost:3000/api-docs)
- **Fichier de définition** : `src/swagger.json`
- **Fonctionnalités documentées** :
  - Listage et détail des produits.
  - Ajout au panier.
  - Processus de commande (Stripe).
  - Gestion des contacts.

## 4. Expérience Utilisateur (UX)

### Pour le Visiteur (Client)
- **Fluidité** : Navigation rapide grâce au rendu serveur et à l'optimisation des assets.
- **Accessibilité** : Design clair, contraste soigné, structure sémantique (H1, H2...).
- **Responsive** : Site parfaitement et nativement adapté aux mobiles (Mobile-First via Tailwind).
- **Réassurance** : Pages légales claires, contact facile, confirmation de commande immédiate.

### Pour l'Administrateur (Back-Office)
- **Indépendance** : Gestion totale du catalogue (Produits, Catégories, Stocks) sans toucher au code.
- **Efficacité** : Dashboard avec statistiques clés (Chiffre d'affaires, commandes récentes) pour un pilotage rapide.
- **Sécurité** : Routes protégées, authentification robuste.
