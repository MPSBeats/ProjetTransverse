# Technical Design - InviThé Gourmand

## 1. Diagramme de Cas d'Utilisation (UML)

**Rôle :** Analyser le besoin.
**Acteurs :**
- **Visiteur/Client** : Consulte le site, commande, contacte.
- **Administrateur** : Gère le catalogue, les commandes, les stocks, etc.

```mermaid
graph TD
    %% Custom styles
    classDef actorStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b;
    classDef adminStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#e65100;
    classDef ucStyle fill:#ffffff,stroke:#333333,stroke-width:1px,rx:10,ry:10;

    subgraph "Front-Office (Visiteur)"
        direction TB
        V[Visiteur]:::actorStyle
        V -->|Consulter| UC1([Voir Accueil/Menu/Boutique]):::ucStyle
        V -->|Consulter| UC2([Voir Détail Produit]):::ucStyle
        V -->|Action| UC3([Ajouter au Panier]):::ucStyle
        V -->|Action| UC4([Passer Commande]):::ucStyle
        V -->|Action| UC5([Envoyer Message Contact]):::ucStyle
        V -->|Action| UC6([Laisser un Avis]):::ucStyle
    end

    subgraph "Back-Office (Admin)"
        direction TB
        A[Administrateur]:::adminStyle
        A -->|Auth| UC7([Login / Logout]):::ucStyle
        A -->|Gestion| UC8([Gérer Produits]):::ucStyle
        A -->|Gestion| UC9([Gérer Catégories]):::ucStyle
        A -->|Gestion| UC10([Gérer Commandes & Export]):::ucStyle
        A -->|Gestion| UC11([Gérer Stocks]):::ucStyle
        A -->|Gestion| UC12([Gérer Codes Promo]):::ucStyle
        A -->|Gestion| UC13([Modérer Avis]):::ucStyle
        A -->|Visualiser| UC14([Dashboard Stats]):::ucStyle
    end
```

## 2. MCD (Modèle Conceptuel de Données) - Merise

**Rôle :** Structurer la base de données.
**Description :** Met en évidence les entités et relations.

```mermaid
erDiagram
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
    classDef controller fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px;
    classDef service fill:#fff3e0,stroke:#ef6c00,stroke-width:1px;
    classDef model fill:#e3f2fd,stroke:#1565c0,stroke-width:1px;
    classDef app fill:#f3e5f5,stroke:#7b1fa2,stroke-width:1px;
    classDef system fill:#ffffff,stroke:#333,stroke-width:1px;

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
