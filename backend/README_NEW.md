# Swipe-able Backend

Backend API för Swipe-able restaurang- och film-appen byggd med Node.js, Express, GraphQL och MongoDB.

## Funktioner

### 🔐 Autentisering

- Användarregistrering och inloggning
- JWT-baserad autentisering
- Säker lösenordshantering med bcrypt

### 👥 Vänsystem

- Unik vänkod för varje användare (8 tecken)
- Skicka och ta emot vänförfrågningar
- Vänlista och vänförfrågningar

### ⭐ Favoriter

- Spara restauranger och filmer som favoriter
- Kategorisera som "önskelista" eller "varit där/sett"
- Lägg till betyg, anteckningar och taggar
- Datum för besök/visning

### 🍽️ Restauranger

- Fullständig CRUD för restauranger
- Sök efter kök och priskluss
- Platsdata och betyg

### 🎬 Filmer

- Fullständig CRUD för filmer
- Sök efter genre, år och frisök
- IMDB/TMDB-integration möjlig
- Regissör, skådespelare och metadata

## Teknisk stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **GraphQL** - Query language och runtime för API
- **Apollo Server** - GraphQL server
- **MongoDB** - NoSQL databas
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens för autentisering
- **bcryptjs** - Lösenordshashing

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

3. Konfigurera environment variables i `.env`:

```bash
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/swipe-able
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-very-secure-jwt-secret-key
```

4. Seeda databasen med testdata:

```bash
npm run seed
```

5. Starta utvecklingsservern:

```bash
npm run dev
```

Servern kommer att köras på `http://localhost:4000`

## API Endpoints

- **REST API:** `http://localhost:4000/`
- **GraphQL Playground:** `http://localhost:4000/graphql`

## GraphQL API

### Autentisering

#### Registrera användare

```graphql
mutation {
  register(
    input: {
      username: "anna_svensson"
      email: "anna@example.com"
      password: "password123"
      firstName: "Anna"
      lastName: "Svensson"
    }
  ) {
    token
    user {
      id
      username
      friendCode
    }
  }
}
```

#### Logga in

```graphql
mutation {
  login(input: { email: "anna@example.com", password: "password123" }) {
    token
    user {
      id
      username
      friendCode
    }
  }
}
```

#### Hämta min profil

```graphql
query {
  me {
    id
    username
    firstName
    lastName
    friendCode
    friends {
      username
      firstName
      lastName
    }
  }
}
```

### Vänsystem

#### Skicka vänförfrågan

```graphql
mutation {
  sendFriendRequest(friendCode: "ABC12345")
}
```

#### Svara på vänförfrågan

```graphql
mutation {
  respondToFriendRequest(requestId: "ID", accept: true)
}
```

#### Hämta mina vänner

```graphql
query {
  myFriends {
    username
    firstName
    lastName
    friendCode
  }
}
```

### Favoriter

#### Lägg till restaurang som favorit

```graphql
mutation {
  addToFavorites(
    input: {
      itemId: "RESTAURANT_ID"
      itemType: "restaurant"
      notes: "Fantastisk pasta!"
      rating: 5
      isWishlist: false
      dateVisited: "2024-10-13"
      tags: ["italienskt", "romantiskt"]
    }
  ) {
    id
    notes
    rating
    item {
      ... on Restaurant {
        name
        cuisine
      }
    }
  }
}
```

#### Hämta mina favoriter

```graphql
query {
  myFavorites(itemType: "restaurant", isWishlist: false) {
    id
    itemType
    notes
    rating
    dateVisited
    item {
      ... on Restaurant {
        name
        cuisine
        priceRange
      }
      ... on Movie {
        title
        director
        releaseYear
      }
    }
  }
}
```

### Restauranger

#### Hämta alla restauranger

```graphql
query {
  restaurants {
    id
    name
    cuisine
    rating
    priceRange
    address {
      city
    }
  }
}
```

#### Sök restauranger efter kök

```graphql
query {
  restaurantsByCuisine(cuisine: "italiensk") {
    name
    description
    rating
  }
}
```

### Filmer

#### Hämta alla filmer

```graphql
query {
  movies {
    id
    title
    genre
    director
    releaseYear
    rating
  }
}
```

#### Sök filmer

```graphql
query {
  searchMovies(query: "inception") {
    title
    director
    genre
    releaseYear
  }
}
```

## Autentisering i Headers

För att använda autentiserade endpoints, inkludera JWT-token i Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

## Testdata

Efter att ha kört `npm run seed` får du:

### Testanvändare:

- **anna_svensson** (anna@example.com) - Lösenord: password123
- **erik_johansson** (erik@example.com) - Lösenord: password123
- **maria_andersson** (maria@example.com) - Lösenord: password123

Varje användare får en unik vänkod som visas i konsolen.

### Restauranger:

- Pizza Palace (Italiensk, $$)
- Sushi Zen (Japansk, $$$)
- Burgerlicious (Amerikansk, $$)
- Taco Fiesta (Mexikansk, $)
- Fine Dining Stockholm (Nordisk, $$$$)

### Filmer:

- The Shawshank Redemption (1994)
- The Godfather (1972)
- Pulp Fiction (1994)
- Forrest Gump (1994)
- Inception (2010)

## Projektstruktur

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB konfiguration
│   ├── middleware/
│   │   └── auth.js              # JWT autentisering
│   ├── models/
│   │   ├── Restaurant.js        # Restaurang schema
│   │   ├── User.js              # Användare schema
│   │   ├── Movie.js             # Film schema
│   │   └── Favorite.js          # Favoriter schema
│   ├── resolvers/
│   │   ├── index.js             # Kombinerade resolvers
│   │   ├── restaurant.js        # Restaurang resolvers
│   │   ├── user.js              # Användare & auth resolvers
│   │   ├── movie.js             # Film resolvers
│   │   └── favorite.js          # Favorit resolvers
│   ├── schemas/
│   │   ├── index.js             # Kombinerade type definitions
│   │   ├── restaurant.js        # Restaurang GraphQL schema
│   │   ├── user.js              # Användare GraphQL schema
│   │   ├── movie.js             # Film GraphQL schema
│   │   └── favorite.js          # Favorit GraphQL schema
│   ├── scripts/
│   │   └── seed.js              # Database seeding
│   └── server.js                # Huvudserver fil
├── .env                         # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Scripts

- `npm run dev` - Starta utvecklingsserver med nodemon
- `npm start` - Starta produktionsserver
- `npm run seed` - Seeda databasen med testdata

## Säkerhet

- Lösenord hashas med bcrypt (12 rounds)
- JWT tokens för autentisering
- Användarinput valideras av Mongoose schemas
- CORS konfigurerat för frontend
- Miljövariabler för känslig data

## Fel och felsökning

- Se till att MongoDB körs innan du startar servern
- Kontrollera att miljövariabler är korrekt konfigurerade
- JWT_SECRET ska vara en lång, säker sträng i produktion
- Använd MongoDB Compass för att inspektera databasen
