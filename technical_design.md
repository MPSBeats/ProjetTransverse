# Technical Design - InviThé Gourmand

## 1. Diagramme de Cas d'Utilisation (UML)

**Rôle :** Analyser le besoin.
**Acteurs :**
- **Visiteur/Client** : Consulte le site, commande, contacte.
- **Administrateur** : Gère le catalogue, les commandes, les stocks, etc.

```mermaid
graph TD
    %% Styles
    classDef visitor fill:#E1F5FE,stroke:#0288D1,stroke-width:2px;
    classDef admin fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px;
    classDef usecase fill:#FFF,stroke:#333,stroke-width:1px;

    subgraph "Front-Office (Visiteur)"
        V[Visiteur]:::visitor
        V -->|Consulter| UC1[Voir Accueil/Menu/Boutique]:::usecase
        V -->|Consulter| UC2[Voir Détail Produit]:::usecase
        V -->|Action| UC3[Ajouter au Panier]:::usecase
        V -->|Action| UC4[Passer Commande]:::usecase
        V -->|Action| UC5[Envoyer Message Contact]:::usecase
        V -->|Action| UC6[Laisser un Avis]:::usecase
    end

    subgraph "Back-Office (Admin)"
        A[Administrateur]:::admin
        A -->|Auth| UC7[Login / Logout]:::usecase
        A -->|Gestion| UC8[Gérer Produits]:::usecase
        A -->|Gestion| UC9[Gérer Catégories]:::usecase
        A -->|Gestion| UC10[Gérer Commandes & Export]:::usecase
        A -->|Gestion| UC11[Gérer Stocks]:::usecase
        A -->|Gestion| UC12[Gérer Codes Promo]:::usecase
        A -->|Gestion| UC13[Modérer Avis]:::usecase
        A -->|Visualiser| UC14[Dashboard Stats]:::usecase
    end
```

## 2. MCD (Modèle Conceptuel de Données) - Merise

**Rôle :** Structurer la base de données.
**Description :** Met en évidence les entités et relations.

```mermaid
erDiagram
    %% Styles via thèmes Mermaid ou config
    %% Note: Mermaid ER diagram styling is limited compared to flowcharts.

    CATEGORY ||--|{ PRODUCT : "contient"
    PRODUCT ||--o{ ORDER_ITEM : "est commandé dans"
    PRODUCT ||--o{ STOCK_MOVEMENT : "a des mouvements de"
    PRODUCT ||--o{ REVIEW : "reçoit"
    ORDER ||--|{ ORDER_ITEM : "contient"
    ORDER ||--o{ STOCK_MOVEMENT : "génère"
    ORDER }|--o| PROMO_CODE : "utilise"

    CATEGORY {
        string name
        string slug
        string description
    }

    PRODUCT {
        string name
        string slug
        decimal price
        int stock
        boolean isActive
    }

    ORDER {
        string orderNumber
        string customerEmail
        string status
        decimal total
    }

    ORDER_ITEM {
        int quantity
        decimal unitPrice
    }

    STOCK_MOVEMENT {
        int quantityChange
        string reason
    }

    REVIEW {
        int rating
        string comment
        string status
    }

    ADMIN_USER {
        string email
        string role
    }

    PROMO_CODE {
        string code
        decimal discountValue
        boolean isActive
    }
```

## 3. MLD (Modèle Logique de Données) - Merise

**Rôle :** Montrer les tables SQL finales.
**Description :** Précise les clés primaires (PK) et clés étrangères (FK).

```mermaid
erDiagram
    categories {
        VARCHAR id PK
        VARCHAR name
        VARCHAR slug UK
        VARCHAR image_url
        INT display_order
    }

    products {
        VARCHAR id PK
        VARCHAR category_id FK
        VARCHAR name
        DECIMAL price
        INT stock
        BOOLEAN is_active
        TEXT description
    }

    orders {
        VARCHAR id PK
        VARCHAR order_number UK
        VARCHAR customer_email
        VARCHAR status
        DECIMAL total_amount
        VARCHAR stripe_session_id
    }

    order_items {
        VARCHAR id PK
        VARCHAR order_id FK
        VARCHAR product_id FK
        VARCHAR product_name
        INT quantity
        DECIMAL unit_price
    }

    stock_movements {
        VARCHAR id PK
        VARCHAR product_id FK
        VARCHAR order_id FK "Nullable"
        INT quantity_change
        VARCHAR reason
    }

    reviews {
        VARCHAR id PK
        VARCHAR product_id FK
        VARCHAR customer_email
        INT rating
        VARCHAR status
    }

    admin_users {
        VARCHAR id PK
        VARCHAR email UK
        VARCHAR password_hash
    }

    promo_codes {
        VARCHAR id PK
        VARCHAR code UK
        DECIMAL discount
        INT current_uses
    }

    products }o--|| categories : "FK_category_id"
    order_items }o--|| orders : "FK_order_id"
    order_items }o--|| products : "FK_product_id"
    stock_movements }o--|| products : "FK_product_id"
    stock_movements }o--|| orders : "FK_order_id"
    reviews }o--|| products : "FK_product_id"
```

## 4. Diagramme de Classes (UML)

**Rôle :** Architecture Code Back-end.
**Description :** Montre comment le code est organisé (Controllers, Services, Models/Prisma).

```mermaid
classDiagram
    %% Styles
    classDef controller fill:#E8F5E9,stroke:#2E7D32,stroke-width:2px;
    classDef service fill:#FFF3E0,stroke:#EF6C00,stroke-width:2px;
    classDef model fill:#E3F2FD,stroke:#1565C0,stroke-width:2px;
    classDef app fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px;

    %% Relations
    App --> PublicRoutes
    App --> AdminRoutes
    App --> ApiRoutes

    PublicRoutes --> ShopController
    PublicRoutes --> CartController
    AdminRoutes --> AdminController
    AdminRoutes --> AuthController

    ShopController ..> PrismaClient : uses
    CartController ..> PrismaClient : uses
    CartController ..> EmailService : uses
    AdminController ..> PrismaClient : uses
    AdminController ..> ImageService : uses
    ShopController ..> StripeService : uses

    %% Classes
    class App {
        +express()
        +listen()
    }
    class App app

    class ShopController {
        +homePage()
        +productPage()
        +menuPage()
    }
    class ShopController controller

    class CartController {
        +cartPage()
        +checkoutPage()
        +processCheckout()
    }
    class CartController controller

    class AdminController {
        +dashboard()
        +createProduct()
        +updateStock()
        +exportOrders()
        +manageReviews()
    }
    class AdminController controller

    class AuthController {
        +loginPage()
        +processLogin()
        +logout()
    }
    class AuthController controller

    class EmailService {
        +sendOrderConfirmation()
        +sendContactEmail()
    }
    class EmailService service

    class ImageService {
        +uploadMultiple()
        +optimizeImage()
    }
    class ImageService service

    class StripeService {
        +createCheckoutSession()
        +handleWebhook()
    }
    class StripeService service

    class PrismaClient {
        +product
        +category
        +order
        +user
    }
    class PrismaClient model
```
