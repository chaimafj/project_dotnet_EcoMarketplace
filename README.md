# EcoMarketplace - Plateforme d'Échange Écologique

Une plateforme d'e-commerce durable dédiée à l'achat et la vente de produits recyclés et écologiques. Le projet combine un backend .NET 8.0 avec une base de données PostgreSQL et un frontend Angular avec TypeScript.



## Apercu fonctionnel
EcoMarketplace est une plateforme d'e-commerce complète permettant aux utilisateurs de:

- S'enregistrer en tant que Buyer (Acheteur) ou Seller (Vendeur)
- Lister et acheter des produits écologiques
- Analyser leur empreinte carbone grâce à un EcoScore
- Accumuler des points et des badges de contribution écologique
- Gérer les transactions (achats et ventes)
  
Les administrateurs bénéficient d'un tableau de bord complet pour:
- Gérer tous les utilisateurs (statut, suppression)
- Gérer tous les produits (validation, suppression permanente)
- Consulter des statistiques détaillées (utilisateurs, produits, revenus multi-devises, CO2 savings)

## Stack technique

### Backend
- ASP.NET Core 8
- Entity Framework Core 8
- Npgsql (PostgreSQL)
- AutoMapper
- BCrypt.Net
- Swagger (Swashbuckle)

### Frontend
- Angular 21
- TypeScript
- SCSS
- RxJS
- Angular SSR

## Structure du projet

```text
EcoMarketplace.API/
|-- backend/
|   |-- Program.cs
|   |-- Features/
|   |   |-- Auth/
|   |   |-- Users/
|   |   |-- Products/
|   |   |-- Transactions/
|   |   `-- Admin/
|   |-- Application/
|   |-- Infrastructure/
|   |-- Data/
|   |-- Models/
|   `-- Migrations/
`-- frontend/
    |-- src/
    |-- angular.json
    `-- package.json
```

## Prerequis

- .NET SDK 8.0+
- Node.js 18+ et npm
- PostgreSQL

## Configuration

### Base de donnees

Le backend utilise la connection string definie dans `backend/appsettings.json` :

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=ecomarketplace;Username=postgres;Password=..."
}
```

Adaptez les informations PostgreSQL a votre environnement.

### CORS

Le backend autorise le frontend local sur :
- http://localhost:4200

## Demarrage local

## 1) Backend

Depuis le dossier `backend` :

```bash
dotnet restore
dotnet run
```

Par defaut (profil `http`), l'API est accessible sur :
- http://localhost:5201


## 2) Frontend

Depuis le dossier `frontend` :

```bash
npm install
npm start
```

Application frontend :
- http://localhost:4200

## Endpoints API principaux

Le routing des controleurs suit `api/[controller]`.

Routes principales :
- `api/auth`
- `api/users`
- `api/products`
- `api/transactions`
- `api/admin`

## Donnees de developpement

Au demarrage en environnement Development, un compte admin est cree/mis a jour automatiquement :
- email : admin@ecomarketplace.local
- username : admin
- mot de passe : Admin123!

## Notes

- Le backend appelle `EnsureCreated()` au demarrage et applique certains ajustements SQL defensifs.
- Les migrations EF sont presentes dans `backend/Migrations/`.
- Les cles sensibles (JWT, Stripe, email) sont actuellement stockees en configuration locale : il est recommande de les externaliser (variables d'environnement ou secret manager) pour un usage reel.
