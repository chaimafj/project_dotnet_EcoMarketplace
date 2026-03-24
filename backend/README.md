# EcoMarketplace - Plateforme d'Échange Écologique

Une plateforme d'e-commerce durable dédiée à l'achat et la vente de produits recyclés et écologiques. Le projet combine un backend .NET 8.0 avec une base de données PostgreSQL et un frontend Angular avec TypeScript.

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Technologie](#technologie)
- [Installation](#installation)
- [Démarrage](#démarrage)
- [Features](#features)
- [Admin Credentials](#admin-credentials)
- [API Endpoints](#api-endpoints)
- [Structure du Projet](#structure-du-projet)
- [Modèle de Données](#modèle-de-données)

## Vue d'ensemble

**EcoMarketplace** est une plateforme d'e-commerce complète permettant aux utilisateurs de:
- S'enregistrer en tant que **Buyer** (Acheteur) ou **Seller** (Vendeur)
- Lister et acheter des produits écologiques
- Analyser leur empreinte carbone grâce à un **EcoScore**
- Accumuler des points et des badges de contribution écologique
- Gérer les transactions (achats et ventes)

Les administrateurs bénéficient d'un tableau de bord complet pour:
- Gérer tous les utilisateurs (statut, suppression)
- Gérer tous les produits (validation, suppression permanente)
- Consulter des statistiques détaillées (utilisateurs, produits, revenus multi-devises, CO2 savings)

## Architecture

```
frontend/                           backend/                               Database (PostgreSQL)
├── src/app/                        ├── Program.cs                         ├── Users
│   ├── features/                   ├── Features/                          ├── Products
│   ├── Services/                   ├── Application/                       ├── Transactions
│   ├── guards/                     ├── Infrastructure/                    ├── Badges
│   └── environments/               ├── Data/                              └── UserBadges
├── public/                         ├── Models/
├── dist/                           ├── Helpers/
└── legacy/ClientApp/               └── Middleware/
```

## Technologie

### Backend
- **Framework**: ASP.NET Core 8.0
- **Database ORM**: Entity Framework Core 8.0
- **Database**: PostgreSQL
- **Authentication**: JWT + BCrypt password hashing
- **Mapping**: AutoMapper
- **Patterns**: Repository Pattern, Dependency Injection

### Frontend
- **Framework**: Angular (Standalone Components)
- **Language**: TypeScript
- **Styling**: SCSS
- **HTTP Client**: HttpClient with RxJS
- **Forms**: Reactive Forms
- **Build**: Angular CLI

## Installation

### Prérequis
- **.NET SDK 8.0** ou supérieur
- **PostgreSQL** (base de données en cours d'exécution)
- **Node.js** 18+ et **npm**

### Étapes

1. **Clone le repository**
   ```bash
   git clone https://github.com/chaimafj/project_dotnet_EcoMarketplace.git
   cd Backend/EcoMarketplace.API
   ```

2. **Configure la base de données (PostgreSQL)**
   - Crée une base de données PostgreSQL nommée `ecomarketplace`
   - Mets à jour la chaîne de connexion dans `appsettings.Development.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=ecomarketplace;Username=your_user;Password=your_password"
     }
   }
   ```

3. **Installe les dépendances .NET**
   ```bash
   dotnet restore
   ```

4. **Applique les migrations de base de données**
   ```bash
   dotnet ef database update
   ```
   > Cette commande crée automatiquement les tables et seed le compte admin (admin@ecomarketplace.local / Admin123!)

5. **Installe les dépendances Frontend (Angular)**
   ```bash
  cd frontend
   npm install
   ```

## Démarrage

### Backend

**Terminal 1: Démarre l'API .NET**
```bash
cd Backend/EcoMarketplace.API
dotnet run --urls http://localhost:5201
```

L'API sera disponible sur `http://localhost:5201`

> **Admin auto-seedé**: Le compte administrateur est créé automatiquement au démarrage en mode développement
> - Email: `admin@ecomarketplace.local`
> - Password: `Admin123!`

### Frontend

**Terminal 2: Démarre le serveur de développement Angular**
```bash
cd Backend/EcoMarketplace.API/frontend
npm start
```

L'application sera disponible sur `http://localhost:4200`

### Compilation Frontend (Production)

Pour générer les fichiers optimisés:
```bash
cd Backend/EcoMarketplace.API/frontend
npm run build
```

Les fichiers compilés seront dans `frontend/dist/`

## Features

### ✅ Implémentées

#### Authentification & Autorisation
- Enregistrement avec sélection du rôle (Buyer/Seller)
- Connexion sécurisée avec JWT
- BCrypt password hashing
- Timeout de 10 secondes sur la connexion
- Rôle Admin réservé (non accessible via enregistrement public)

#### Gestion des Produits
- Listing des produits avec recherche
- Création de produits (vendeurs)
- Validation des produits (admin)
- Suppression permanente (admin avec confirmation)
- Support multi-devises (DT, EUR, USD)
- EcoScore et Carbon Footprint tracking

#### Admin Dashboard
- **Utilisateurs**: Liste complète, toggle statut (actif/inactif), suppression
- **Produits**: Liste, validation, suppression définitive
- **Statistiques**:
  - Total utilisateurs/produits
  - Transactions totales
  - Revenus par devise
  - CO2 économisé
  - Pourcentage moyen recyclé
  - Taux de validation des produits

#### Tableau de Bord Utilisateur
- Profil avec EcoScore
- Historique des achats/ventes
- Badges et récompenses

### 🔄 Fonctionnalités de Sécurité

- Protection CORS (Angular dev server: localhost:4200)
- Validation des rôles (Admin, Buyer, Seller)
- Hachage des mots de passe avec BCrypt
- Tokens JWT (actuellement au format développement: `fake-jwt-token-for-user-{id}`)
- Middleware de gestion des erreurs

## Admin Credentials

### Développement
- **Email**: `admin@ecomarketplace.local`
- **Password**: `Admin123!`
- **URL**: `http://localhost:5201`

Ces identifiants sont seeded automatiquement à chaque redémarrage en mode développement.

### Accès au Tableau de Bord Admin
1. Va sur `http://localhost:4200`
2. Clique sur "Se connecter"
3. Entre: `admin@ecomarketplace.local` / `Admin123!`
4. Accède au dashboard admin (route: `/admin-dashboard`)

## API Endpoints

### Authentication
```
POST   /api/auth/register         - Enregistrement utilisateur
POST   /api/auth/login            - Connexion utilisateur
```

### Products
```
GET    /api/products              - Liste tous les produits
POST   /api/products              - Crée un nouveau produit (Seller)
GET    /api/products/{id}         - Détails d'un produit
PUT    /api/products/{id}         - Update un produit
DELETE /api/products/{id}         - Archive un produit
```

### Users
```
GET    /api/users/{id}            - Profil utilisateur
PUT    /api/users/{id}            - Update profil utilisateur
```

### Transactions
```
GET    /api/transactions          - Historique des transactions
POST   /api/transactions          - Crée une transaction
```

### Admin Endpoints
```
GET    /api/admin/users           - Liste tous les utilisateurs (Admin only)
PUT    /api/admin/users/{id}/status - Toggle statut utilisateur (Admin only)
DELETE /api/admin/users/{id}      - Supprime un utilisateur (Admin only)

GET    /api/admin/products        - Liste tous les produits (Admin only)
DELETE /api/admin/products/{id}   - Supprime définitivement un produit (Admin only)
POST   /api/admin/validate-product/{id} - Valide un produit (Admin only)

GET    /api/admin/stats           - Statistiques globales (Admin only)
```

## Structure du Projet

### Backend Structure
```
EcoMarketplace.API/
├── backend/
│   ├── Program.cs                   - Entry point, DI configuration, seed logic
│   ├── Features/
│   │   ├── Auth/
│   │   ├── Products/
│   │   ├── Users/
│   │   ├── Transactions/
│   │   └── Admin/
│   ├── Application/
│   │   └── Services/
│   ├── Infrastructure/
│   │   └── Repositories/
│   ├── Models/
│   ├── Data/
│   ├── Middleware/
│   ├── Helpers/
│   └── Migrations/
├── Properties/
│   └── launchSettings.json          - Launch configuration
├── appsettings.json                 - Configuration globale
├── appsettings.Development.json     - Configuration développement
└── EcoMarketplace.API.csproj        - Project file
```

### Frontend Structure
```
frontend/
├── src/
│   ├── index.html                  - HTML index
│   ├── main.ts                     - Bootstrap Angular
│   ├── styles.scss                 - Global styles
│   └── app/
│       ├── app.ts                  - Root component
│       ├── app.routes.ts           - Route configuration
│       ├── features/
│       │   ├── admin-dashboard/    - Admin panel
│       │   ├── buyer-dashboard/    - Buyer dashboard
│       │   ├── seller-dashboard/   - Seller dashboard
│       │   ├── marketplace/        - Product listing
│       │   ├── product-detail/     - Détail produit
│       │   ├── cart/               - Panier
│       │   ├── login/              - Login form
│       │   ├── register/           - Registration form
│       │   └── profile/            - User profile
│       ├── Services/               - API calls and state services
│       ├── guards/                 - Route guards
│       ├── Database/               - Typed models/interfaces
│       └── environments/           - Frontend environment config
├── public/                         - Static frontend assets
├── package.json                    - npm dependencies
├── angular.json                    - Angular CLI configuration
└── legacy/ClientApp/               - Ancien frontend Angular 16
```

## Modèle de Données

### User (Utilisateur)
```csharp
public class User
{
    public int Id { get; set; }
    public string Email { get; set; }            // Unique
    public string Username { get; set; }         // Unique
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string PasswordHash { get; set; }
    public UserRole Role { get; set; }           // Buyer, Seller, Admin
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public int EcoScore { get; set; }
    public int TotalPoints { get; set; }
    public string ProfilePictureUrl { get; set; }
    public ICollection<Product> Products { get; set; }
    public ICollection<Transaction> Transactions { get; set; }
    public ICollection<UserBadge> Badges { get; set; }
}
```

### Product (Produit)
```csharp
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Price { get; set; }
    public Currency Currency { get; set; }       // DT, EUR, USD
    public ProductStatus Status { get; set; }    // Available, Pending, Removed
    public int SellerId { get; set; }
    public User Seller { get; set; }
    public int? EcoScoreValue { get; set; }
    public decimal? CarbonFootprint { get; set; }
    public int RecycledPercentage { get; set; }
    public string ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<Transaction> Transactions { get; set; }
}
```

### Transaction (Achat/Vente)
```csharp
public class Transaction
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; }
    public int BuyerId { get; set; }
    public User Buyer { get; set; }
    public int SellerId { get; set; }
    public User Seller { get; set; }
    public decimal Amount { get; set; }
    public Currency Currency { get; set; }
    public TransactionType Type { get; set; }    // Purchase, Sale
    public DateTime TransactionDate { get; set; }
    public int? EcoPointsEarned { get; set; }
}
```

### Badge (Badge/Récompense)
```csharp
public class Badge
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string IconUrl { get; set; }
    public string Description { get; set; }
}

public class UserBadge
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    public int BadgeId { get; set; }
    public Badge Badge { get; set; }
    public DateTime EarnedAt { get; set; }
}
```

### Enums
```csharp
public enum UserRole
{
    Buyer,
    Seller,
    Admin
}

public enum ProductStatus
{
    Available,      // Produit approuvé et disponible
    Pending,        // En attente de validation
    Removed         // Supprimé/archivé
}

public enum Currency
{
    DT,  // Dinar Tunisien
    EUR, // Euro
    USD  // Dollar
}

public enum TransactionType
{
    Purchase,
    Sale
}
```

## Configuration

### appsettings.Development.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=ecomarketplace;Username=postgres;Password=your_password"
  },
  "Serilog": {
    "MinimumLevel": "Debug"
  },
  "AllowedHosts": "*"
}
```

### appsettings.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "connection_string_here"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

## Workflow de Déploiement

### 1. Préparation
```bash
# Compile le backend
dotnet build -c Release

# Compile le frontend
cd frontend
npm run build:prod
```

### 2. Migration Base de Données
```bash
dotnet ef database update --configuration Release
```

### 3. Déploiement API
- Publie sur votre serveur (Azure App Service, Docker, etc.)
- Mets à jour la chaîne de connexion PostgreSQL
- Configure les variables d'environnement

### 4. Déploiement Frontend
- Les fichiers du répertoire `frontend/dist/` peuvent être servis:
  - Via un CDN (Azure Blob Storage, CloudFront)
  - Par l'API ASP.NET Core (wwwroot)
  - Via une application web statique (Azure Static Web Apps)

## Commandes Utiles

### Backend
```bash
# Build du projet
dotnet build

# Build en mode release
dotnet build -c Release

# Run du projet
dotnet run --urls http://localhost:5201

# Migrations
dotnet ef migrations add {MigrationName}
dotnet ef database update
dotnet ef database update {MigrationName}
dotnet ef migrations remove

# Tests
dotnet test
```

### Frontend
```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm start

# Build production
npm run build

# Tests unitaires
npm test

# Linting
npm run lint
```

## Dépannage

### "Invalid email or password"
- Vérifie que le backend est running sur `http://localhost:5201`
- Vérifie que la base de données est connectée
- Essaye de redémarrer l'API pour regénérer le compte admin

### "Cannot GET /admin-dashboard"
- Assure-toi d'être connecté en tant qu'admin
- Vérifie que le token JWT est présent dans localStorage
- Rafraîchis la page

### CORS errors
- Vérifie que `http://localhost:4200` est dans la configuration CORS
- Assure-toi que l'API est running sur le bon port (5201)

### Database connection errors
- Vérifie que PostgreSQL est running
- Teste la chaîne de connexion: `psql -h localhost -U postgres -d ecomarketplace`
- Vérifie les migrations EF Core: `dotnet ef database update`

## Contributeurs

- **Fj Chaima** - Développement initial

## Licence

Propriétaire - EcoMarketplace Platform

---

**Last Updated**: March 2026
**Version**: 1.0.0
**Status**: Active Development

Pour des questions ou rapports de bugs, contacte l'équipe de développement.
