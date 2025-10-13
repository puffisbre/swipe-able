# Swipe-able Backend

Backend API för Swipe-able restaurang-appen byggd med Node.js, Express, GraphQL och MongoDB.

## Teknisk stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **GraphQL** - Query language och runtime för API
- **Apollo Server** - GraphQL server
- **MongoDB** - NoSQL databas
- **Mongoose** - MongoDB object modeling

## Installation

1. Installera dependencies:

```bash
npm install
```

2. Starta MongoDB (lokalt eller använd MongoDB Atlas):

```bash
# För lokal MongoDB installation
mongod
```

3. Kopiera och konfigurera environment variables:

```bash
cp .env.example .env
```

4. Starta utvecklingsservern:

```bash
npm run dev
```

Servern kommer att köras på `http://localhost:4000`

## API Endpoints

- **REST API:** `http://localhost:4000/`
- **GraphQL Playground:** `http://localhost:4000/graphql`

## GraphQL Schema

### Queries

- `restaurants` - Hämta alla aktiva restauranger
- `restaurant(id: ID!)` - Hämta en specifik restaurang
- `restaurantsByCuisine(cuisine: String!)` - Hämta restauranger efter kök
- `restaurantsByPriceRange(priceRange: String!)` - Hämta restauranger efter priskluss

### Mutations

- `createRestaurant(input: RestaurantInput!)` - Skapa ny restaurang
- `updateRestaurant(id: ID!, input: RestaurantInput!)` - Uppdatera restaurang
- `deleteRestaurant(id: ID!)` - Ta bort restaurang (soft delete)

## Exempel GraphQL Queries

### Hämta alla restauranger

```graphql
query {
  restaurants {
    id
    name
    cuisine
    rating
    priceRange
  }
}
```

### Skapa ny restaurang

```graphql
mutation {
  createRestaurant(
    input: {
      name: "Pizza Palace"
      description: "Bästa pizzan i stan"
      cuisine: "Italian"
      priceRange: "$$"
      rating: 4.5
    }
  ) {
    id
    name
    cuisine
  }
}
```

## Projektstruktur

```
backend/
├── src/
│   ├── config/
│   │   └── database.js      # MongoDB konfiguration
│   ├── models/
│   │   └── Restaurant.js    # Mongoose schemas
│   ├── resolvers/
│   │   ├── index.js         # Kombinerade resolvers
│   │   └── restaurant.js    # Restaurang resolvers
│   ├── schemas/
│   │   ├── index.js         # Kombinerade type definitions
│   │   └── restaurant.js    # Restaurang GraphQL schema
│   └── server.js            # Huvudserver fil
├── .env                     # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Scripts

- `npm run dev` - Starta utvecklingsserver med nodemon
- `npm start` - Starta produktionsserver

## Environment Variables

```
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/swipe-able
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-secret-key-here
```
