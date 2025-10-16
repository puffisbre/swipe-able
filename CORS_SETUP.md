# CORS Setup Guide

## Problem
Du får "request blocked" fel på grund av CORS (Cross-Origin Resource Sharing) problem.

## Lösning
Jag har uppdaterat backend servern för att tillåta requests från alla vanliga Expo development portar.

## Backend Changes Made
- ✅ Lade till global CORS middleware
- ✅ Tillåter requests från:
  - `http://localhost:3000` (React web)
  - `http://localhost:8081` (Expo web)
  - `http://localhost:19006` (Expo dev tools)
  - `http://localhost:19000` (Expo dev server)
  - `exp://localhost:19000` (Expo development build)
  - Local network addresses

## Frontend Changes Made
- ✅ Dynamisk URL resolution som automatiskt använder rätt IP-adress
- ✅ Fungerar både i simulator och på fysisk enhet
- ✅ Debug logging för att se vilken URL som används

## Testing Steps

### 1. Starta Backend
```bash
cd backend
npm run dev
```
Du ska se:
```
🚀 Server ready at http://localhost:4000/
🚀 GraphQL endpoint ready at http://localhost:4000/graphql
```

### 2. Starta Frontend
```bash
cd frontend
npm start
```

### 3. Kontrollera URL i Console
När appen startar, kolla i Metro bundler console eller React Native debugger. Du ska se:
```
🔗 GraphQL Endpoint: http://localhost:4000/graphql
```
ELLER (om du använder fysisk enhet):
```
🔗 GraphQL Endpoint: http://192.168.x.x:4000/graphql
```

### 4. Om du fortfarande har problem

#### För Simulator (iOS/Android):
- URL ska vara: `http://localhost:4000/graphql`
- Detta borde fungera automatiskt

#### För Fysisk Enhet:
1. Hitta din dators IP-adress:
   ```bash
   # På Mac/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # På Windows:
   ipconfig | findstr "IPv4"
   ```

2. Om appen inte automatiskt hittar rätt IP, uppdatera `frontend/utils/graphql-client.ts`:
   ```typescript
   // Ändra denna rad:
   return "http://localhost:4000/graphql";
   
   // Till din faktiska IP:
   return "http://192.168.1.XXX:4000/graphql";
   ```

3. Starta om både backend och frontend

## Troubleshooting

### "Network request failed"
- Kontrollera att backend körs på port 4000
- Kontrollera att din dator och telefon är på samma WiFi-nätverk (för fysisk enhet)

### "CORS error" kvarstår
- Starta om backend servern efter CORS ändringarna
- Kontrollera att alla CORS origins är tillåtna i `backend/src/server.js`

### "Connection refused"
- Kontrollera att backend faktiskt körs
- Testa att öppna `http://localhost:4000/` i webbläsaren
- Du ska se: `{"message":"Swipe-able Backend API is running!","graphql":"/graphql","status":"OK"}`

## Production
För production, uppdatera URL:en i `frontend/utils/graphql-client.ts`:
```typescript
return "https://your-production-backend.com/graphql";
```
